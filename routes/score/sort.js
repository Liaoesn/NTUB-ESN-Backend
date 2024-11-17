const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 保存
router.post('/save', async (req, res) => {
  const { evaluations } = req.body; // evaluations 為前端傳入的陣列

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({ error: '無效的評分數據' });
  }

  try {
    // 更新每個被更改的地方
    const updatePromises = evaluations.map(item => {
      const { evano, score, memo } = item; // 從前端獲取 evano 和 score
      const evalUpdateQuery = 'UPDATE ESN.evaluations SET score = ?, memo = ? WHERE eva_no = ?';

      // 直接返回 pool.query 的 Promise
      return pool.query(evalUpdateQuery, [score,  memo, evano]);
    });

    // 等待所有更新完成
    await Promise.all(updatePromises);

    res.json({ success: true, message: '變更成功儲存' });
  } catch (error) {
    console.error('儲存過程中出錯:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 完成
router.post('/complete', async (req, res) => {
  const { evaluations } = req.body;

  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return res.status(400).json({ error: '無效的評分數據' });
  }

  try {
    // 檢查是否有未填寫的分數
    const checkQuery = 'SELECT COUNT(*) AS missingScores FROM ESN.evaluations WHERE score IS NULL OR score = ""';
    const [result] = await pool.query(checkQuery);

    if (result.missingScores > 0) {
      return res.status(400).json({ error: '尚有未評分的項目，請完成所有評分後再提交' });
    }

    // 更新
    const updatePromises = evaluations.map(item => {
      const { evano, score, memo } = item;
      const updateQuery = 'UPDATE ESN.evaluations SET score = ?, memo = ? WHERE eva_no = ?';
      return pool.query(updateQuery, [score, memo, evano]);
    });

    await Promise.all(updatePromises);
    res.json({ success: true, message: '所有評分已完成並保存' });
  } catch (error) {
    console.error('完成提交過程中出錯:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});



module.exports = router;
