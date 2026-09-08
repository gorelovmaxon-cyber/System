# System2 operations (SC-13 foundation)

Перечень ручной настройки нового устройства находится в
[second-pc.md](second-pc.md). Полный порядок запуска, диагностики, backup и
recovery будет дополнен SC-17.

Критические ручные действия: локальный config/paths, secrets в ignored
окружении, hooks installer, bridge/Activepieces/Khoj startup, index rebuild,
doctor и explicit sync. Никакие секреты, `.local/` или volumes не переносятся
через Git.
