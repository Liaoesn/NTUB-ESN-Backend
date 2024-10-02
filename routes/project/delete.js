const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.put('/', async (req, res) => {
    console.log('Received body:', req.body);  // 確認 `prono` 是否正確傳遞

    const { prono } = req.body;

    try {
        // 開始交易
        await pool.query('START TRANSACTION');

        // 初始化變數
        let isDeleted = false;

        // 查詢所有與 prono 相關的 colno
        const selectColnoQuery = 'SELECT colno FROM `student-project`.`collaborator` WHERE prono = ?';
        const [colnoResults] = await pool.execute(selectColnoQuery, [prono]);

        if (colnoResults.length > 0) {
            // 刪除其他表中與 colno 相關的資料
            const colnoList = colnoResults.map(row => row.colno);
            if (colnoList.length > 0) {
                const deleteAssignmentQuery = 'DELETE FROM `student-project`.`assignment` WHERE colno IN (?)';
                const deleteEvalutionsQuery = 'DELETE FROM `student-project`.`evalutions` WHERE colno IN (?)';

                const [resultAssignment] = await pool.execute(deleteAssignmentQuery, [colnoList]);
                const [resultEvalutions] = await pool.execute(deleteEvalutionsQuery, [colnoList]);

                if (resultAssignment.affectedRows > 0 || resultEvalutions.affectedRows > 0) {
                    isDeleted = true;
                }

            }
        }

        // 刪除 collaborator 表中的資料
        const deleteCollaboratorQuery = 'DELETE FROM `student-project`.`collaborator` WHERE prono = ?';
        const [resultCollaborator] = await pool.execute(deleteCollaboratorQuery, [prono]);

        if (resultCollaborator.affectedRows > 0) {
            isDeleted = true;
        }

        // 查詢所有與 prono 相關的 stuno
        const selectStunoQuery = 'SELECT stuno FROM `student-project`.`student` WHERE prono = ?';
        const [stunoResults] = await pool.execute(selectStunoQuery, [prono]);

        if (stunoResults.length > 0) {
            // 刪除其他表中與 stuno 相關的資料
            const stunoList = stunoResults.map(row => row.stuno);
            if (stunoList.length > 0) {
                const deleteStudetailsQuery = 'DELETE FROM `student-project`.`studetails` WHERE stuno IN (?)';
                const deleteResumeQuery = 'DELETE FROM `student-project`.`resume` WHERE stuno IN (?)';
                const deleteAutobiographyQuery = 'DELETE FROM `student-project`.`autobiography` WHERE stuno IN (?)';


                const [resultStudetails] = await pool.execute(deleteStudetailsQuery, [stunoList]);
                const [resultResume] = await pool.execute(deleteResumeQuery, [stunoList]);
                const [resultAutobiographys] = await pool.execute(deleteAutobiographyQuery, [stunoList]);

                if (resultStudetails.affectedRows > 0 || resultResume.affectedRows > 0 || resultAutobiographys.affectedRows > 0) {
                    isDeleted = true;
                }
            }
        }


        const queryProject = 'DELETE FROM `student-project`.`project` WHERE prono = ?';
        const queryStudent = 'DELETE FROM `student-project`.`student` WHERE prono = ?';

        const [resultProject] = await pool.execute(queryProject, [prono]);
        const [resultStudent] = await pool.execute(queryStudent, [prono]);

        if (resultProject.affectedRows > 0 || resultStudent.affectedRows > 0) {
            isDeleted = true;
        }
            if (isDeleted) {
                // 提交交易
                await pool.query('COMMIT');
                return res.status(200).json({ message: '專案及相關資料已成功刪除' });
            } else {
                // 如果未找到紀錄，則回滾交易
                await pool.query('ROLLBACK');
                return res.status(404).json({ message: '找不到該專案或相關資料' });
            }
    } catch (error) {
        console.error('刪除專案時出錯:', error);
        // 若有錯誤則回滾交易
        await pool.query('ROLLBACK');
        return res.status(500).json({ message: '刪除專案失敗', error });
    }

});

module.exports = router;
