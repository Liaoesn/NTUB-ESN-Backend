const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 將 pool.query 包裝為 Promise 以使用 async/await
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

/**
 * 合併排序函數：按輪流取用的方式合併多個排序列表
 * @param {Array<Array>} lists - 多個排序好的學生列表，每個列表由一位協作老師排序
 * @returns {Array} - 合併後的最終排序列表
 */
const mergeRankings = (lists) => {
    const merged = [];
    const maxLength = Math.max(...lists.map(list => list.length));
    for (let i = 0; i < maxLength; i++) {
        lists.forEach(list => {
            if (i < list.length) {
                merged.push(list[i]);
            }
        });
    }
    return merged;
};

// 提交合併排序
router.post('/merge', async (req, res) => {
  const { prono } = req.body; // 獲取 prono

  try {
    // 獲取每位協作老師排序的學生
    const sortedLists = [];
    
    // 獲取所有協作老師的 colno
    const collaborators = await query(`SELECT colno FROM collaborator WHERE prono = ?`, [prono]); 

    for (const collaborator of collaborators) {
      const colno = collaborator.colno;
      const evaluationsQuery = `
        SELECT s.stuno
        FROM \`student-project\`.evaluations e
        JOIN assignment a ON e.assno = a.assno
        JOIN collaborator c ON a.colno = c.colno
        JOIN student s ON a.stuno = s.stuno
        WHERE c.prono = ?
        ORDER BY e.ranking ASC`;

      const evaluations = await query(evaluationsQuery, [prono]); // 使用 prono 作為參數
      const studentList = evaluations.map(evaluation => evaluation.stuno); // 確保使用正確的字段
      sortedLists.push(studentList);
    }

    // 合併排序
    const finalRankingList = mergeRankings(sortedLists);

    // 插入或更新最終的合併排序結果
    const insertPromises = finalRankingList.map((stuno, index) => {
      const final_rank = index + 1;
      const updateQuery = 'UPDATE `student-project`.`student` SET final_ranking = ? WHERE stuno = ?';
      return query(updateQuery, [final_rank, stuno]);
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '合併排序成功儲存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
