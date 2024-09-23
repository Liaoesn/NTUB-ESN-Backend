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

// 第一階段, 結束日期
router.get('/phase1', async (req, res) => {
    const { phase1, endDate } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [];

    try{

        if (phase1){
            query = `phase1 = ?`
            params.push(phase1);
        }


        if (endDate){
            query = `enddate = ?`
            params.push(endDate);
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


// 結束日期
router.get('/enddate', async (req, res) => {
    const { endDate } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [];

    try{

        if (endDate){
            query = `enddate = ?`
            params.push(endDate);
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
    const { admissions } = req.query;

    let query = 'Update \`student-project\`.\`project\` set ';
    let params = [];

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