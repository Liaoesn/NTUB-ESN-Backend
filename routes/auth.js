const express = require('express');
const router = express.Router();
const pool = require('../lib/db');
const { OAuth2Client } = require('google-auth-library');
const { GOOGLE_CLIENT_ID, GOOGLE_SECRET_KEY, HOST } = process.env;

const client = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_SECRET_KEY,
  redirectUri: `${HOST}/api/auth/callback`,
});

// 查看資料庫內有無紀錄
const getUserFromDb = async (email) => {
  const [rows] = await pool.query('SELECT * FROM `student-project`.`user` WHERE email = ?', [email]);
  return rows[0];
};

const createUserInDb = async (userInfo) => {
  // 動態獲取當前年份和月份
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() - 1911; // 將西元年轉為民國年
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // 獲取月份並補齊兩位

  // 獲取當前年份內最新的 userno
  const [result] = await pool.query(
    'SELECT userno FROM `student-project`.`user` WHERE userno LIKE ? ORDER BY userno DESC LIMIT 1',
    [`${currentYear}%`]
  );

  let newUserNo;
  if (result.length > 0) {
    const latestUserNo = result[0].userno;
    const latestSequence = latestUserNo % 1000 + 1; // 提取最新的序號部分並加1
    newUserNo = parseInt(`${currentYear}${currentMonth}${String(latestSequence).padStart(3, '0')}`);
  } else {
    newUserNo = `${currentYear}${currentMonth}001`;
  }

  await pool.query('INSERT INTO `student-project`.`user` (userno, username, avatar_url, email, permissions, state) VALUES (?, ?, ?, ?, ?, ?)', [
    newUserNo, userInfo.name, userInfo.picture, userInfo.email, 0, '使用中'
  ]);

  return {
    ...userInfo,
    userno: newUserNo,
    permissions: 0,
    state: '使用中',
  };
};

router.get('/login', (req, res) => {
  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.redirect(authorizeUrl);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const userInfoResponse = await client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo'
    });

    const userInfo = userInfoResponse.data;
    const userEmail = userInfo.email;

    if (!userEmail.endsWith('@ntub.edu.tw')) {
      return res.redirect('http://localhost:3000/user/loginFail');
    }

    let user = await getUserFromDb(userEmail);

    if (!user) {
      user = await createUserInDb(userInfo);
    }

    req.session.user = user;
    console.log(user);
    await req.session.save()
    res.redirect('http://localhost:3000/user/loginSuccess');
  } catch (error) {
    console.error('Error in authentication flow:', error);
    res.status(400).send('Error fetching Google user info');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('http://localhost:3000/user/login');
});

router.get('/user', async (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(404).send('User not found');
  }
});

module.exports = router;
