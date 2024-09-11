const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');
const roleMap = require("../user/roleMap");

router.get('/', async (req, res) => {
    try {
        res.json(roleMap);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '無法獲取用戶列表' });
    }
});

module.exports = router;