#!/usr/bin/env node
'use strict';

// PreToolUse hook для Bash: блокирует разрушительные и необратимые команды.
// Контракт Claude Code: JSON на stdin, exit 2 = заблокировать и показать stderr агенту.
// Обычный `git push` разрешён правилами System2 (CLAUDE.md, «Память и синхронизация»).

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let command = '';
  try {
    const payload = JSON.parse(raw);
    command = payload?.tool_input?.command || '';
  } catch {
    // Не смогли разобрать payload — не блокируем, чтобы не ломать обычную работу.
    process.exit(0);
  }

  if (!command) process.exit(0);

  const RULES = [
    {
      pattern: /git\s+push\b[^\n]*(?:--force\b|--force-with-lease\b|\s-f\b)/i,
      reason: 'force-push перезаписывает чужую историю',
    },
    {
      pattern: /git\s+push\b[^\n]*\bupstream\b/i,
      reason: 'push в upstream запрещён: публикация только в origin согласованного репозитория',
    },
    {
      pattern: /git\s+reset\b[^\n]*--hard/i,
      reason: 'reset --hard удаляет незакоммиченные изменения без возможности восстановления',
    },
    {
      pattern: /git\s+clean\b[^\n]*(?:-[a-zA-Z]*f|-f)/i,
      reason: 'git clean удаляет неотслеживаемые файлы, включая чужие черновики',
    },
    {
      pattern: /git\s+branch\b[^\n]*(?:-D\b|--delete\s+--force)/,
      reason: 'branch -D удаляет ветку вместе с неслитыми коммитами',
    },
    {
      pattern: /git\s+checkout\b\s+(?:--\s+)?\.[\s;|&]?$/m,
      reason: 'checkout . затирает локальные правки во всём дереве',
    },
    {
      pattern: /git\s+restore\b[^\n]*\s\.[\s;|&]?$/m,
      reason: 'restore . затирает локальные правки во всём дереве',
    },
    {
      pattern: /\brm\s+(?:-[a-zA-Z]*[rR][a-zA-Z]*f|-f[a-zA-Z]*[rR]|-rf|-fr)\b[^\n]*(?:\/|\\|\.\.|~|\$HOME|E:\\|C:\\)/i,
      reason: 'рекурсивное удаление за пределами явно названного временного файла',
    },
    {
      pattern: /(?:^|[;&|]\s*)(?:Remove-Item|rm|del|rmdir)\b[^\n]*\b(?:\.git|\.claude|\.system2)\b/i,
      reason: 'удаление служебных каталогов Git/System2',
    },
    {
      pattern: /\b(?:cat|type|Get-Content|head|tail|less|more)\b[^\n]*(?:\.env\b|id_rsa|id_ed25519|\.npmrc|\.pypirc|credentials\.json|\.netrc)/i,
      reason: 'чтение файла с секретами; секреты не попадают в Git, отчёты и индекс',
    },
  ];

  for (const rule of RULES) {
    if (rule.pattern.test(command)) {
      process.stderr.write(
        `BLOCKED: ${rule.reason}.\n` +
        `Команда: ${command}\n` +
        'Правило: .claude/settings.json → PreToolUse → block-dangerous-commands.js\n'
      );
      process.exit(2);
    }
  }

  process.exit(0);
});
