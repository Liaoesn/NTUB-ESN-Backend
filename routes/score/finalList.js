const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;

        const [rows] = await pool.query(`
            SELECT *
            FROM \`student-project\`.project p
            LEFT JOIN collaborator c ON p.prono = c.prono
            LEFT JOIN student s ON p.prono = s.prono
            LEFT JOIN resume r ON s.stuno = r.stuno
			LEFT JOIN autobiography au ON s.stuno = au.stuno
			LEFT JOIN studetails d ON s.stuno = d.stuno
            LEFT JOIN assignment a ON c.colno = a.colno AND s.stuno = a.stuno
            LEFT JOIN evaluations e ON a.assno = e.assno
            WHERE p.prono = ?
            ORDER BY s.final_ranking ASC
        `, [prono]);

        // 返回查詢結果
        res.json(rows); // 返回合併後的資料
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
