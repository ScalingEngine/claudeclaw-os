# ClaudeClaw VPS Deploy

Use this reference when promoting local code to the production VPS fleet.

## Deploy Principle

Deploy commits, not loose files. Production state lives on the VPS and must survive deploys.

## Preflight Local

```bash
git status --short --branch
npm test
npm run typecheck
npm run build
```

Commit and push:

```bash
git add <files>
git commit -m "<type>: <summary>"
git push origin <branch>
```

## VPS Deploy Commands

Confirm the SSH alias or host before running remote commands. The planning files refer to `srv1310498`.

```bash
ssh srv1310498
cd /home/devuser/claudeclaw
git fetch origin
git status --short --branch
git switch <branch>
npm ci
npm run build
```

If the change includes migrations:

```bash
cp /home/devuser/claudeclaw/store/claudeclaw.db \
  /home/devuser/claudeclaw/store/claudeclaw.db.pre-$(date +%Y%m%d-%H%M%S).bak
npm run migrate
```

Restart the fleet:

```bash
systemctl --user restart \
  claudeclaw-ezra.service \
  claudeclaw-vera.service \
  claudeclaw-poe.service \
  claudeclaw-cole.service \
  claudeclaw-hopper.service \
  claudeclaw-archie.service
```

Verify:

```bash
systemctl --user status 'claudeclaw-*'
journalctl --user -u claudeclaw-ezra.service -n 120 --no-pager
```

## Rollback

Prefer rolling back to the previous known-good commit:

```bash
cd /home/devuser/claudeclaw
git log --oneline -n 8
git switch main
git reset --hard <known-good-commit>
npm ci
npm run build
systemctl --user restart 'claudeclaw-*'
```

Only restore a DB backup when the failed deploy ran a destructive or incompatible migration. Preserve the broken DB first for diagnosis.
