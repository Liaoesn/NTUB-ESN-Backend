const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {

    // 從請求中獲取要編輯的 prono
    const { editProno } = req.query;

    // 專案名稱, 學制, 審核方式, 開始日期, 第一階段, 第二階段, 結束日期, 錄取人數, 協作者
    const { proname, academic, review, startDate, phase1, phase2, endDate, admissions, teacher } = req.query;
    
    let query = '';
    let params = [editProno];
    
    
    try{
        // 專案名稱
        if (proname){
            query = `Update \`student-project\`.\`project\` set proname = ? where prono = ?`
            params.push(proname);
        }

        // 學制
        if (academic){
            query = `Update \`student-project\`.\`project\` set prodescription = ? where prono = ?`
            params.push(academic);
        }

        // 開始日期
        if (startDate){
            query = `Update \`student-project\`.\`project\` set startdate = ? where prono = ?`
            params.push(academic);
        }

        // 第一階段
        if (phase1){
            query = `Update \`student-project\`.\`project\` set phase1 = ? where prono = ?`
            params.push(phase1);
        }

        // 第二階段
        if (phase2){
            query = `Update \`student-project\`.\`project\` set phase2 = ? where prono = ?`
            params.push(phase2);
        }

        // 結束日期
        if (endDate){
            query = `Update \`student-project\`.\`project\` set enddate = ? where prono = ?`
            params.push(phase2);
        }

        // 錄取人數
        if (admissions){
            query = `Update \`student-project\`.\`project\` set admissions = ? where prono = ?`
            params.push(admissions);
        }

        

        // 確保有查詢和參數
        if (!query) {
            return res.status(400).send('No update parameters provided');
        }

        // 執行查詢
        const [result] = await pool.query(query, params);

        // 確認更新是否成功
        if (result.affectedRows > 0) {
            res.send('Project updated successfully');
        } else {
            res.status(404).send('No project found with the given prono');
        }
    }catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }
});

module.exports = router;