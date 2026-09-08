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

После каждого важного момента в чате — `git commit + git push`.
Не ждать конца сессии. Сессия может оборваться в любой момент.

## На новом устройстве

```bash
git clone https://github.com/gorelovmaxon-cyber/System.git System2
```
