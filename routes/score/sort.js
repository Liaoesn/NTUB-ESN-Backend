const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 提交最終排序
router.post('/submit', (req, res) => {
  const { sortOrder } = req.body; // sortOrder 為前端傳入的陣列

  if (!Array.isArray(sortOrder) || sortOrder.length === 0) {
    return res.status(400).json({ error: '無效的排序數據' });
  }

  // 更新計數器
  let updateCount = 0;
  sortOrder.forEach(item => {
    const { evano, ranking } = item; // 從前端獲取 evano 和 ranking
    const evalUpdateQuery = 'UPDATE `student-project`.`evaluations` SET ranking = ?, update_at = ? WHERE evano = ?';
  
    pool.query(evalUpdateQuery, [ranking, new Date(), evano], (err, result) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      updateCount++; // 更新計數器
      console.log('Current updateCount:', updateCount); // 在這裡打印計數器

      // 如果所有更新都已完成，則返回響應
      if (updateCount === sortOrder.length) {
        res.json({ success: true, message: '排序成功儲存' });
      }
    });
  });
});

module.exports = router;
