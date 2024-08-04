require('dotenv').config(); // 加載 .env 文件
const { withIronSession } = require('next-iron-session');

function withSession(handler) {
  return withIronSession(handler, {
    password: process.env.SECRET_COOKIE_PASSWORD,
    cookieName: 'next.js/examples/with-iron-session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
    },
  });
}
module.exports = { withSession };
