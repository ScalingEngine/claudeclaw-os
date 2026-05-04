/**
 * Slack bot listener (Socket Mode).
 *
 * Subscribes to message.im (DMs) and app_mention events. Each inbound
 * message is dispatched into the same Agent SDK pipeline that the
 * Telegram bot uses (runAgentWithRetry).
 *
 * Failure modes are non-fatal: if Socket Mode disconnects, tokens are
 * missing, or Bolt throws, the Telegram listener keeps running and the
 * dashboard surfaces a "Slack: disconnected" indicator (TODO).
 */
import bolt from '@slack/bolt';
import { logger } from './logger.js';
import { runAgentWithRetry } from './agent.js';
import { getSession, setSession } from './db.js';
import { MAIN_AGENT_ID, SLACK_BOT_TOKEN, SLACK_APP_TOKEN } from './config.js';

const AGENT_ID: string = MAIN_AGENT_ID;

export async function startSlackBot(): Promise<void> {
  if (!SLACK_BOT_TOKEN || !SLACK_APP_TOKEN) {
    logger.info('Slack tokens not set (SLACK_BOT_TOKEN + SLACK_APP_TOKEN). Skipping Slack listener.');
    return;
  }

  const app = new bolt.App({
    token: SLACK_BOT_TOKEN,
    appToken: SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: bolt.LogLevel.WARN,
  });

  // DMs to the bot.
  app.message(async ({ message, say }) => {
    if (message.subtype) return;
    if (message.channel_type !== 'im') return;
    if (!('text' in message) || !message.text) return;

    const userId = (message as { user?: string }).user;
    const text = message.text;
    if (!userId || !text) return;

    const slackChatId = `slack:dm:${userId}`;
    await dispatchToAgent(slackChatId, text, async (response) => {
      await say(response);
    });
  });

  // @-mentions in any channel the bot has been invited to.
  // Continues replying in the same thread without requiring re-mentions.
  app.event('app_mention', async ({ event, say }) => {
    const ev = event as {
      user?: string;
      channel?: string;
      ts?: string;
      thread_ts?: string;
      text?: string;
    };

    const userId = ev.user;
    const channel = ev.channel;
    const threadTs = ev.thread_ts || ev.ts;
    const rawText = ev.text || '';
    const text = rawText.replace(/<@[A-Z0-9]+>/g, '').trim();

    if (!userId || !channel || !threadTs || !text) return;

    const slackChatId = `slack:thread:${channel}:${threadTs}`;
    await dispatchToAgent(slackChatId, text, async (response) => {
      await say({ text: response, thread_ts: threadTs });
    });
  });

  app.error(async (error) => {
    logger.warn({ err: error }, 'Slack bot error (non-fatal)');
  });

  try {
    await app.start();
    logger.info('Slack bot started (Socket Mode)');
  } catch (err) {
    logger.warn({ err }, 'Slack bot failed to start (non-fatal). Telegram continues.');
  }
}

async function dispatchToAgent(
  slackChatId: string,
  text: string,
  reply: (response: string) => Promise<void>,
): Promise<void> {
  try {
    const sessionId = getSession(slackChatId, AGENT_ID);
    const result = await runAgentWithRetry(text, sessionId, () => {});

    if (result.newSessionId) {
      setSession(slackChatId, result.newSessionId, AGENT_ID);
    }

    const responseText = result.text || '(no response)';
    await reply(responseText);
  } catch (err) {
    logger.error({ err, slackChatId }, 'Slack message dispatch failed');
    try {
      await reply('Sorry, something went wrong handling that message.');
    } catch {
      /* don't double-fail */
    }
  }
}
