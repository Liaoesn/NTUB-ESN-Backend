const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 提交最終排序
router.post('/submit-sort', async (req, res) => {
    const { sortOrder } = req.body;
    try {
      const query = 'INSERT INTO `student-project`.`evaluations` (evano, assno, colno, ranking, create_at) VALUES (?, ?, ?, ?, ?)';
      pool.query(query, [JSON.stringify(sortOrder)], (err, results) => {
        if (err) {
          return res.status(500).json({ error: '資料庫儲存失敗' });
        }
        res.json({ success: true, message: '排序成功儲存' });
      });
    } catch (error) {
      res.status(500).json({ error: '伺服器錯誤' });
    }
});
  
module.exports = router;