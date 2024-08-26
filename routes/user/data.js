const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 使用者資料
router.get('/:userno', async (req, res) => {
    try {
        const userno = req.params.userno;
        const [rows] = await pool.query('SELECT * FROM `student-project`.`user` WHERE `userno` = ?', [userno]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: '未找到使用者' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶信息' });
    }
});

module.exports = router;