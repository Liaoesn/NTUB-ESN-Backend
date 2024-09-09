const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.userno) {
        return res.status(401).send('User not authenticated');
    }
    
    const { year, academic, page = 1 } = req.query;
    const userno = req.session.user.userno; // 從 session 中取得 userno

    try{
        // 基本查詢語句
        let query = `SELECT * FROM \`student-project\`.\`project\` p
                    JOIN \`student-project\`.\`user\` u
                    ON p.create_id = u.userno
                    WHERE p.create_id = ? 
                `;

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


        // 分頁設定
        const pageSize = 5;
        const offset = (page - 1) * pageSize;
        query += ' LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // 執行查詢
        const [results] = await pool.query(query, params);

        // 返回結果
        res.json(results);
    } catch (error) {
        console.error('Error in database query:', error);
        res.status(500).send('Error fetching project data');
    }

});

module.exports = router;