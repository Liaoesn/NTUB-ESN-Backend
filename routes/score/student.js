const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 根據 prono 獲取項目及相關學生資料
router.get('/:prono', async (req, res) => {
    try {
        const prono = req.params.prono;
        const { userno } = req.query;

        const [proRows] = await pool.query('SELECT phase1, state  FROM `student-project`.project WHERE prono = ?', [prono]);
        const [colRows] = await pool.query('SELECT colno FROM `student-project`.collaborator WHERE prono = ? AND userno = ?', [prono, userno]);
        const [stuRows] = await pool.query('SELECT * FROM `student-project`.student WHERE prono = ?', [prono]);
        const stunoList = stuRows.map(student => student.stuno);
        const [resRows] = await pool.query('SELECT * FROM `student-project`.`resume` WHERE stuno IN (?)', [stunoList]);
        const [autRows] = await pool.query('SELECT * FROM `student-project`.autobiography WHERE stuno IN (?)', [stunoList]);
        const [detRows] = await pool.query('SELECT * FROM `student-project`.studetails WHERE stuno IN (?)', [stunoList]);
        const colno = colRows.map(collaborator => collaborator.colno);
        const [assRows] = await pool.query('SELECT * FROM `student-project`.assignment WHERE colno IN (?)', [colno]);
        const assno = assRows.map(assignment => assignment.assno);
        const [evaRows] = await pool.query('SELECT * FROM `student-project`.evaluations WHERE assno IN (?) ORDER BY evano', [assno]);

        // 返回查詢結果
        res.json({
            project: proRows,
            collaborator: colRows,
            student: stuRows,
            resume: resRows,
            autobiography: autRows,
            studetail: detRows,
            evaluations: evaRows
        }); // 返回合併後的資料
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '獲取資料失敗' });
    }
});

module.exports = router;
