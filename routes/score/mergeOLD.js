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

// 檢查錄取公平性，並返回多分配學生的資料
const checkAdmissionFairness = async (pro_no, admissionCount) => {
  // 1. 獲取協作老師總數
  const collaboratorQuery = 'SELECT COUNT(*) AS collaboratorCount FROM ESN.collaborators WHERE pro_no = ?';
  const collaboratorResult = await pool.query(collaboratorQuery, [pro_no]);
  const collaboratorCount = collaboratorResult[0][0].collaboratorCount;

  // 2. 計算每位老師應該錄取的學生數量
  const studentsPerTeacher = Math.floor(admissionCount / collaboratorCount);
  const remainderStudents = admissionCount % collaboratorCount; // 剩下的學生數

  // 如果有剩下的學生，這些學生分配不公平
  if (remainderStudents > 0) {
    // 查詢這些多分配到的學生資料
    const extraStudentsQuery = `
      SELECT s.stu_no
      FROM ESN.evaluations e
      JOIN assignment a ON a.ass_no = e.ass_no
      JOIN students s ON s.stu_no = a.stu_no
      JOIN collaborators c ON a.col_no = c.col_no
      WHERE c.pro_no = ? AND e.ranking = ?
      ORDER BY s.stu_no ASC
      ;
    `;

    // 獲取每位老師應多分配的學生
    const extraStudents = [];
    for (const collaborator of collaboratorResult[0]) {
      const [students] = await pool.query(extraStudentsQuery, [pro_no, studentsPerTeacher + 1, collaboratorCount]);
      // 將每位學生的學號推入 extraStudents 陣列
      students.forEach(student => {
        extraStudents.push(student.stu_no); // 只取學號
      });
    }

    return {
      status: 'unfair',
      message: `有${remainderStudents}名學生分配不公平，請重新評分這些學生。`,
      extraStudentsCount: remainderStudents,
      extraStudents: extraStudents // 包含多分配的學生資料
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
      collaborator.allEvaluations.forEach(({ stu_no, ranking }) => {
          // 初始化每位學生的分數
          if (!scores[stu_no]) {
              scores[stu_no] = { totalScore: 0, count: 0 }; // 初始化總分和計數
          }

          // 根據排名計算分數
          const adjustedScore = 1 / ranking; // 使用排名的反轉值作為分數
          scores[stu_no].totalScore += adjustedScore; // 累加分數
          scores[stu_no].count += 1; // 增加計數
      });
  });

  // 計算平均分數並排序
  const weightedScores = Object.entries(scores).map(([stu_no, { totalScore, count }]) => ({
      stu_no,
      finalScore: totalScore / count // 計算平均分數
  }));

  // 按照 finalScore 降序排序
  return weightedScores.sort((a, b) => b.finalScore - a.finalScore);
}

