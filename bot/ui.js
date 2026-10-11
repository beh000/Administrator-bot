// Общие помощники интерфейса: экранирование, вывод экранов, форматирование.
const { InlineKeyboard } = require('grammy');
const { local, weekdayKey } = require('../utils/time');

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

// Дата для людей: «Пн, 12.10» (по Ташкенту)
function fmtDay(t, date) {
  const d = local(date);
  return `${t(`days.short.${weekdayKey(d)}`)}, ${d.format('DD.MM')}`;
}

function fmtTime(date) {
  return local(date).format('HH:mm');
}

// Обрезать длинный текст по границе строки, чтобы не порвать HTML-теги
function fitText(text, limit) {
  if (text.length <= limit) return text;
  const lines = text.split('\n');
  const out = [];
  let len = 0;
  for (const line of lines) {
    if (len + line.length + 1 > limit - 2) break;
    out.push(line);
    len += line.length + 1;
  }
  out.push('…');
  return out.join('\n');
}

module.exports = { fitText, esc, fmtMoney, fmtDay, fmtTime, show, prompt, footer, alert, BASE_OPTS };
