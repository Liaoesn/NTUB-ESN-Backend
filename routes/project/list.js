const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

router.get('/list', async (req, res) => {
    const { year, academic } = req.query;

    try{
        // 基本查詢語句
        let query = 'SELECT prono FROM `student-project`.`project` WHERE 1=1';
        let params = [];

        // 根據是否有 year 來構造查詢條件
        if (year) {
        query += ' AND prono LIKE ?';
        params.push(`${year}%`);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
        query += ' AND prono LIKE ?';
        params.push(`%${academic}%`);
        }

        // 執行查詢
        const results = await db.query(query, params);

        // 返回結果
        res.json(results);

    }
    catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }
});

module.exports = router;