// 處理 share_type 為 1 的邏輯
async function handleShareType1(pro_no, phase2) {
  const sortedLists = [];
  const collaborators = await pool.query('SELECT col_no FROM collaborators WHERE pro_no = ?', [pro_no]);

  if(!phase2){
    for (const collaborator of collaborators[0]) {
      const evaluationsQuery = `
        SELECT s.stu_no
        FROM ESN.evaluations e
        JOIN assignment a ON e.ass_no = a.ass_no
        JOIN collaborators c ON a.col_no = c.col_no
        JOIN students s ON a.stu_no = s.stu_no
        WHERE c.pro_no = ?
        ORDER BY e.score ASC`;

      const evaluations = await pool.query(evaluationsQuery, [pro_no]);
      const studentList = evaluations[0].map(e => e.stu_no); // 獲取學生編號
      sortedLists.push(studentList);
    }

    // 合併排序
    return mergeRankings(sortedLists);
  }else{
    // 獲取協作老師總數
    const collaboratorQuery = 'SELECT COUNT(*) AS collaboratorCount FROM ESN.collaborators WHERE pro_no = ?';
    const collaboratorResult = await pool.query(collaboratorQuery, [pro_no]);
    const collaboratorCount = collaboratorResult[0][0].collaboratorCount;
    const admissionCount = collaboratorResult[0][0].admissionCount;

    // 計算每位老師應該錄取的學生數量
    const studentsPerTeacher = Math.floor(admissionCount / collaboratorCount);
    const pro = pro_no.slice(0, 3);

    // 查詢主輪分配的學生
    const studentsQuery = `
      SELECT s.stu_no
      FROM ESN.evaluations e
      JOIN assignment a ON a.ass_no = e.ass_no
      JOIN students s ON s.stu_no = a.stu_no
      JOIN collaborators c ON a.col_no = c.col_no
      WHERE c.pro_no = ? AND e.evano LIKE ?
      ORDER BY e.ranking ASC
      LIMIT ?;`;

    const allStudents = [];
    for (const collaborator of collaborators[0]) {
      // 查詢主輪分配的學生
      const [primaryStudents] = await pool.query(studentsQuery, [pro_no, `${pro}%`, studentsPerTeacher * collaboratorCount]);

      primaryStudents.forEach(student => {
        allStudents.push(student.stu_no); // 只取學號，推入 allStudents 陣列
      });
    }

    // 查詢額外分配的學生
    const extraStudentsQuery = `
      SELECT s.stu_no, e.ranking
      FROM ESN.evaluations e
      JOIN assignment a ON a.ass_no = e.ass_no
      JOIN students s ON s.stu_no = a.stu_no
      JOIN collaborators c ON a.col_no = c.col_no
      WHERE c.pro_no = ? AND e.evano LIKE '2%'
      ORDER BY e.ranking ASC;`;
    
    const extraEvaluations = [];
    const [additionalStudents] = await pool.query(extraStudentsQuery, [pro_no]);

    additionalStudents.forEach(student => {
      // 將每位學生和排名記錄進 `extraEvaluations`
      extraEvaluations.push({
        stu_no: student.stu_no,
        ranking: student.ranking
      });
    });

    // 使用 weightedRanking 函數進行加權排名
    const weightedFinalScores = weightedRanking([{ allEvaluations: extraEvaluations }]);
    
    // 計算要查詢的學生數量
    const allStudentQuery = `
      SELECT count(stu_no) FROM ESN.student WHERE pro_no = ?;`; // 這裡查詢所有學生的學號，根據您的實際情況調整
    const [allStudentRows] = await pool.query(allStudentQuery, [pro_no]);
    const totalStudents = allStudentRows[0].studentCount; // 獲取學生數量
    // 提取學號並計算數量
    const studentNumbers = weightedFinalScores.map(e => e.stu_no); // 提取學號
    const totalWeightedFinalScores = studentNumbers.length; // 獲取加權學生數量
    const totalAllStudents = allStudents.length; // allStudents 的數量

    const limitCount = totalStudents - totalWeightedFinalScores- totalAllStudents; // 查詢的總數量
    const offsetCount = (studentsPerTeacher + 1) * collaboratorCount; // 從這裡開始查詢
    
    // 查詢剩餘的學生
    const remainStudentsQuery = `
      SELECT s.stu_no
      FROM ESN.evaluations e
      JOIN assignment a ON a.ass_no = e.ass_no
      JOIN students s ON s.stu_no = a.stu_no
      JOIN collaborators c ON a.col_no = c.col_no
      WHERE c.pro_no = ? AND e.evano LIKE ?
      ORDER BY e.ranking ASC
      LIMTI ? OFFSET ?;`;
    
    const remainEvaluations = [];
    const [remainStudents] = await pool.query(remainStudentsQuery, [pro_no, `${pro}%`, limitCount, offsetCount]);
    remainStudents.forEach(student => {
      remainEvaluations.push(student.stu_no); // 只取學號，推入 allStudents 陣列
    });

    // 連接主輪分配的學生和額外分配的學生
    const finalStudentList = [...allStudents, ...weightedFinalScores.map(e => e.stu_no), ...remainEvaluations];

    return finalStudentList; // 返回最終學生列表
  }
}

