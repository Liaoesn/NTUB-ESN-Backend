const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 學生分配給老師並更新評分表 API
router.post('/', async (req, res) => {
  try {
    const { stu_no, col_no, teachersPerStudent } = req.body;
    const distributionRound = 1; // 這是第一次分配

    // 驗證資料
    if (!Array.isArray(stu_no) || !Array.isArray(col_no)) {
      return res.status(400).json({ error: '學生與老師資料需為陣列' });
    }
    if (teachersPerStudent <= 0) {
      return res.status(400).json({ error: '每位學生需要分配的老師數量必須大於 0' });
    }
    if (col_no.length < teachersPerStudent) {
      return res.status(400).json({ error: '老師數量不足以分配給每位學生' });
    }

    const assignments = [];
    
    // 分配邏輯
    for (let i = 0; i < stu_no.length; i++) {
      const assignedTeachers = [];
      for (let j = 0; j < teachersPerStudent; j++) {
        // 按順序分配老師，使用循環機制
        const teacher = col_no[(i + j) % col_no.length];
        assignedTeachers.push(teacher);
      }
      assignments.push({ student: stu_no[i], teachers: assignedTeachers });
    }

    // 儲存分配資料並更新評分表
    for (const assignment of assignments) {
      const studentId = assignment.student;
      for (const teacher of assignment.teachers) {
        // 插入到 `assignments` 表，使用返還的 `ass_no`
        const [result] = await pool.query(
          'INSERT INTO ESN.assignments (stu_no, col_no) VALUES (?, ?)',
          [studentId, teacher]
        );

        const ass_no = result.insertId; // 獲取插入的 `ass_no`

        // 插入到 `evaluations` 表
        await pool.query(
          'INSERT INTO ESN.evaluations (ass_no, phase) VALUES (?, ?)',
          [ass_no, distributionRound] // phase 為 1
        );
      }
    }

    res.status(200).json({ message: '分配並更新評分表完成', assignments });
  } catch (error) {
    console.error('分配過程發生錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
