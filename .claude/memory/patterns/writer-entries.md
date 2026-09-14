---
status: confirmed
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: summary: 'Шаг write переведён на failureMode continue_4xx, между ним и ответом встал CODE-шаг classify_write, а return_persisted читает его выход. Классификатор различает ветви по форме выхода piece, а не по тексту ошибки'
event_id: evt_6dacc432c641
---

## В flow-части шаг write использует failureMode continue_4xx, после него стоит CODE-шаг classify_write, а return_persisted читает его выход; классификатор различает ветви по форме выхода piece, а не по тексту ошибки.
---
status: confirmed
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: summary: 'продолжение после 4xx приходит как {response:{status,body},request:{body}}, успех — как {status,headers,body} без ключа response. Форма измерена probe-публикацией на контролируемом событии, а не взята из документации'
event_id: evt_6dacc432c641
---

## Продолжение после 4xx приходит как {response:{status,body},request:{body}}, а успех — как {status,headers,body} без ключа response; эту форму следует определять probe-публикацией на контролируемом событии, а не брать из документации.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: «Одна уже была сохранена, две нет, поэтому один прогон проверяет обе ветви: conflict и persisted ... Число записей в памяти не изменилось — отвергнутые предложения не записаны, дублей нет»
event_id: evt_7c95328725a7
---

## Повторная доставка записей очереди, ставших терминальным failed при недоступном Activepieces, обрабатывается идемпотентно: ветвь conflict не пишет в память, отвергнутые предложения не сохраняются, дубли не создаются, поэтому один прогон на трёх записях проверяет обе ветви — conflict и persisted.
---
status: observation
category: patterns
scope: systemqwen
source: activepieces-flow
evidence: Отказ Khoj дал failed без ложного indexed, после восстановления — indexed и находится поиском.
event_id: evt_7e10d6cfc928
---

## Отказ Khoj фиксируется как failed без ложного статуса indexed; после восстановления событие получает indexed и находится поиском.
