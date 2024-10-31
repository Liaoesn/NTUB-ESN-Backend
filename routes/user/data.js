const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const roleMap = require("../user/roleMap");

// 使用者資料
router.get('/:userno', async (req, res) => {
    try {
        const userno = req.params.userno;

        // 查詢指定 userno 的使用者資料
        const [rows] = await pool.query('SELECT * FROM ESN.users WHERE `user_no` = ?', [userno]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '未找到使用者' });
        }

        const user = rows[0];
        // 透過 roleMap 將 permissions 轉換為角色名稱
        const usersWithRoles = {
            ...user,
            // 使用 roleMap 將 permissions 數字轉換為對應的角色名稱
            permissionsName: roleMap.getRole(user.permissions)
        };

        // 返回包含角色名稱的使用者資料
        res.json(usersWithRoles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取使用者資訊' });
    }
});

module.exports = router;
