const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const roleMap = require("../user/roleMap");

// 獲取使用者列表
router.get('/', async (req, res) => {
    try {
        // 獲取查詢參數
        const { term, permissions, state, role } = req.query;

        // 構建基本的 SQL 查詢語句
        let sql = 'SELECT CEILING(COUNT(*) / 5) as page FROM ESN.users WHERE 1=1';
        const params = [];

        // 根據查詢參數動態構建 SQL 語句
        if (term) {
            sql += ' AND (user_name LIKE ? OR email LIKE ?)';
            params.push(`%${term}%`);
            params.push(`%${term}%`);
        }
        if(permissions) {
            sql += ' AND permissions = ?';
            params.push(`${permissions}`);
        }

        if(state) {
            sql += ' AND state = ?';
            params.push(`${state}`);
        }

        if (role) {
            const roleId = roleMap.getRole(role);
            if (typeof roleId === 'number') {
                sql += ' AND permissions = ?';
                params.push(roleId);
            } else {
                return res.status(400).json({ error: '無效的角色名稱' });
            }
        }
        // 執行查詢
        const [users] = await pool.query(sql, params);
        
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

module.exports = router;