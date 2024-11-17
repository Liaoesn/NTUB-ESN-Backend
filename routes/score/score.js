const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 提交最終排序
router.post('/', async (req, res) => {
  const { data } = req.body; // score 為前端傳入的陣列
  if (!Array.isArray(data) || score.length === 0) {
    return res.status(400).json({ error: '無效的分數數據' });
  }

  try {
    // 用來批量更新每條評分記錄
    const updatePromises = score.map(item => {
      const { id, score, memo } = item; // 從前端獲取 no、memo 和 score
      const evalUpdateQuery = 'UPDATE ESN.evaluations SET score = ?, memo = ? WHERE eva_no = ?';

      // 返回 pool.query 的 Promise
      return pool.query(evalUpdateQuery, [score, memo, id]);
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