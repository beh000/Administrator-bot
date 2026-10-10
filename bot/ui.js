// Общие помощники интерфейса: экранирование, вывод экранов, форматирование.
const { InlineKeyboard } = require('grammy');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtMoney(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const BASE_OPTS = { parse_mode: 'HTML', link_preview_options: { is_disabled: true } };

// Показать экран: по нажатию inline-кнопки редактируем то же сообщение,
// чтобы не засорять чат; после текстового ввода — отправляем новое.
async function show(ctx, text, keyboard, { fresh = false } = {}) {
  const opts = { ...BASE_OPTS, reply_markup: keyboard };
  if (!fresh && ctx.callbackQuery?.message) {
    try {
      return await ctx.editMessageText(text, opts);
    } catch (err) {
      if (String(err.description || err.message).includes('message is not modified')) return undefined;
      // например, сообщение слишком старое — просто отправим новое
    }
  }
  return ctx.reply(text, opts);
}

// Подсказка-вопрос с кнопкой отмены
function prompt(ctx, text, cancelData, extraKeyboard) {
  const kb = extraKeyboard || new InlineKeyboard();
  if (cancelData) kb.row().text(ctx.t('common.cancel'), cancelData);
  return show(ctx, text, kb, { fresh: !ctx.callbackQuery });
}

// Нижняя кнопка экрана настроек: при регистрации — «Далее», иначе — «Назад»
function footer(ctx, kb, backData = 'nav:home') {
  if (ctx.master && !ctx.master.registered) {
    kb.row().text(ctx.t('reg.next'), 'reg:next');
  } else {
    kb.row().text(ctx.t('common.back'), backData);
  }
  return kb;
}

async function alert(ctx, text) {
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery({ text, show_alert: true }).catch(() => {});
  } else {
    await ctx.reply(text, BASE_OPTS);
  }
}

module.exports = { esc, fmtMoney, show, prompt, footer, alert, BASE_OPTS };
