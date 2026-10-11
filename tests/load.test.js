const test = require('node:test');
const assert = require('node:assert');

// Все модули бота загружаются без синтаксических ошибок и циклов
test('бот и фоновые задачи загружаются', () => {
  const { createBot } = require('../bot');
  const jobs = require('../bot/jobs');
  assert.strictEqual(typeof createBot, 'function');
  assert.strictEqual(typeof jobs.startJobs, 'function');
  const bot = createBot('1:test');
  assert.ok(bot);
});
