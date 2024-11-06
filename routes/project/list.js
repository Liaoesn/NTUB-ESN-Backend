const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/', async (req, res) => {
    const { year, academic, page = 1 } = req.query;

    try {
        // 基本查詢語句
        let query = `SELECT p.*, u.user_name, LEFT(p.pro_no, 3) AS prono_prefix
                    FROM ESN.projects p
                    JOIN users u ON p.create_id = u.user_no
                    WHERE p.status = '已關閉'
                `;

        let params = [];

        // 根據是否有 year 來構造查詢條件
        if (year) {
            query += ' AND LEFT(pro_no, 3) = ?';
            params.push(year);
        }

        // 根據是否有 academic 來構造查詢條件
        if (academic) {
            query += ' AND SUBSTRING(pro_no, 4, 2) = ?';
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
