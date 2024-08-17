const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 使用者資料
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const [rows] = await db.query('SELECT * FROM `student-project`.`user` WHERE `id` = ?', [userId]);
        
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