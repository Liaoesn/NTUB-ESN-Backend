const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 prono 獲取項目及相關學生資料
router.post('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;
        const userno = req.session.user.userno; // 從 session 中取得 userno

        const [rows] = await pool.query(`
            SELECT * 
            FROM \`student-project\`.project p
            JOIN collaborator c ON c.prono = p.prono c.userno = ?
            JOIN assignment a ON a.colno = c.colno
            JOIN student s ON s.stuno = a.stuno
            LEFT JOIN resume r ON r.stuno = s.stuno
            LEFT JOIN autobiography au ON au.stuno = s.stuno
            LEFT JOIN studetails sd ON sd.stuno = s.stuno
            JOIN evaluations e ON e.assno = a.assno
            WHERE p.prono = ?
            order by e.evano ASC;
        `, [userno, prono]);
        

        // 返回查詢結果
        res.json({ rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
