const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/:pro_no', async (req, res) => {
    try {
        const pro_no = req.params.pro_no;

        const [rows] = await pool.query(`
            SELECT *
            FROM ESN.projects p
            LEFT JOIN students s ON p.pro_no = s.pro_no AND s.stu_no = a.stu_no
            LEFT JOIN resumes r ON s.stu_no = r.stu_no
			LEFT JOIN autobiographys au ON s.stu_no = au.stu_no
			LEFT JOIN student_details d ON s.stu_no = d.stu_no
            WHERE p.pro_no = ?
            ORDER BY s.final_ranking ASC
        `, [pro_no]);

        // 返回查詢結果
        res.json(rows); // 返回合併後的資料
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
