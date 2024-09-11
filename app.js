require('dotenv').config(); // 加载 .env 文件
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const authRoutes = require('./routes/auth');
const userListRoutes = require('./routes/user/list');
const userDataRoutes = require('./routes/user/data');
const userDisableRoutes = require('./routes/user/disable');
// const proAddRoutes = require('./routes/project/insert');
const proListRoutes = require('./routes/project/list');
const proManListRoutes = require('./routes/project/data');
const proUpdateRoutes = require('./routes/project/update');
const userGetRole = require('./routes/user/getRole');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// 使用固定的密鑰，在 .env 文件中配置
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在開發環境下可以設置為 false
    maxAge: 1000 * 60 * 60 * 24, // 有效期為一天
  },
}));

// API 路由
app.use('/api/auth', authRoutes);  // 認證相關路由

app.use('/api/user/list', userListRoutes); // 使用者列表路由
app.use('/api/user/data', userDataRoutes); // 使用者資料路由
app.use('/api/user/disable', userDisableRoutes); // 使用者停用路由
app.use('/api/user/getRole', userGetRole); 

// app.use('/api/project/insert', proAddRoutes) // 新增專案路由
app.use('/api/project/list', proListRoutes) // 專案列表路由
app.use('/api/project/data', proManListRoutes) // 自己專案列表路由
app.use('/api/project/update', proUpdateRoutes) // 更新專案路由


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
