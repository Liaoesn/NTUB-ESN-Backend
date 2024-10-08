const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 prono 獲取項目及相關學生資料
router.post('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;
        const userno = req.session.user.userno; // 從 session 中取得 userno

        const [rows] = await pool.query(`
            SELECT  *
            FROM \`student-project\`.project p
            LEFT JOIN collaborator c ON p.prono = c.prono AND c.userno = ?
            LEFT JOIN student s ON p.prono = s.prono
            LEFT JOIN resume r ON s.stuno = r.stuno
            LEFT JOIN autobiography au ON s.stuno = au.stuno
            LEFT JOIN studetails d ON s.stuno = d.stuno
            LEFT JOIN assignment a ON c.colno = a.colno AND s.stuno = a.stuno
            LEFT JOIN evaluations e ON a.assno = e.assno
            WHERE p.prono = ?
            ORDER BY e.evano ASC
        `, [userno, prono]);
        

        // 返回查詢結果
        res.json({ rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
