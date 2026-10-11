// «👥 Клиенты»: список с визитами и карточка клиента с историей
const { Composer, InlineKeyboard } = require('grammy');
const { masterClients } = require('../../services/clients');
const { show, esc, fmtMoney, fmtDay, fmtTime } = require('../ui');

const composer = new Composer();
const PAGE = 15;

async function showList(ctx, page = 0) {
  const clients = await masterClients(ctx.master._id);
  const kb = new InlineKeyboard();
  if (!clients.length) {
    kb.text(ctx.t('common.back'), 'nav:home');
    return show(ctx, ctx.t('cl.empty'), kb);
  }
  const pages = Math.ceil(clients.length / PAGE);
  const p = Math.min(Math.max(page, 0), pages - 1);
  clients.slice(p * PAGE, (p + 1) * PAGE).forEach((c) => {
    const mark = c.noShows ? ' 🚫' : '';
    kb.text(ctx.t('cl.item', { name: c.name, visits: c.visits }) + mark, `cl:v:${c.key}`).row();
  });
  if (pages > 1) {
    if (p > 0) kb.text('◀️', `cl:p:${p - 1}`);
    kb.text(`${p + 1}/${pages}`, 'noop');
    if (p < pages - 1) kb.text('▶️', `cl:p:${p + 1}`);
    kb.row();
  }
  kb.text(ctx.t('common.back'), 'nav:home');
  const totalVisits = clients.reduce((s, c) => s + c.visits, 0);
  return show(ctx, ctx.t('cl.title', { count: clients.length, visits: totalVisits }), kb);
}

async function showCard(ctx, key) {
  const clients = await masterClients(ctx.master._id);
  const c = clients.find((x) => x.key === key);
  if (!c) return showList(ctx);
  const lines = [
    ctx.t('cl.card', {
      name: esc(c.name),
      phone: esc(c.phone || '—'),
      visits: c.visits,
      spent: fmtMoney(c.spent),
      noShows: c.noShows,
      last: c.lastVisit ? fmtDay(ctx.t, c.lastVisit) : '—',
      next: c.nextVisit ? `${fmtDay(ctx.t, c.nextVisit)}, ${fmtTime(c.nextVisit)}` : '—',
    }),
    '',
    ctx.t('cl.historyTitle'),
  ];
  c.history
    .slice(-8)
    .reverse()
    .forEach((b) => lines.push(`${fmtDay(ctx.t, b.start)} ${fmtTime(b.start)} · ${esc(b.serviceTitle)} · ${ctx.t(`status.${b.status}`)}`));

  const kb = new InlineKeyboard().text(ctx.t('cl.bookBtn'), `cl:b:${c.key}`).row();
  if (c.telegramId) kb.url(ctx.t('cl.writeBtn'), `tg://user?id=${c.telegramId}`).row();
  kb.text(ctx.t('common.back'), 'cl:list');
  return show(ctx, lines.join('\n'), kb);
}

composer.callbackQuery('cl:list', (ctx) => showList(ctx));
composer.callbackQuery(/^cl:p:(\d+)$/, (ctx) => showList(ctx, Number(ctx.match[1])));
composer.callbackQuery(/^cl:v:([cm][0-9a-f]+)$/, (ctx) => showCard(ctx, ctx.match[1]));

// Записать этого клиента снова: имя и телефон подставятся, останется выбрать услугу и время
composer.callbackQuery(/^cl:b:([cm][0-9a-f]+)$/, async (ctx) => {
  const clients = await masterClients(ctx.master._id);
  const c = clients.find((x) => x.key === ctx.match[1]);
  if (!c) return showList(ctx);
  ctx.session.mbPrefill = { name: c.name, phone: c.phone || null };
  return require('./manual').startNew(ctx);
});

module.exports = { composer };
