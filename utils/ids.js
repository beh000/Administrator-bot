const crypto = require('crypto');

// Без похожих символов (0/o, 1/l), чтобы ссылку можно было продиктовать
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function randomId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function masterLink(botUsername, slug) {
  return `https://t.me/${botUsername}?start=m_${slug}`;
}

module.exports = { randomId, masterLink };
