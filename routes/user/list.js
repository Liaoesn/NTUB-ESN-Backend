const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const getRole = require("../user/roleMap");

// 獲取使用者列表
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT userno, username, email, avatar_url, permissions FROM `student-project`.`user`');
        const roleMap = {
            0: '老師',
            1: '助教',
            2: '管理者'
        };
        const usersWithRoles = users.map(user => ({
            // 展開 user 對象，保留原有属性
            ...user,
            // 使用 getRole 函數將 permissions 從數字轉為職稱，若沒有則顯示未知角色
            admin: getRole(user.permissions)
        }));
        res.json(usersWithRoles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

module.exports = router;