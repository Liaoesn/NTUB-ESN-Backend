const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.post('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;
        const { phase2, stuno } = req.body;
        const distributionRound = 2; // 這是第二次分配
        const assNoPrefix = prono.slice(0, 3);  // 使用專案編號作為 assno 前綴
        const currentMonth = new Date().getMonth() + 1;  // 當前月份，用於 assno

        // 更新 project 的 phase2
        await pool.query('UPDATE `student-project`.`project` SET phase2 = ? WHERE prono = ?', [phase2, prono]);

        // 查詢協作老師
        const [collaborators] = await pool.query('SELECT colno FROM `student-project`.`collaborator` WHERE prono = ?', [prono]);

        if (!collaborators.length) {
            return res.status(404).json({ error: '找不到協作老師' });
        }

        // 檢查傳入的學生學號
        if (!Array.isArray(stuno) || stuno.length === 0) {
            return res.status(400).json({ error: 'stuno 應為包含學生學號的陣列' });
        }

        // 查詢現有分配的最大 assno
        const [existingAssignments] = await pool.query('SELECT assno FROM `student-project`.`assignment` WHERE assno LIKE ?', [`${assNoPrefix}${currentMonth}%`]);
        let maxAssSuffix = 100;
        if (existingAssignments.length > 0) {
            maxAssSuffix = Math.max(...existingAssignments.map(a => parseInt(a.assno.slice(-3))));
        }

        const assignmentQuery = 'INSERT INTO `student-project`.`assignment` (assno, colno, stuno) VALUES (?, ?, ?)';
        const evaluationQuery = 'INSERT INTO `student-project`.`evaluations` (evano, assno) VALUES (?, ?)';

        // 將每位學生分配給每位老師
        for (const colno of collaborators) {
            for (const studentId of stuno) {
                // 在生成的 assno 前加上分配回合的標記，例如 "2" 用於第二次分配
                const newAssNo = `${distributionRound}${assNoPrefix}${String(currentMonth).padStart(2, '0')}${String(maxAssSuffix + 1).padStart(3, '0')}`; // 生成新的 assno
                await pool.query(assignmentQuery, [newAssNo, colno.colno, studentId]);

                // 生成 evano，規則為 assno 後加固定數 5
                const evaNo = `${newAssNo}5`;
                await pool.query(evaluationQuery, [evaNo, newAssNo]);

                maxAssSuffix++; // 增加 assno 序號
            }
        }

        res.status(200).json({ message: '學生分配成功' });

    } catch (error) {
        console.error('獲取資料失敗:', error);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

module.exports = router;
