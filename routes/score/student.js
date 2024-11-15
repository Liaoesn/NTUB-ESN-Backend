const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 pro_no 獲取項目及相關學生資料
router.post('/:pro_no', async (req, res) => {
    try {
        const pro_no = req.params.pro_no;
        const user_no = req.body.user_no || req.session.user.user_no; // 從 session 中取得 user_no
        const [projectsRows] = await pool.query('SELECT phase2 FROM ESN.projects WHERE pro_no = ?', [pro_no]);

        if (projectsRows.length === 0) {
            return res.status(404).json({ error: '找不到對應的專案' });
        }
        const phase2 = projectsRows[0].phase2;
        let rows, completedEvaluations, totalstudents;

        if (!phase2){
            [rows] = await pool.query(`
                SELECT * 
                FROM ESN.projects p
                JOIN collaborators c ON c.pro_no = p.pro_no AND c.user_no = ?
                JOIN assignments a ON a.col_no = c.col_no
                JOIN students s ON s.stu_no = a.stu_no
                LEFT JOIN resumes r ON r.stu_no = s.stu_no
                LEFT JOIN autobiographys au ON au.stu_no = s.stu_no
                LEFT JOIN student_details sd ON sd.stu_no = s.stu_no
                JOIN evaluations e ON e.ass_no = a.ass_no
                WHERE p.pro_no = ?
                order by e.eva_no ASC;
            `, [user_no, pro_no]);

            [date] = await pool.query(`SELECT phase1 FROM ESN.projects p WHERE p.pro_no = ?`, [pro_no]);

            // 查詢協作者已完成評分的學生數量
            [completedEvaluations] = await pool.query(`
                SELECT COUNT(e.eva_no) AS completed_count
                FROM ESN.evaluations e
                JOIN assignments a ON a.ass_no = e.ass_no
                JOIN collaborators c ON a.col_no = c.col_no
                WHERE e.score IS NOT NULL AND c.pro_no = ?;
            `, [pro_no]);

            // 查詢協作者負責的總學生數
            [totalstudents] = await pool.query(`
                SELECT COUNT(a.stu_no) AS total_count
                FROM ESN.assignments a
                JOIN collaborators c ON a.col_no = c.col_no
                WHERE c.pro_no = ?;
            `, [pro_no]);        
        }else{
            [rows] = await pool.query(`
                SELECT * 
                FROM ESN.projects p
                JOIN collaborators c ON c.pro_no = p.pro_no AND c.user_no = ?
                JOIN assignments a ON a.col_no = c.col_no AND a.ass_no LIKE '2%'
                JOIN students s ON s.stu_no = a.stu_no
                LEFT JOIN resumes r ON r.stu_no = s.stu_no
                LEFT JOIN autobiographys au ON au.stu_no = s.stu_no
                LEFT JOIN student_details sd ON sd.stu_no = s.stu_no
                JOIN evaluations e ON e.ass_no = a.ass_no
                WHERE p.pro_no = ?
                order by e.eva_no ASC;
            `, [user_no, pro_no]);

            [date] = await pool.query(`SELECT phase2 FROM ESN.projects p WHERE p.pro_no = ?`, [pro_no]);

            // 查詢協作者已完成評分的學生數量
            [completedEvaluations] = await pool.query(`
                SELECT COUNT(e.eva_no) AS completed_count
                FROM ESN.evaluations e
                JOIN assignments a ON a.ass_no = e.ass_no AND a.ass_no LIKE '2%'
                JOIN collaborators c ON a.col_no = c.col_no
                WHERE e.score IS NOT NULL AND c.pro_no = ?;
            `, [pro_no]);

            // 查詢協作者負責的總學生數
            [totalstudents] = await pool.query(`
                SELECT COUNT(a.stu_no) AS total_count
                FROM ESN.assignments a
                JOIN collaborators c ON a.col_no = c.col_no
                WHERE c.pro_no = ? AND a.ass_no LIKE '2%';
            `, [pro_no]);
        }

        // 完成比例計算
        const completionRate = (completedEvaluations[0].completed_count / totalstudents[0].total_count) * 100;

        // 是否排序完成
        const complete = rows.every(row => row.score !== null); // 如果所有學生都有 score，則 complete 為 true

        
        // 返回查詢結果
        res.json({
            rows,
            date: date[0].phase2,
            completed_count: completedEvaluations[0].completed_count,
            total_count: totalstudents[0].total_count,
            completion_rate: completionRate.toFixed(2) + '%',
            complete
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
