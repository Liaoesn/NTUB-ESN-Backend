const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.user_no) {
        return res.status(401).send('User not authenticated');
    }
    
    const { year, academic, page = 1 } = req.query;
    const user_no = req.session.user.user_no; // 從 session 中取得 user_no

    try{
        // 基本查詢語句
        let query = `SELECT p.*, u.user_name, pro_year
                    FROM ESN.projects p
                    LEFT JOIN collaborators c ON c.user_no = ? AND p.pro_no = c.pro_no
                    JOIN users u on u.user_no = p.create_id
                    WHERE (c.user_no = ? or p.create_id = ?)
                    ORDER BY p.start_date DESC
                `;

        let params = [user_no, user_no, user_no];

        // 根據是否有 year 來構造查詢條件
        if (year) {
            query += ' AND pro_year = ?';
            params.push(year);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
            query += ' AND pro_academic = ?';
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