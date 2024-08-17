const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');


// 停用使用者
router.put('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { state } = req.body;
        const [result] = await pool.query(
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