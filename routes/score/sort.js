const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 將 pool.query 包裝為 Promise
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// 提交最終排序
router.post('/submit', async (req, res) => {
  const { sortOrder, userno, prono } = req.body;
  try {
    // Step 1: 查找 collaborator 表，獲取 colno
    const colnoQuery = 'SELECT colno FROM `student-project`.`collaborator` WHERE prono = ? AND userno = ?';
    const colnoResults = await query(colnoQuery, [prono, userno]);

    if (colnoResults.length === 0) {
      return res.status(404).json({ error: '找不到對應的 collaborator 記錄' });
    }
    const colno = colnoResults[0].colno;

    // Step 2: 查找 assignment 表，獲取 assno
    const assnoQuery = 'SELECT assno FROM `student-project`.`assignment` WHERE colno = ?';
    const assnoResults = await query(assnoQuery, [colno]);

    if (assnoResults.length === 0) {
      return res.status(404).json({ error: '找不到對應的 assignment 記錄' });
    }
    const assno = assnoResults[0].assno;

    // Step 3: 按照 evano 查找 evaluations 表中的資料
    const evalQuery = 'SELECT * FROM `student-project`.`evaluations` WHERE assno = ? AND colno = ? ORDER BY evano';
    const evalResults = await query(evalQuery, [assno, colno]);

    // Step 4: 更新每個排序後的 evaluation，逐條更新 ranking
    for (let i = 0; i < evalResults.length; i++) {
      const evalUpdateQuery = 'UPDATE `student-project`.`evaluations` SET ranking = ?, update_at = ? WHERE evano = ?';
      await query(evalUpdateQuery, [sortOrder[i], new Date(), evalResults[i].evano]);
    }
    
    res.json({ success: true, message: '排序成功儲存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
