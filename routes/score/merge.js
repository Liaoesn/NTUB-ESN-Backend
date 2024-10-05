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
    // Step 1: 查找所有協作老師
    const collaboratorQuery = 'SELECT colno, userno FROM `student-project`.`collaborator` WHERE prono = ?';
    const collaborators = await query(collaboratorQuery, [prono]);

    if (collaborators.length === 0) {
      return res.status(404).json({ error: '找不到協作老師記錄' });
    }
    // 提取所有的 colno，並構造一個陣列
    const colnos = collaborators.map(c => c.colno);

    const assignmentQuery = 'SELECT assno FROM `student-project`.`assignment` WHERE colno IN (?)';
    const assignment = await query(assignmentQuery, [colnos]);

    if (assignment.length === 0) {
        return res.status(404).json({ error: '找不到分配記錄' });
    }

    // Step 2: 對每個協作老師，獲取他們排序的學生
    const sortedLists = [];
    for (const collaborator of collaborators) {
      const colno = collaborator.colno;
      const evaluationsQuery = 'SELECT stuno FROM `student-project`.`evaluations` WHERE colno = ? ORDER BY ranking ASC';
      const evaluations = await query(evaluationsQuery, [colno]);
      const studentList = evaluations.map(evaluation => evaluation.student_id);
      sortedLists.push(studentList);
    }


    // Step 3: 合併排序
    const finalRankingList = mergeRankings(sortedLists);

    // Step 4: 插入新的合併排序結果
    const insertPromises = finalRankingList.map((student_id, index) => {
      const final_rank = index + 1;
      const insertQuery = 'INSERT INTO `student-project`.`final_rankings` (student_id, final_rank) VALUES (?, ?)';
      return query(insertQuery, [student_id, final_rank]);
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '合併排序成功儲存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
