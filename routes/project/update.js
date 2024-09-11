const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {

    // 從請求中獲取要編輯的 prono
    const { editProno } = req.query;

    // 專案名稱, 學年, 學制, 審核方式, 錄取人數, 資料總數, 協作者
    const { proname, year, academic, review, admissions, teacher } = req.query;
    
    let query = '';
    let params = [editProno];
    
    
    try{
        if (proname){
            query = `Update \`student-project\`.\`project\` set proname = ? where prono = ?`
            params.push(proname);
        }

        if (academic){
            query = `Update \`student-project\`.\`project\` set prodescription = ? where prono = ?`
            params.push(academic);
        }

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