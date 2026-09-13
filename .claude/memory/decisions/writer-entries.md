---
status: confirmed
category: decisions
scope: systemqwen
source: activepieces-flow
evidence: commit evt_e33c5558759f: шаг write опубликованной версии указывал на http://host.docker.internal:8644 (fixture-мост L03-03), переведён на рабочий мост 8643 и опубликован (publishedVersionId taybpPCJxVqCZpWYvLuYG).
event_id: evt_e33c5558759f
---

## Живой flow фазы 4 в systemqwen обязан работать через рабочий мост на порту 8643; fixture-мост L03-03 (http://host.docker.internal:8644) допустим только для фикстур и не должен использоваться в опубликованной версии flow.