// 處理 share_type 為 2 的邏輯
async function handleShareType2(pro_no) {
  const allEvaluations = [];
  
  // 查詢協作老師的編號
  const [collaborators] = await pool.query('SELECT col_no FROM collaborators WHERE pro_no = ?', [pro_no]);

  for (const collaborator of collaborators) {
    const evaluationsQuery = `
      SELECT c.col_no, e.evano, e.ranking, s.stu_no
      FROM ESN.evaluations e
      JOIN assignment a ON e.ass_no = a.ass_no
      JOIN collaborators c ON a.col_no = c.col_no
      JOIN students s ON a.stu_no = s.stu_no
      WHERE c.pro_no = ?
      ORDER BY e.ranking ASC`;
    
    // 查詢評估結果
    const [evaluations] = await pool.query(evaluationsQuery, [pro_no]);

    // 確保每個評估的 ranking 為數字，並確保 stu_no 存在
    const validEvaluations = evaluations.map(evaluation => ({
      stu_no: evaluation.stu_no,
      ranking: parseInt(evaluation.ranking, 10) || 0  // 將 ranking 轉換為數字，如果無效則設為 0
    }));

    if (validEvaluations.length > 0) {
      allEvaluations.push({
        col_no: collaborator.col_no,
        allEvaluations: validEvaluations
      });
    }
  }

  // 確保加權排名的函數存在並正確使用
  if (typeof weightedRanking === 'function') {
    return weightedRanking(allEvaluations).map(evaluation => evaluation.stu_no);
  } else {
    throw new Error('weightedRanking function is not defined.');
  }
}


// 提交合併排序並分配分數
router.post('/', async (req, res) => {
  const { pro_no } = req.body; // 從前端獲取 pro_no 和分數範圍

  try {
    // 1. 獲取錄取人數
    const projectQuery = 'SELECT admissions, phase2, share_type FROM ESN.project WHERE pro_no = ?';
    const projectResult = await pool.query(projectQuery, [pro_no]);
    const admissionCount = projectResult[0][0].admissions;
    const phase2 = projectResult[0][0].phase2;

    if (!phase2){
      // 2. 檢查錄取公平性
      const fairnessCheck = await checkAdmissionFairness(pro_no, admissionCount);
      // 如果不公平，返回錯誤提示並要求重新評分
      if (fairnessCheck.status === 'unfair') {
        return res.json({ 
          success: false, 
          message: fairnessCheck.message,
          extraStudents: fairnessCheck.extraStudents // 返回多分配的學生資料
        });
      }
    }else{
      // 處理合併排序
      const share_type = projectResult[0][0].share_type; // 獲取 share_type
      let finalRankingList = [];
      if (share_type == 1) {
        finalRankingList = await handleShareType1(pro_no, phase2);
      } else if (share_type == 2) {
        finalRankingList = await handleShareType2(pro_no);
      }

      // 5. 分配分數（假設最高分 90，最低分 70）
      const scores = distributeScores(70, 90, finalRankingList.length);

      // 6. 插入或更新合併排序結果及其分數
      const insertPromises = finalRankingList.map((stu_no, index) => {
        const final_rank = index + 1;
        const score = scores[index]; // 根據排序位置分配的分數
        const isAdmitted = final_rank <= admissionCount ? '錄取' : '未錄取'; // 根據錄取人數決定是否錄取
        const updateQuery = 'UPDATE ESN.`student` SET final_ranking = ?, final_score = ?, admit = ? WHERE stu_no = ?';

        // 使用 final_rank, score, 和 isAdmitted 更新資料庫
        return pool.query(updateQuery, [final_rank, score, isAdmitted, stu_no]);
      });

      await Promise.all(insertPromises);

      res.json({ success: true, message: '合併排序和分數分配成功儲存' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
