---
name: github-remote
description: GitHub remote repo для System2 — единственный источник памяти в облаке
metadata:
  type: project
status: confirmed
category: facts
scope: systemqwen
source: git remote -v, проверено 2026-09-08
evidence: origin fetch/push указывает на https://github.com/gorelovmaxon-cyber/System.git
---

# GitHub Remote — System2

**Дата:** 2026-08-19
**Контекст:** Настройка облачной памяти

## Факт

Репозиторий: https://github.com/gorelovmaxon-cyber/System.git
Remote: origin (master branch)
Настроен: 2026-08-19

## Правило агрессивного сохранения

После важного момента — scoped `git commit`; `push` выполняется только после
проверки и явной командой `node scripts/memory/sync.js --push`. Фоновый push,
force push и reset чужих изменений запрещены.

## На новом устройстве

```bash
git clone https://github.com/gorelovmaxon-cyber/System.git System2
```
