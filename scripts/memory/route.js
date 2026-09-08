#!/usr/bin/env node
'use strict';

const ROUTES = {
  dev: { words: ['код', 'функц', 'bug', 'ошиб', 'api', 'тест', 'валидац', 'реализ'], doc: 'docs/routes/dev-workflow.md' },
  sites: { words: ['сайт', 'лендинг', 'макет', 'дизайн', 'клиент', 'форма', 'визуал'], doc: 'docs/routes/sites-workflow.md' },
  marketing: { words: ['привлеч', 'аудитор', 'подписчик', 'рассыл', 'контент-план', 'реклам', 'маркет'], doc: 'docs/routes/marketing-workflow.md' },
};

function choose(query) {
  const text = String(query).toLowerCase();
  const scores = Object.fromEntries(Object.entries(ROUTES).map(([route, value]) => [route, value.words.filter(word => text.includes(word)).length]));
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!ranked[0][1] || ranked[0][1] === ranked[1][1]) return { route: null, reason: 'ambiguous; ask the user to clarify the domain', scores };
  return { route: ranked[0][0], doc: ROUTES[ranked[0][0]].doc, core: ['CLAUDE.md', 'HANDOFF.md if present', 'node scripts/memory/search.js'], scores };
}

if (require.main === module) {
  const query = process.argv.slice(2).join(' ');
  if (!query) { process.stderr.write('usage: node scripts/memory/route.js <task>\n'); process.exitCode = 1; }
  else process.stdout.write(JSON.stringify(choose(query), null, 2) + '\n');
}

module.exports = { choose, ROUTES };
