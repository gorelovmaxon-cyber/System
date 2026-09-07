# T2 — Цвета резинок и упражнения 20, 21 (пример для Qwen)

**Blocked by:** T1 (выполнен)  
**Status:** ready-for-qwen

## Контекст

В ТЗ v7 ревизия 3 резинки переименованы с абстрактных уровней (`лёгкая`, `средняя`, `тяжёлая`) на цвета (`чёрная`, `жёлтая`, `красная`, `зелёная`). Список редактируется в настройках.

Также добавляются два новых упражнения в среду (день 3):
- **Упр. 20** — внешняя ротация плеча, выбор одного цвета
- **Упр. 21** — тяга сидя, **комбинация из 3 резинок одновременно** (новый тип поля)

См. `ТЗ.md` ЧАСТЬ 1, раздел "Оборудование" и "Полный список упражнений" для среды.

## Файлы для изменения

- `src/data.js` — строки 45-65 (константа BAND_LEVELS → BAND_COLORS, функция getBandLevel → getBandColor)
- `src/workout.js` — строки 120-150 (функция renderBandSelector, добавить упр. 20 и 21 в среду)
- `src/ui-today.js` — строки 80-100 (рендеринг выбора резинок, поддержка multiSelect для упр. 21)
- `src/settings.js` — строки 30-50 (редактирование списка цветов резинок)
- `test/workout.test.js` — добавить тесты для getBandColor(), multiSelect, упр. 20-21

## Алгоритм (шаг за шагом)

### 1. В `src/data.js`:

**Найди** (строка ~45):
```javascript
var BAND_LEVELS = ['лёгкая', 'средняя', 'тяжёлая'];

function getBandLevel(index) {
  if (index === undefined) return BAND_LEVELS;
  return BAND_LEVELS[index];
}
```

**Замени на:**
```javascript
var BAND_COLORS = ['чёрная', 'жёлтая', 'красная', 'зелёная'];

function getBandColor(index) {
  if (index === undefined) return BAND_COLORS;
  return BAND_COLORS[index];
}
```

### 2. В `src/workout.js`:

**A) Найди все вызовы `getBandLevel()`** (используй Ctrl+F по всему проекту)

Замени на `getBandColor()` во всех местах:
- renderBandSelector()
- saveBandSelection()
- loadBandHistory()

**B) Найди функцию `renderBandSelector()`** (строка ~120):

Внутри HTML-шаблона найди:
```javascript
html += '<label>Уровень резинки:</label>';
```

Замени на:
```javascript
html += '<label>Цвет резинки:</label>';
```

**C) Добавь упражнения 20 и 21 в данные среды** (массив EXERCISES_WEDNESDAY, строка ~200):

После упражнения 19 добавь:
```javascript
{
  id: 20,
  name: 'Внешняя ротация плеча (вращательная манжета)',
  sets: 4,
  duration: '20–25 сек на руку',
  bandRequired: true,
  multiSelect: false,
  technique: 'Локоть прижат к боку, предплечье перпендикулярно телу. Медленно отводишь предплечье наружу (кнаружи от тела) против сопротивления резинки, затем так же медленно возвращаешь. Рабочий диапазон — от 45° до 90° отведения предплечья. Движение только в плечевом суставе, локоть неподвижен.',
  warning: 'Полностью пропускать при боли в плече или после недавней травмы вращательной манжеты.'
},
{
  id: 21,
  name: 'Тяга сидя (спина, задние дельты)',
  sets: 4,
  duration: '20–25 сек',
  bandRequired: true,
  multiSelect: true,  // НОВОЕ: комбинация из нескольких резинок
  technique: 'Резинка закреплена на уровне груди. Сидя, ноги упёрты, спина прямая. Тянешь резинку к себе, сводя лопатки, локти идут назад вдоль тела. Удержание в конечной точке (лопатки сведены максимально) — 20-25 сек. Изометрика, без возвратно-поступательных движений.',
  warning: null
}
```

### 3. В `src/ui-today.js`:

**Найди функцию рендеринга поля выбора резинки** (строка ~85, где рендерится `<select>` для резинок):

**Добавь проверку на `multiSelect`:**

Было:
```javascript
if (exercise.bandRequired) {
  html += '<select id="band-select">';
  var colors = getBandColor();
  for (var i = 0; i < colors.length; i++) {
    html += '<option value="' + i + '">' + colors[i] + '</option>';
  }
  html += '</select>';
}
```

Стало:
```javascript
if (exercise.bandRequired) {
  if (exercise.multiSelect) {
    // Множественный выбор для упр. 21
    html += '<div id="band-multi-select">';
    html += '<label>Комбинация резинок:</label>';
    var colors = getBandColor();
    for (var i = 0; i < colors.length; i++) {
      html += '<label><input type="checkbox" name="band-' + i + '" value="' + i + '"> ' + colors[i] + '</label>';
    }
    html += '</div>';
  } else {
    // Обычный выбор одного цвета
    html += '<select id="band-select">';
    var colors = getBandColor();
    for (var i = 0; i < colors.length; i++) {
      html += '<option value="' + i + '">' + colors[i] + '</option>';
    }
    html += '</select>';
  }
}
```

