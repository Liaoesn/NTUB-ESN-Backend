const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 更新使用者資訊（包括停用和改權限）
router.put('/:userno', async (req, res) => {
    try {
        const userno = req.params.userno;
        const { permissions, state } = req.body;

        let query = 'UPDATE `student-project`.`user` SET ';
        let values = [];

        if (permissions !== undefined) {
            query += '`permissions` = ?';
            values.push(permissions);
        }

        if (state !== undefined) {
            if (values.length > 0) query += ', ';
            query += '`state` = ?'; 
            values.push(state);
        }

        query += ' WHERE `userno` = ?';
        values.push(userno);

        const [result] = await pool.query(query, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '未找到使用者' });
        }

        res.json({ message: '使用者資料已更新' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法更新使用者資料' });
    }
});

module.exports = router;
