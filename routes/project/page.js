const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.user_no) {
        return res.status(401).send('User not authenticated');
    }
    
    const { year, academic } = req.query;
    try{
        // 基本查詢語句
        let query = `SELECT CEILING(COUNT(*) / 5) as page 
                    FROM ESN.projects p
                    WHERE p.status = '已關閉'
                `;

        let params = [];

        // 根據是否有 year 來構造查詢條件
        if (year) {
            query += ' AND p.pro_year = ?';
            params.push(year);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
            query += ' AND p.pro_academic = ?';
            params.push(academic);
        }

        // 執行查詢
        const [results] = await pool.query(query, params);



        // 返回結果
        res.json(results[0]);
    } catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

});

module.exports = router;