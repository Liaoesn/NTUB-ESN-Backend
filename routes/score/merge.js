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

// 計算 Z-score 的函數
function calculateZScores(scores) {
  const scoresArray = scores.map(score => score.score);
  const mean = scoresArray.reduce((acc, score) => acc + score, 0) / scoresArray.length;
  const variance = scoresArray.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scoresArray.length;
  const stdDev = Math.sqrt(variance);

  const zScores = scores.map(score => {
    const zScore = (score.score - mean) / stdDev;
    return {
      stu_no: score.stu_no,
      zScore: zScore
    };
  });

  return zScores;
}

// 查詢學生的協作老師評分，並計算 Z-score
async function getStudentScoresAndRank(pro_no) {
  try {
    // 查詢學生和協作老師的評分資料，根據 col_no 查詢
    const studentsQuery = `
        SELECT a.stu_no, e.score, a.ass_no, c.col_no
        FROM ESN.evaluations e
        JOIN assignments a ON e.ass_no = a.ass_no
        JOIN collaborators c ON a.col_no = c.col_no
        WHERE c.pro_no = ?`;

    const [students] = await pool.query(studentsQuery, [pro_no]);

    // 根據老師 col_no 分組，將每位老師的評分資料聚合在一起
    const teacherScores = {};
    students.forEach(row => {
      if (!teacherScores[row.col_no]) {
        teacherScores[row.col_no] = [];
      }
      teacherScores[row.col_no].push({ stu_no: row.stu_no, score: row.score });
    });

    // 計算每位老師的 Z-score
    let zScores = [];
    for (const col_no in teacherScores) {
      const scores = teacherScores[col_no];
      const teacherZScores = calculateZScores(scores);
      zScores = zScores.concat(teacherZScores);
    }

    // 根據學生編號來計算每個學生的平均 Z-score
    const studentZScores = {};

    zScores.forEach(score => {
      if (!studentZScores[score.stu_no]) {
        studentZScores[score.stu_no] = [];
      }
      studentZScores[score.stu_no].push(score.zScore);
    });

    // 計算每位學生的平均 Z-score
    const averageZScores = Object.keys(studentZScores).map(stu_no => {
      const scores = studentZScores[stu_no];
      const avgZScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;
      return { stu_no, avgZScore };
    });

    // 根據平均 Z-score 排序學生，從高到低排序
    const sortedStudents = averageZScores.sort((a, b) => b.avgZScore - a.avgZScore);

    return sortedStudents;
  } catch (err) {
    throw new Error('Database query failed: ' + err.message);
  }
}

// 設置路由處理函數
router.get('/', async (req, res) => {
  const pro_no = req.body.pro_no;

  try {
    const projectQuery = 'SELECT admissions, phase2, share_type FROM ESN.projects WHERE pro_no = ?';
    const projectResult = await pool.query(projectQuery, [pro_no]);
    const admissionCount = projectResult[0][0].admissions;

    const sortedStudents = await getStudentScoresAndRank(pro_no);
    const finalRankingList = sortedStudents.map(student => student.stu_no); // 獲取排名列表

    // 假設最高分 90，最低分 70，根據排名分配分數
    const scores = distributeScores(70, 90, finalRankingList.length);

    // 插入或更新合併排序結果及其分數
    const insertPromises = finalRankingList.map((stu_no, index) => {
      const final_rank = index + 1;
      const score = scores[index];
      const isAdmitted = final_rank <= admissionCount ? '錄取' : '未錄取'; 
      const updateQuery = 'UPDATE ESN.students SET final_ranking = ?, final_score = ?, admit = ? WHERE stu_no = ?';

      return pool.query(updateQuery, [final_rank, score, isAdmitted, stu_no]);
    });

    await Promise.all(insertPromises);

    res.json({ success: true, message: '合併排序和分數分配成功儲存' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;
