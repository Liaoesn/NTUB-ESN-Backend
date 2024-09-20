const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/prono', async (req, res) => {
    const { prono } = req.query;
    const [ProjectRows] = await pool.query('SELECT * FROM `student-project`.`project` WHERE `prono` = ?', [prono]);
    if (ProjectRows.length === 0) {
        return res.status(404).json({ error: '未找到使用者' });
    }
    res.json(ProjectRows);
});
// 專案名稱, 學制
router.get('/name', async (req, res) => {
    const { proname, academic  } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [];
    try{
        if (proname){
            query = `proname = ?`
            params.push(proname);
        }

        if (academic){
            query = `prodescription = ?`
            params.push(academic);
        }
    }catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

    // 確保有查詢和參數
    if (!query) {
        return res.status(400).send('No update parameters provided');
    }

    // 執行查詢
    const [result] = await pool.query(query, params);
    res.json({ message: '更新成功', result });
});

// 開始日期, 第一階段, 第二階段, 結束日期
router.get('/date', async (req, res) => {
    const { editProno, startDate, phase1, phase2, endDate } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [];

    try{
        if (startDate){
            query = `startdate = ? `
            params.push(startdate);
        }

        if (phase1){
            query = `phase1 = ?`
            params.push(phase1);
        }

        if (phase2){
            query = `phase2 = ?`
            params.push(phase2);
        }

        if (endDate){
            query = `enddate = ?`
            params.push(phase2);
        }
    }catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

    // 確保有查詢和參數
    if (!query) {
        return res.status(400).send('No update parameters provided');
    }

    // 執行查詢
    const [result] = await pool.query(query, params);
    res.json({ message: '更新成功', result });
});


// 錄取人數
router.get('/admissions', async (req, res) =>{
    const { editProno, admissions } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [editProno];

    try{
        // 錄取人數
        if (admissions){
            query = `admissions = ?`
            params.push(admissions);
        }

    }catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

     // 執行查詢
     const [result] = await pool.query(query, params);
     res.json({ message: '更新成功', result });

});

// 協作老師
router.get('/teacher', async (req, res) =>{
    const { editProno, teacher } = req.query;

    let query = '';
    let params = [editProno];

    try{
        if (teacher){
            query = `Update \`student-project\`.\`project\` set admissions = ? where prono = ?`
            params.push(admissions);
        }

    }catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

     // 執行查詢
     const [result] = await pool.query(query, params);
     res.json({ message: '更新成功', result });

});


module.exports = router;