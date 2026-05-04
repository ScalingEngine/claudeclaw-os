import { getMaxConversationLogId, getConversationTurnsSince } from './db.js';
import { emitChatEvent } from './state.js';
import { logger } from './logger.js';
import { MAIN_AGENT_ID } from './config.js';

let _lastSeenId = 0;
let _interval: NodeJS.Timeout | null = null;

const POLL_MS = 1500;
const BATCH_LIMIT = 50;

/**
 * Watches `conversation_log` for new rows from non-main agents and re-emits
 * them as ChatEvents on the main process's bus. Without this, specialist
 * Telegram traffic never reaches the dashboard SSE stream because each
 * specialist runs in its own Node process with its own (in-memory) emitter.
 *
 * Only call from the orchestrator (main) process.
 */
export function startConversationLogTailer(): void {
  if (_interval) return;

  try {
    _lastSeenId = getMaxConversationLogId();
  } catch (err) {
    logger.warn({ err }, 'tailer: failed to read MAX(id), starting from 0');
    _lastSeenId = 0;
  }

  logger.info({ startId: _lastSeenId, pollMs: POLL_MS }, 'Conversation log tailer started');

  _interval = setInterval(() => {
    try {
      const rows = getConversationTurnsSince(_lastSeenId, MAIN_AGENT_ID, BATCH_LIMIT);
      if (rows.length === 0) return;

      for (const r of rows) {
        const eventType = r.role === 'user' ? 'user_message' : 'assistant_message';
        emitChatEvent({
          type: eventType,
          chatId: r.chat_id,
          agentId: r.agent_id,
          content: r.content,
          source: 'telegram',
        });
        if (r.id > _lastSeenId) _lastSeenId = r.id;
      }
    } catch (err) {
      logger.warn({ err }, 'tailer: poll failed');
    }
  }, POLL_MS);
}

export function stopConversationLogTailer(): void {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
}