**Также измени сохранение выбора** (функция saveBandSelection, строка ~120):

Добавь обработку multiSelect:
```javascript
function saveBandSelection(exerciseId) {
  var exercise = getExerciseById(exerciseId);
  
  if (exercise.multiSelect) {
    // Собираем выбранные чекбоксы
    var selected = [];
    var checkboxes = document.querySelectorAll('[name^="band-"]');
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        selected.push(parseInt(checkboxes[i].value));
      }
    }
    saveToHistory(exerciseId, { bands: selected });
  } else {
    // Обычный select
    var selectValue = document.getElementById('band-select').value;
    saveToHistory(exerciseId, { band: parseInt(selectValue) });
  }
}
```

### 4. В `src/settings.js`:

**Найди секцию редактирования уровней резинок** (строка ~35):

Замени все упоминания "уровень" на "цвет":
- Заголовок: "Редактировать уровни резинок" → "Редактировать цвета резинок"
- Функции: `editBandLevels()` → `editBandColors()` (или оставь старое имя, но измени текст)

### 5. Тесты в `test/workout.test.js`:

Добавь в конец файла:
```javascript
// Тесты для T2: цвета резинок и упражнения 20, 21

test('getBandColor() возвращает массив из 4 цветов', () => {
  const colors = getBandColor();
  assert.strictEqual(colors.length, 4);
  assert.deepStrictEqual(colors, ['чёрная', 'жёлтая', 'красная', 'зелёная']);
});

test('getBandColor(0) возвращает "чёрная"', () => {
  assert.strictEqual(getBandColor(0), 'чёрная');
});

test('Упражнение 20 существует в среде', () => {
  const ex20 = getExerciseById(20);
  assert.ok(ex20);
  assert.strictEqual(ex20.name, 'Внешняя ротация плеча (вращательная манжета)');
  assert.strictEqual(ex20.sets, 4);
  assert.strictEqual(ex20.bandRequired, true);
  assert.strictEqual(ex20.multiSelect, false);
});

test('Упражнение 21 существует и имеет multiSelect', () => {
  const ex21 = getExerciseById(21);
  assert.ok(ex21);
  assert.strictEqual(ex21.name, 'Тяга сидя (спина, задние дельты)');
  assert.strictEqual(ex21.sets, 4);
  assert.strictEqual(ex21.bandRequired, true);
  assert.strictEqual(ex21.multiSelect, true);
});

test('Среда содержит 21 упражнение (было 19)', () => {
  const wednesday = getExercisesByDay(3); // среда
  assert.strictEqual(wednesday.length, 9); // упр. 13-21
});
```

## Тесты должны проверить

- `getBandColor()` возвращает `['чёрная', 'жёлтая', 'красная', 'зелёная']`
- `getBandColor(0)` возвращает `'чёрная'`
- Упражнение 20 существует, имеет `bandRequired: true`, `multiSelect: false`
- Упражнение 21 существует, имеет `bandRequired: true`, **`multiSelect: true`**
- В среде теперь 9 упражнений (13-21, было 13-19)
- Все 199 тестов зелёные (включая старые после T1)

**Команда:** `node --test` (БЕЗ аргумента `test/` — баг Node 24 на Windows)

## Как закончить

1. Проверь, что все файлы из списка изменены:
   - [ ] src/data.js — BAND_COLORS, getBandColor()
   - [ ] src/workout.js — упр. 20, 21 добавлены
   - [ ] src/ui-today.js — multiSelect поддержка
   - [ ] src/settings.js — "цвета" вместо "уровни"
   - [ ] test/workout.test.js — новые тесты

2. Пересобери проект:
   ```bash
   node build.js
   ```

3. Запусти тесты:
   ```bash
   node --test
   ```
   Ожидается: `✔ ... (204 tests)` (было 199, добавили 5)

4. Сделай коммит:
   ```bash
   git add -A
   git commit -m "T2: цвета резинок и упражнения 20, 21"
   ```

5. Сообщи пользователю:
   ```
   ✅ T2 готов
   Коммит: [скопируй hash из git log --oneline -1]
   Тесты: 204/204 зелёные
   Изменены: src/data.js, src/workout.js, src/ui-today.js, src/settings.js, test/workout.test.js
   
   Пользователь теперь видит:
   - Резинки называются цветами (чёрная/жёлтая/красная/зелёная)
   - В настройках можно редактировать список цветов
   - В среде 2 новых упражнения (20 и 21)
   - Упр. 21 позволяет выбрать комбинацию из нескольких резинок через чекбоксы
   ```

---

## Важные замечания для Qwen

1. **multiSelect — новая функциональность**, не было раньше. Внимательно реализуй чекбоксы и сохранение массива `bands: []` вместо одного `band: 0`.

2. **Не ломай существующие упражнения** — они должны остаться с одним выбором цвета (select), только упр. 21 — особое.

3. **Тексты техники и предупреждений** для упр. 20 и 21 берутся дословно из `ТЗ.md` (я привёл их выше в алгоритме).

4. **Баг Node 24:** используй `node --test`, НЕ `node --test test/`

5. **Счётчик тестов:** было 199, после T2 станет ~204 (добавили 5 новых тестов).
