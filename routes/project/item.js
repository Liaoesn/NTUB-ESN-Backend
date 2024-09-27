const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 prono 獲取項目及相關學生資料
router.get('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;

        const [rows] = await pool.query(`
            SELECT * 
            FROM \`student-project\`.project p
            JOIN student s ON p.prono = s.prono
            JOIN studetails sd ON s.stuno = sd.stuno
            JOIN autobiography au ON s.stuno = au.stuno
            JOIN \`resume\` r ON s.stuno = r.stuno
            WHERE p.prono = ?;
        `, [prono]);

        // 返回查詢結果
        res.json(rows); // 返回合併後的資料
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
