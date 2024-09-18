const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 更新使用者資訊（包括停用和改權限）
router.put('/:userno', async (req, res) => {
    try {
        console.log('request: ', req.body);
        const userno = req.params.userno;
        const { permissions, state } = req.body;

        // 查詢當前使用者的資料
        const [existingRows] = await pool.query('SELECT `permissions`, `state` FROM `student-project`.`user` WHERE `userno` = ?', [userno]);
        if (existingRows.length === 0) {
            return res.status(404).json({ error: '未找到使用者' });
        }

        const existingUser = existingRows[0];
        let query = 'UPDATE `student-project`.`user` SET ';
        let values = [];
        let fieldsToUpdate = [];

        // 檢查 permissions 是否不同
        if (permissions !== undefined && permissions !== existingUser.permissions) {
            fieldsToUpdate.push('`permissions` = ?');
            values.push(permissions);
        }

        // 檢查 state 是否不同
        if (state !== undefined && state !== existingUser.state) {
            fieldsToUpdate.push('`state` = ?');
            values.push(state);
        }

        // 如果沒有需要更新的資料，返回不需要更新的訊息
        if (fieldsToUpdate.length === 0) {
            return res.json({ message: '沒有需要更新的資料' });
        }

        // 組合更新的 SQL 語句
        query += fieldsToUpdate.join(', ');
        query += ' WHERE `userno` = ?';
        values.push(userno);

        console.log(query);
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
