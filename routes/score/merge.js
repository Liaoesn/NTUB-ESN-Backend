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

// 等距分配分數函數
function distributeScores(min, max, numberOfPeople) {
  const scores = [];
  const step = (max - min) / (numberOfPeople - 1); // 每個人之間的分數差

  for (let i = 0; i < numberOfPeople; i++) {
    const score = max - i * step; // 根據順序，從高到低分配
    scores.push(parseFloat(score.toFixed(2))); // 保存分數，保留兩位小數(轉換為浮點數)
  }

  return scores;
}

// 合併排序函數：按輪流取用的方式合併多個排序列表
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

// 檢查錄取公平性
const checkAdmissionFairness = async (prono, admissionCount) => {
  // 1. 獲取協作老師總數
  const collaboratorQuery = 'SELECT COUNT(*) AS collaboratorCount FROM `student-project`.collaborator WHERE prono = ?';
  const collaboratorResult = await query(collaboratorQuery, [prono]);
  const collaboratorCount = collaboratorResult[0].collaboratorCount;

  // 2. 計算每位老師應該錄取的學生數量
  const studentsPerTeacher = Math.floor(admissionCount / collaboratorCount);
  const remainderStudents = admissionCount % collaboratorCount; // 剩下的學生數

  // 3. 確認是否有老師要多評分一個學生
  if (remainderStudents > 0) {
    return {
      status: 'unfair',
      message: `有${remainderStudents}名學生分配不公平，請重新評分這些學生。`,
      extraStudentsCount: remainderStudents
    };
  } else {
    return {
      status: 'fair',
      message: '分配公平，無需重新評分。'
    };
  }
};

function weightedRanking(evaluations, weightKey = 'weight') {
  return evaluations.sort((a, b) => b[weightKey] - a[weightKey]);
}

// 提交合併排序並分配分數
router.post('/merge', async (req, res) => {
  const { prono } = req.body; // 從前端獲取 prono 和分數範圍

  try {
    // 1. 獲取錄取人數
    const projectQuery = 'SELECT admission, share_type FROM `student-project`.project WHERE prono = ?';
    const projectResult = await query(projectQuery, [prono]);
    const admissionCount = projectResult[0].admission;

    // 2. 檢查錄取公平性
    const fairnessCheck = await checkAdmissionFairness(prono, admissionCount);

    // 如果不公平，返回錯誤提示並要求重新評分
    if (fairnessCheck.status === 'unfair') {
      return res.json({ success: false, message: fairnessCheck.message });
    }

    // 3. 獲取每位協作老師排序的學生
    const sortedLists = [];
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

      const evaluations = await query(evaluationsQuery, [prono]);
      const studentList = evaluations.map(evaluation => evaluation.stuno);
      sortedLists.push(studentList);
    }

    // 4.處理合併排序
    const share_type = projectResult[0].share_type; // 獲取 share_type
    let finalRankingList = [];
    if (share_type === 1) {
        // 平均分配：簡單合併並均勻分配
        finalRankingList = mergeRankings(sortedLists);
    } else if (share_type === 2) {
        // 全部分配：加權排名
        const allEvaluations = sortedLists.flatMap(list => list);
        finalRankingList = weightedRanking(allEvaluations).map(evaluation => evaluation.stuno);
    }

    // 5. 分配分數（假設最高分 90，最低分 70）
    const scores = distributeScores(70, 90, finalRankingList.length);

    // 6. 插入或更新合併排序結果及其分數
    const insertPromises = finalRankingList.map((stuno, index) => {
      const final_rank = index + 1;
      const score = scores[index]; // 根據排序位置分配的分數
      const updateQuery = 'UPDATE `student-project`.`student` SET final_ranking = ?, final_score = ? WHERE stuno = ?';
      return query(updateQuery, [final_rank, score, stuno]);
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '合併排序和分數分配成功儲存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
