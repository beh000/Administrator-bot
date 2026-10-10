// Адрес мастера: как показать клиенту текстом и точкой на карте
const { esc } = require('./ui');

function hasGeo(master) {
  const loc = master?.location;
  return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
}

// Строка «📍 адрес» для добавления в конец сообщения клиенту ('' если адреса нет)
function addressLine(t, master) {
  const address = master?.location?.address;
  if (address) return `\n\n${t('loc.line', { address: esc(address) })}`;
  if (hasGeo(master)) return `\n\n${t('loc.lineGeoOnly')}`;
  return '';
}

// Отправить точку на карте (если она задана). Ошибки не пробрасываем.
async function sendMasterLocation(api, chatId, master) {
  if (!hasGeo(master)) return;
  const { lat, lng, address } = master.location;
  try {
    await api.sendVenue(chatId, lat, lng, master.name || '📍', address || master.name || '📍');
  } catch (err) {
    console.error(`[location] Не удалось отправить точку пользователю ${chatId}:`, err.description || err.message);
  }
}

module.exports = { hasGeo, addressLine, sendMasterLocation };
