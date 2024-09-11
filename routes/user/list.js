const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const roleMap = require("../user/roleMap");

// 獲取使用者列表
router.get('/', async (req, res) => {
    try {
        // 獲取查詢參數
        const { username, email, role } = req.query;

        // 構建基本的 SQL 查詢語句
        let sql = 'SELECT * FROM `student-project`.`user` WHERE 1=1';
        const params = [];

        // 根據查詢參數動態構建 SQL 語句
        if (username) {
            sql += ' AND username LIKE ?';
            params.push(`%${username}%`);
        }
        if (email) {
            sql += ' AND email LIKE ?';
            params.push(`%${email}%`);
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
        
        const usersWithRoles = users.map(user => ({
            // 展開 user 對象，保留原有属性
            ...user,
            // 使用 getRole 函數將 permissions 從數字轉為職稱，若沒有則顯示未知角色
            permissionsName: roleMap.getRole(user.permissions)
        }));
        res.json(usersWithRoles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

module.exports = router;