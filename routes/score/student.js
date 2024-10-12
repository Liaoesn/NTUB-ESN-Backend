const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 prono 獲取項目及相關學生資料
router.post('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;
        const userno = req.body.userno || req.session.user.userno; // 從 session 中取得 userno

        const [rows] = await pool.query(`
            SELECT * 
            FROM \`student-project\`.project p
            JOIN collaborator c ON c.prono = p.prono AND c.userno = ?
            JOIN assignment a ON a.colno = c.colno
            JOIN student s ON s.stuno = a.stuno
            LEFT JOIN resume r ON r.stuno = s.stuno
            LEFT JOIN autobiography au ON au.stuno = s.stuno
            LEFT JOIN studetails sd ON sd.stuno = s.stuno
            JOIN evaluations e ON e.assno = a.assno
            WHERE p.prono = ?
            order by e.evano ASC;
        `, [userno, prono]);

        // 查詢協作者已完成評分的學生數量
        const [completedEvaluations] = await pool.query(`
            SELECT COUNT(e.evano) AS completed_count
            FROM \`student-project\`.evaluations e
            JOIN assignment a ON a.assno = e.assno
            JOIN collaborator c ON a.colno = c.colno
            WHERE e.ranking IS NOT NULL AND c.prono = ?;
        `, [prono]);

        // 查詢協作者負責的總學生數
        const [totalStudents] = await pool.query(`
            SELECT COUNT(a.stuno) AS total_count
            FROM \`student-project\`.assignment a
            JOIN collaborator c ON a.colno = c.colno
            WHERE c.prono = ?;
        `, [prono]);

        // 完成比例計算
        const completionRate = (completedEvaluations[0].completed_count / totalStudents[0].total_count) * 100;

        // 返回查詢結果
        res.json({
            rows,
            completed_count: completedEvaluations[0].completed_count,
            total_count: totalStudents[0].total_count,
            completion_rate: completionRate.toFixed(2) + '%'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
