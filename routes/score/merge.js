const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');


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
  const collaboratorResult = await pool.query(collaboratorQuery, [prono]);
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

function weightedRanking(allEvaluations) {
  const scores = {};

  allEvaluations.forEach(collaborator => {
      collaborator.allEvaluations.forEach(({ stuno, ranking }) => {
          // 初始化每位學生的分數
          if (!scores[stuno]) {
              scores[stuno] = { totalScore: 0, count: 0 }; // 初始化總分和計數
          }

          // 根據排名計算分數
          const adjustedScore = 1 / ranking; // 使用排名的反轉值作為分數
          scores[stuno].totalScore += adjustedScore; // 累加分數
          scores[stuno].count += 1; // 增加計數
      });
  });

  // 計算平均分數並排序
  const weightedScores = Object.entries(scores).map(([stuno, { totalScore, count }]) => ({
      stuno,
      finalScore: totalScore / count // 計算平均分數
  }));

  // 按照 finalScore 降序排序
  return weightedScores.sort((a, b) => b.finalScore - a.finalScore);
}

// 處理 share_type 為 1 的邏輯
async function handleShareType1(prono) {
  const sortedLists = [];
  const collaborators = await pool.query('SELECT colno FROM collaborator WHERE prono = ?', [prono]);

  for (const collaborator of collaborators[0]) {
    const evaluationsQuery = `
      SELECT s.stuno
      FROM \`student-project\`.evaluations e
      JOIN assignment a ON e.assno = a.assno
      JOIN collaborator c ON a.colno = c.colno
      JOIN student s ON a.stuno = s.stuno
      WHERE c.prono = ?
      ORDER BY e.ranking ASC`;
    
    const evaluations = await pool.query(evaluationsQuery, [prono]);
    const studentList = evaluations[0].map(e => e.stuno); // 獲取學生編號
    sortedLists.push(studentList);
  }
  
  // 合併排序
  return mergeRankings(sortedLists);
}

// 處理 share_type 為 2 的邏輯
async function handleShareType2(prono) {
  const allEvaluations = [];
  
  // 查詢協作老師的編號
  const [collaborators] = await pool.query('SELECT colno FROM collaborator WHERE prono = ?', [prono]);

  for (const collaborator of collaborators) {
    const evaluationsQuery = `
      SELECT c.colno, e.evano, e.ranking, s.stuno
      FROM \`student-project\`.evaluations e
      JOIN assignment a ON e.assno = a.assno
      JOIN collaborator c ON a.colno = c.colno
      JOIN student s ON a.stuno = s.stuno
      WHERE c.prono = ?
      ORDER BY e.ranking ASC`;
    
    // 查詢評估結果
    const [evaluations] = await pool.query(evaluationsQuery, [prono]);

    // 確保每個評估的 ranking 為數字，並確保 stuno 存在
    const validEvaluations = evaluations.map(evaluation => ({
      stuno: evaluation.stuno,
      ranking: parseInt(evaluation.ranking, 10) || 0  // 將 ranking 轉換為數字，如果無效則設為 0
    }));

    if (validEvaluations.length > 0) {
      allEvaluations.push({
        colno: collaborator.colno,
        allEvaluations: validEvaluations
      });
    }
  }

  // 確保加權排名的函數存在並正確使用
  if (typeof weightedRanking === 'function') {
    return weightedRanking(allEvaluations).map(evaluation => evaluation.stuno);
  } else {
    throw new Error('weightedRanking function is not defined.');
  }
}


// 提交合併排序並分配分數
router.post('/', async (req, res) => {
  const { prono } = req.body; // 從前端獲取 prono 和分數範圍

  try {
    // 1. 獲取錄取人數
    const projectQuery = 'SELECT admissions, share_type FROM `student-project`.project WHERE prono = ?';
    const projectResult = await pool.query(projectQuery, [prono]);
    const admissionCount = projectResult[0][0].admissions;

    // 2. 檢查錄取公平性
    const fairnessCheck = await checkAdmissionFairness(prono, admissionCount);
    // 如果不公平，返回錯誤提示並要求重新評分
    if (fairnessCheck.status === 'unfair') {
      return res.json({ success: false, message: fairnessCheck.message });
    }

    // 處理合併排序
    const share_type = projectResult[0][0].share_type; // 獲取 share_type
    let finalRankingList = [];
    if (share_type == 1) {
      finalRankingList = await handleShareType1(prono);
    } else if (share_type == 2) {
      finalRankingList = await handleShareType2(prono);
    }

    // 5. 分配分數（假設最高分 90，最低分 70）
    const scores = distributeScores(70, 90, finalRankingList.length);

    // 6. 插入或更新合併排序結果及其分數
    const insertPromises = finalRankingList.map((stuno, index) => {
      const final_rank = index + 1;
      const score = scores[index]; // 根據排序位置分配的分數
      const updateQuery = 'UPDATE `student-project`.`student` SET final_ranking = ?, final_score = ? WHERE stuno = ?';
      return pool.query(updateQuery, [final_rank, score, stuno]);
    
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '合併排序和分數分配成功儲存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
