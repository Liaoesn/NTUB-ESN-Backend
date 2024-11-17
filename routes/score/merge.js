const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 等距分配分數函數
function distributeScores(min, max, numberOfPeople) {
  const scores = [];
  const step = (max - min) / (numberOfPeople - 1);

  for (let i = 0; i < numberOfPeople; i++) {
    const score = max - i * step;
    scores.push(parseFloat(score.toFixed(2)));
  }

  return scores;
}

// 計算 Z-score 的函數
function calculateZScores(scores) {
  const scoresArray = scores.map(score => score.score);
  const mean = scoresArray.reduce((acc, score) => acc + score, 0) / scoresArray.length;
  const variance = scoresArray.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scoresArray.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return scores.map(score => ({
      stu_no: score.stu_no,
      zScore: 0
    }));
  }

  return scores.map(score => ({
    stu_no: score.stu_no,
    zScore: (score.score - mean) / stdDev
  }));
}

// 查詢學生的協作老師評分，並計算 Z-score
async function getStudentScoresAndRank(pro_no, phase) {
  const query = `
    SELECT a.stu_no, e.score, a.ass_no, c.col_no
    FROM ESN.evaluations e
    JOIN assignments a ON e.ass_no = a.ass_no
    JOIN collaborators c ON a.col_no = c.col_no
    WHERE c.pro_no = ? AND e.phase = ?
  `;
  const [students] = await pool.query(query, [pro_no, phase]);

  const teacherScores = {};
  students.forEach(row => {
    if (!teacherScores[row.col_no]) {
      teacherScores[row.col_no] = [];
    }
    teacherScores[row.col_no].push({ stu_no: row.stu_no, score: row.score });
  });

  let zScores = [];
  for (const col_no in teacherScores) {
    const scores = teacherScores[col_no];
    const teacherZScores = calculateZScores(scores);
    zScores = zScores.concat(teacherZScores);
  }

  const studentZScores = {};
  zScores.forEach(score => {
    if (!studentZScores[score.stu_no]) {
      studentZScores[score.stu_no] = [];
    }
    studentZScores[score.stu_no].push(score.zScore);
  });

  return Object.keys(studentZScores).map(stu_no => {
    const scores = studentZScores[stu_no];
    const avgZScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;
    return { stu_no, avgZScore };
  }).sort((a, b) => b.avgZScore - a.avgZScore);
}

// 合併排序邏輯
async function mergeSort(pro_no, admissionCount, phase2Exists) {
  const firstSort = await getStudentScoresAndRank(pro_no, 1);

  if (!phase2Exists) {
    return firstSort;
  }

  const secondSort = await getStudentScoresAndRank(pro_no, 2);
  // 找出在第一階段與第二階段中重複的學生
  const duplicatedStudents = firstSort.filter(student =>
    secondSort.some(s => s.stu_no === student.stu_no)
  );

  // 找到重複學生在第一階段的索引位置
  const duplicatedIndices = duplicatedStudents.map(student =>
    firstSort.findIndex(s => s.stu_no === student.stu_no)
  );

  // 將第二階段的排序結果按索引插入到第一階段中
  const resultSort = [...firstSort];
  duplicatedIndices.forEach((index, i) => {
    resultSort[index] = secondSort[i];
  });

  return resultSort;
}

// 路由處理函數
router.post('/', async (req, res) => {
  const { pro_no } = req.body;
  try {
    const projectQuery = 'SELECT admissions, phase2 FROM ESN.projects WHERE pro_no = ?';
    const [projectResult] = await pool.query(projectQuery, [pro_no]);
    const { admissions: admissionCount, phase2 } = projectResult[0];

    const sortedStudents = await mergeSort(pro_no, admissionCount, !!phase2);
    const finalRankingList = sortedStudents.map(student => student.stu_no);
    const scores = distributeScores(70, 90, finalRankingList.length);

    const needsReevaluation = []; // 保存需要重新評分的學生
    let hasIssues = false; // 用來標記是否有需要重新評分的情況

    const insertPromises = finalRankingList.map((stu_no, index) => {
      const final_rank = index + 1;
      const score = scores[index];
      let isAdmitted = '未錄取';

      // 處理邊界情況：當學生的排名在錄取名額上界
      if (final_rank === admissionCount) {
        // 找出與第 admissionCount 名分數相同的學生
        const sameScoreStudents = sortedStudents.filter(s => s.avgZScore === sortedStudents[index].avgZScore);
        if (sameScoreStudents.length > 1) {
          // 如果有多名同分學生，標記需要重新評分
          needsReevaluation.push(...sameScoreStudents);
          isAdmitted = '需要重新評分';
          hasIssues = true;
        } else {
          // 邊界學生沒有同分情況，標記為錄取
          isAdmitted = '錄取';
        }
      } else if (final_rank <= admissionCount) {
        // 其他排名達到錄取名額的學生
        isAdmitted = '錄取';
      }

      // 只有當學生不需要重新評分時才更新資料庫
      if (isAdmitted !== '需要重新評分') {
        const updateQuery = 'UPDATE ESN.students SET final_ranking = ?, final_score = ?, admit = ? WHERE stu_no = ?';
        return pool.query(updateQuery, [final_rank, score, isAdmitted, stu_no]);
      }

      return Promise.resolve(); // 不更新資料庫
    });

    await Promise.all(insertPromises);

    // 根據是否有問題來回應
    if (hasIssues) {
      // 有問題，回傳需要重新評分的學生
      res.json({
        success: false,
        message: '存在需要重新評分的情況',
        needsReevaluation: needsReevaluation
      });
    } else {
      // 沒問題，成功儲存所有結果
      res.json({
        success: true,
        message: '合併排序和分數分配成功儲存'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;
