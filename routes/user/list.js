const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 獲取使用者列表
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM `student-project`.`user`');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

module.exports = router;