const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    // 要查專案創建者的編號
    
    const { year, academic, useno } = req.query;

    try{
        // 基本查詢語句
        let query = 'SELECT * FROM `student-project`.`project` WHERE create_id = ?';
        let params = [userno];

        // 根據是否有 year 來構造查詢條件
        if (year) {
        query += ' AND LEFT(prono, 3) = ?';
        params.push(year);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
        query += ' AND SUBSTRING(prono, 4, 2) = ?';
        params.push(academic);
        }

        // 執行查詢
        const [results] = await pool.query(query, params);
 
        // 返回結果
        res.json(results);

    }
    catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

});

module.exports = router;