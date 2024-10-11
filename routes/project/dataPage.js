const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.userno) {
        return res.status(401).send('User not authenticated');
    }
    
    const { year, academic } = req.query;
    const userno = req.session.user.userno; // 從 session 中取得 userno

    try{
        // 基本查詢語句
        let query = `SELECT CEILING(COUNT(*) / 5) as page 
                    FROM \`student-project\`.project p
                    LEFT JOIN collaborator c ON c.userno = ? AND p.prono = c.prono
                    JOIN user u on u.userno = p.create_id
                    WHERE (c.userno = ? or p.create_id = ?)
                `;

        let params = [userno, userno, userno];

        // 根據是否有 year 來構造查詢條件
        if (year) {
            query += ' AND LEFT(p.prono, 3) = ?';
            params.push(year);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
            query += ' AND SUBSTRING(p.prono, 4, 2) = ?';
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