// Пошаговый ввод. Когда бот ждёт от пользователя текст (имя, цену, время…),
// в сессии лежит имя шага, а обработчик шага зарегистрирован здесь.
const steps = new Map();

function defineStep(name, handler, { master = false } = {}) {
  if (steps.has(name)) throw new Error(`Шаг "${name}" уже определён`);
  steps.set(name, { handler, master });
}

function setStep(ctx, name, patch = {}) {
  ctx.session.step = name;
  ctx.session.data = { ...(ctx.session.data || {}), ...patch };
}

function clearStep(ctx) {
  ctx.session.step = null;
  ctx.session.data = {};
}

function currentStep(ctx) {
  return ctx.session.step;
}

// Middleware: передаёт сообщение обработчику текущего шага
async function stepRouter(ctx, next) {
  const entry = steps.get(ctx.session.step);
  if (!entry) return next();
  if (entry.master && !ctx.master) {
    clearStep(ctx);
    return next();
  }
  return entry.handler(ctx);
}

module.exports = { defineStep, setStep, clearStep, currentStep, stepRouter };
