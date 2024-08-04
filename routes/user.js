const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

// 獲取使用者列表
router.get('/userList', async (req, res) => {
    try {
        const [users] = await db.query('SELECT * FROM `student-project`.`user`');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

// 使用者資料
router.get('/user/:id', async (req, res) => {
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

// 停用使用者
router.put('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { state } = req.body;
        const [result] = await db.query(
            'UPDATE `student-project`.`user` SET `state` = ? WHERE `id` = ?',
            [state, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '未找到使用者' });
        }

        res.json({ message: '使用者已停用' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法更新使用者資料' });
    }
});


module.exports = router;