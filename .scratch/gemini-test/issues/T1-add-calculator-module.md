# T1 — Создать модуль калькулятора с тестами

**What to build:** Простой модуль калькулятора с базовыми операциями (сложение, вычитание, умножение, деление) и набором unit-тестов для проверки корректности работы.

**Blocked by:** none

**Status:** ready-for-agent

**Перед началом работы:**
Открой VS Code в папке `E:\System2` (File > Open Folder).

## Контекст

Это тестовый тикет для проверки способности Gemini 3 Flash Preview выполнять детальные инструкции. Задача простая, но требует точного следования алгоритму, написания чистого кода и запуска тестов.

## Файлы для изменения

- [.scratch/gemini-test/src/calculator.js](.scratch/gemini-test/src/calculator.js) — основной модуль с функциями калькулятора
- [.scratch/gemini-test/test/calculator.test.js](.scratch/gemini-test/test/calculator.test.js) — unit-тесты

## Алгоритм (шаг за шагом)

### 1. Создать структуру директорий

```bash
mkdir -p .scratch/gemini-test/src
mkdir -p .scratch/gemini-test/test
```

### 2. В `.scratch/gemini-test/src/calculator.js`:

Создай файл с такой структурой:

```javascript
/**
 * Calculator module with basic arithmetic operations
 */

/**
 * Add two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
  // ТВОЯ РЕАЛИЗАЦИЯ: просто вернуть a + b
}

/**
 * Subtract b from a
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Difference of a and b
 */
function subtract(a, b) {
  // ТВОЯ РЕАЛИЗАЦИЯ: вернуть a - b
}

/**
 * Multiply two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Product of a and b
 */
function multiply(a, b) {
  // ТВОЯ РЕАЛИЗАЦИЯ: вернуть a * b
}

/**
 * Divide a by b
 * @param {number} a - Numerator
 * @param {number} b - Denominator
 * @returns {number} Quotient of a and b
 * @throws {Error} If b is zero
 */
function divide(a, b) {
  // ТВОЯ РЕАЛИЗАЦИЯ:
  // 1. Проверь, что b !== 0
  // 2. Если b === 0, выбрось ошибку: throw new Error('Division by zero')
  // 3. Иначе вернуть a / b
}

module.exports = {
  add,
  subtract,
  multiply,
  divide
};
```

**Реализуй каждую функцию согласно комментариям.**

### 3. В `.scratch/gemini-test/test/calculator.test.js`:

Создай файл с тестами используя встроенный `node:test`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { add, subtract, multiply, divide } = require('../src/calculator.js');

describe('Calculator Module', () => {
  describe('add()', () => {
    it('should add two positive numbers', () => {
      assert.strictEqual(add(2, 3), 5);
    });

    it('should add negative numbers', () => {
      assert.strictEqual(add(-5, -3), -8);
    });

    it('should add positive and negative', () => {
      assert.strictEqual(add(10, -4), 6);
    });
  });

  describe('subtract()', () => {
    it('should subtract two numbers', () => {
      assert.strictEqual(subtract(10, 3), 7);
    });

    it('should handle negative result', () => {
      assert.strictEqual(subtract(3, 10), -7);
    });
  });

  describe('multiply()', () => {
    it('should multiply two positive numbers', () => {
      assert.strictEqual(multiply(4, 5), 20);
    });

    it('should handle multiplication by zero', () => {
      assert.strictEqual(multiply(5, 0), 0);
    });

    it('should multiply negative numbers', () => {
      assert.strictEqual(multiply(-3, -4), 12);
    });
  });

  describe('divide()', () => {
    it('should divide two numbers', () => {
      assert.strictEqual(divide(10, 2), 5);
    });

    it('should handle division with remainder', () => {
      assert.strictEqual(divide(7, 2), 3.5);
    });

    it('should throw error on division by zero', () => {
      assert.throws(
        () => divide(10, 0),
        { message: 'Division by zero' }
      );
    });
  });
});
```

**Скопируй этот код точно как указано.**

### 4. Создать package.json (опционально, для удобства)

В `.scratch/gemini-test/package.json`:

```json
{
  "name": "gemini-test-calculator",
  "version": "1.0.0",
  "description": "Test task for Gemini 3 Flash Preview",
  "scripts": {
    "test": "node --test test/"
  }
}
```

## Критерии приёмки

- [ ] Файл `calculator.js` создан с 4 функциями
- [ ] Все функции имеют JSDoc комментарии
- [ ] Функция `divide()` корректно выбрасывает ошибку при делении на ноль
- [ ] Файл `calculator.test.js` создан с 10 тестами
- [ ] Все тесты проходят: `node --test .scratch/gemini-test/test/`
- [ ] Код чистый, без лишних console.log или комментариев "TODO"

## Ограничения

- Использовать только встроенный `node:test` (НЕ Jest, НЕ Mocha)
- НЕ добавлять дополнительные npm зависимости
- НЕ менять структуру тестов — только реализовать функции в calculator.js

## Как закончить

1. Проверь тесты:
   ```bash
   node --test .scratch/gemini-test/test/
   ```
   
   Ожидаемый вывод:
   ```
   ✔ Calculator Module > add() > should add two positive numbers (Xms)
   ✔ Calculator Module > add() > should add negative numbers (Xms)
   ... (всего 10 тестов)
   ```

2. Коммит:
   ```bash
   git add .scratch/gemini-test/
   git commit -m "T1: создать модуль калькулятора с тестами"
   ```

3. Финальный ответ:
   ```
   ✅ T1 готов
   Коммит: [hash]
   Тесты: 10/10 зелёные
   Изменены:
   - .scratch/gemini-test/src/calculator.js (создан, 4 функции)
   - .scratch/gemini-test/test/calculator.test.js (создан, 10 тестов)
   - .scratch/gemini-test/package.json (создан)
   ```

---

**Команда запуска тестов:** `node --test .scratch/gemini-test/test/`
