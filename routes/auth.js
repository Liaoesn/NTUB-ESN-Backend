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
  const [rows] = await pool.query('SELECT * FROM ESN.users WHERE email = ?', [email]);
  return rows[0];
};

const createUserInDb = async (userInfo) => {
  await pool.query('INSERT INTO ESN.users (user_name, avatar_url, email, permissions, state) VALUES (?, ?, ?, ?, ?)', [
    userInfo.name, userInfo.picture, userInfo.email, 0, '1'
  ]);

  return {
    ...userInfo,
    userno: newUserNo,
    permissions: 0,
    state: '1',
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

    if (!userEmail.endsWith('.edu.tw')) {
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
