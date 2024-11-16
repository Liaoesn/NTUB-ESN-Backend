const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 提交最終排序
router.post('/submit', async (req, res) => {
  const { sortOrder } = req.body; // sortOrder 為前端傳入的陣列

  if (!Array.isArray(sortOrder) || sortOrder.length === 0) {
    return res.status(400).json({ error: '無效的排序數據' });
  }

  try {
    // 更新每個排序後的 evaluation，逐條更新 ranking
    const updatePromises = sortOrder.map(item => {
      const { eva_no, score } = item; // 從前端獲取 eva_no 和 score
      const evalUpdateQuery = 'UPDATE ESN.evaluations SET score = ?, update_at = ? WHERE eva_no = ?';

      // 直接返回 pool.query 的 Promise
      return pool.query(evalUpdateQuery, [ranking, new Date(), evano]);
    });

    // 等待所有更新完成
    await Promise.all(updatePromises);

    res.json({ success: true, message: '排序成功儲存' });
  } catch (error) {
    console.error('資料庫更新過程中出錯:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
