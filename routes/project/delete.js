const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.put('/', async (req, res) => {
    console.log('Received body:', req.body);  // 確認 `prono` 是否正確傳遞

    const { prono } = req.body;

    try {
        const query = 'DELETE FROM `student-project`.`project` WHERE prono = ?';
        const [result] = await pool.execute(query, [prono]);

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: '專案已成功刪除' });
        } else {
            return res.status(404).json({ message: '找不到該專案' });
        }
    } catch (error) {
        console.error('刪除專案時出錯:', error);
        return res.status(500).json({ message: '刪除專案失敗', error });
    }

});

module.exports = router;
