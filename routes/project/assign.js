const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.post('/:pro_no', async (req, res) => {
    try {
        const pro_no = req.params.pro_no;
        const { stu_no } = req.body;
        const distributionRound = 1; // 這是第一次分配

        // 查詢協作老師
        const [collaborators] = await pool.query('SELECT col_no FROM ESN.collaborators WHERE pro_no = ?', [pro_no]);
        if (!collaborators.length) {
            return res.status(404).json({ error: '找不到協作老師' });
        }

        // 檢查傳入的學生學號
        if (!Array.isArray(stu_no) || stu_no.length === 0) {
            return res.status(400).json({ error: 'stu_no 應為包含學生學號的陣列' });
        }

        const assignmentQuery = 'INSERT INTO ESN.assignments (col_no, stu_no) VALUES (?, ?)';
        const evaluationQuery = 'INSERT INTO ESN.evaluations (ass_no, phase) VALUES (?, ?)';

        // 將每位學生分配給每位老師並創建新的 evaluations 記錄
        for (const collaborator of collaborators) {
            for (const studentId of stu_no) {
                // 插入分配記錄
                const [assignmentResult] = await pool.query(assignmentQuery, [collaborator.col_no, studentId]);

                const ass_no = assignmentResult.insertId;  // 獲取插入的 ass_no

                // 插入評分記錄
                await pool.query(evaluationQuery, [ass_no, distributionRound]);
            }
        }

        res.status(200).json({ message: '學生分配並創建評分記錄成功' });

    } catch (error) {
        console.error('獲取資料失敗:', error);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

module.exports = router;
