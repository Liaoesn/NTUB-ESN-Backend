const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');


router.get('/:prono', async (req, res) => {
  try {
    const { prono } = req.query;
    const docnumber = await pool.query(
      'SELECT COUNT(*) AS total_students FROM `student-project`.`student` WHERE `prono` = ? ;', [prono]
    )
    const [teacher] = await pool.query(
    'SELECT  u.username FROM `student-project`.collaborator as c left JOIN `student-project`.user as u ON c.userno = u.userno WHERE c.prono = ?;', [prono]
    )
    const [ProjectRows] =
      await pool.query(
        'SELECT prono, proname, prodescription, phase1, endDate, share_type, admissions FROM `student-project`.project WHERE `prono` = ? ;', [prono]);
    ProjectRows.push(docnumber[0][0])
    ProjectRows.push({'teachers':teacher})
    console.log(ProjectRows)
    if (ProjectRows.length === 0) {
      return res.status(404).json({ error: '未找到此專案' });
    }

    res.json(ProjectRows);
  } catch (error) {
    console.error('查詢資料時發生錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});


// 專案名稱, 學制
router.post('/name', async (req, res) => {
  const { title, prodescription } = req.body;  // 接收從前端傳來的資料
  const { prono } = req.query;  // 從 query 參數中取得 prono

  // 檢查是否有 prono 和要更新的內容
  if (!prono) {
    return res.status(400).json({ message: 'prono is required' });
  }
  if (!title || !prodescription) {
    return res.status(400).json({ message: 'title and prodescription are required' });
  }

  try {
    // 更新 MySQL 數據庫中的 project 表
    const sql = `UPDATE \`student-project\`.\`project\` SET proname = ?, prodescription = ? WHERE prono = ?`;
    const values = [title, prodescription, prono];
    await pool.query(sql, values);

    res.status(200).json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});


// 第一階段, 結束日期
router.get('/date', async (req, res) => {
  const { phase1, endDate, prono } = req.query; // 增加 prono 參數
  let updates = [];
  let params = [];

  if (phase1) {
    updates.push('phase1 = ?');
    params.push(phase1);
  }

  if (endDate) {
    updates.push('enddate = ?');
    params.push(endDate);
  }

  // 確保有查詢和參數
  if (updates.length === 0) {
    return res.status(400).send('沒有提供更新參數');
  }

  const query = `UPDATE \`student-project\`.\`project\` SET ${updates.join(', ')} WHERE prono = ?`;
  params.push(prono); // 將 prono 加入參數

  try {
    const [result] = await pool.query(query, params);
    res.json({ message: '更新成功', result });
  } catch (error) {
    console.error('Error in database query:', error);
    res.status(500).send('Error updating project data');
  }
});


// 錄取人數
router.get('/admissions', async (req, res) => {
  const { admissions, prono } = req.query; // 增加 prono 參數
  let updates = [];
  let params = [];

  if (admissions) {
    updates.push('admissions = ?');
    params.push(admissions);
  }

  // 確保有查詢和參數
  if (updates.length === 0) {
    return res.status(400).send('沒有提供更新參數');
  }

  const query = `UPDATE \`student-project\`.\`project\` SET ${updates.join(', ')} WHERE prono = ?`;
  params.push(prono); // 將 prono 加入參數

  try {
    const [result] = await pool.query(query, params);
    res.json({ message: '更新成功', result });
  } catch (error) {
    console.error('Error in database query:', error);
    res.status(500).send('Error updating project data');
  }

});


// 添加協作老師的功能
async function addCollaborators(prono, usernoArray) {
  try {
    const connection = await pool.getConnection();

    // 開始交易
    await connection.beginTransaction();

    // 查詢該 prono 已經有的 colno
    const [rows] = await connection.query('SELECT colno FROM `student-project`.`collaborator`  WHERE prono = ?', [prono]);

    // 找到目前最大的後兩位數，若無資料則從 0 開始
    let maxSuffix = 0;
    if (rows.length > 0) {
      rows.forEach(row => {
        const suffix = parseInt(row.colno.slice(-2)); // 取得 colno 的最後兩位數
        if (suffix > maxSuffix) {
          maxSuffix = suffix; // 找出目前最大的後兩位數
        }
      });
    }

    // 準備插入語句
    const insertQuery = 'INSERT INTO `student-project`.`collaborator` (colno, prono, userno) VALUES (?, ?, ?)';

    // 對於每個 userno，生成新的 colno
    for (const userno of usernoArray) {
      // 手動生成 colno：前面是 prono，後面是兩位數的遞增數字
      const newSuffix = maxSuffix + 1; // 新的
      const colno = `${prono}${String(newSuffix).padStart(2, '0')}`; // 確保兩位數格式

      // 插入資料
      await connection.query(insertQuery, [colno, prono, userno]);

      // 更新 maxSuffix
      maxSuffix = newSuffix;
    }

    // 查詢有該 prono 的學生
    const [students] = await connection.query('SELECT stuno FROM `student-project`.`student` WHERE prono = ?', [prono]);

    // 生成 assno 的邏輯，依照 addAssignmentInDb 的規則
    const currentDate = new Date();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // 取得當前月份
    let assNoPrefix = prono.slice(0, 3); // prono 的前三位
    let assNo = `${assNoPrefix}${currentMonth}100`; // 假設 assno 以 prono 前三位 + 當前月份 + 序號 100 開始

    const [existingAssignments] = await connection.query('SELECT assno FROM `student-project`.`assignment` WHERE assno LIKE ?', [`${assNoPrefix}${currentMonth}%`]);

    // 獲取現有分配的最大序號
    let maxAssSuffix = 100;
    if (existingAssignments.length > 0) {
      maxAssSuffix = Math.max(...existingAssignments.map(a => parseInt(a.assno.slice(-3))));
    }

    // 計算每個老師應分配的學生數量
    const studentsPerTeacher = Math.floor(students.length / newColnos.length);
    let remainingStudents = students.length % newColnos.length; // 分配剩餘的學生

    let studentIndex = 0;
    const assignmentQuery = 'INSERT INTO `student-project`.`assignment` (assno, colno, stuno) VALUES (?, ?, ?)';
    const evaluationQuery = 'INSERT INTO `student-project`.`evaluation` (evano, assno) VALUES (?, ?)';

    // 平均分配學生
    for (const colno of newColnos) {
      for (let i = 0; i < studentsPerTeacher; i++) {
        const newAssNo = `${assNoPrefix}${currentMonth}${String(maxAssSuffix + 1).padStart(3, '0')}`; // 生成新的 assno
        await connection.query(assignmentQuery, [newAssNo, colno, students[studentIndex].stuno]);

        // 生成 evano 規則為 assno 後加固定數 5
        const evaNo = `${newAssNo}5`;
        await connection.query(evaluationQuery, [evaNo, newAssNo]);

        maxAssSuffix++; // 增加 assno 序號
        studentIndex++;
      }

      // 如果有剩餘學生，額外分配一個給該老師
      if (remainingStudents > 0) {
        const newAssNo = `${assNoPrefix}${currentMonth}${String(maxAssSuffix + 1).padStart(3, '0')}`;
        await connection.query(assignmentQuery, [newAssNo, colno, students[studentIndex].stuno]);

        const evaNo = `${newAssNo}5`;
        await connection.query(evaluationQuery, [evaNo, newAssNo]);

        maxAssSuffix++; // 增加 assno 序號
        studentIndex++;
        remainingStudents--;
      }
    }

    // 提交交易
    await connection.commit();
    console.log('Collaborators added successfully!');

    connection.release();
  } catch (error) {
    console.error('Error adding collaborators:', error);
    if (connection) await connection.rollback();
  }
}

router.get('/search/teacher', async (req, res) => {
  try {
    const prono = req.query.prono;
    const teacher = []; // 从 req.params 获取 prono
    const [teacherDB] = await pool.query(
      'SELECT userno,username,permissions FROM `student-project`.user where  permissions = 0;'
      // ?'SELECT c.colno,c.userno,s.usernae FROM `student-project`.collaborator c JOIN `student-project`.user s ON c.userno = s.userno WHERE c.prono = ?', [prono]
    );
    const [ready] = await pool.query(
      'SELECT colno, userno FROM `student-project`.collaborator where prono = ?',[prono]
    )
    
    teacher.push({'ready':ready})
    teacher.push({'teacherDB':teacherDB})
    console.log(teacher)
    console.log(prono)

    if (teacher.length === 0) {
      return res.status(404).json({ error: '未找此專案' }); // 使用 rows 来判断是否为空
    }

    res.json(teacher); // 返回查询到的所有数据
  } catch (error) {
    console.error('查詢資料時發生錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

router.post('/update/teacher', async (req, res) => {
  const { changeUser } = req.body; // 接收到的變更用戶列表
const { prono } = req.query; // 專案編號

if (!changeUser || !prono) {
  return res.status(400).json({ error: '缺少必要的資料' });
}

try {
  const [alreadyRows] = await pool.query(
    'SELECT colno,userno FROM `student-project`.collaborator WHERE prono = ?', [prono]
  );
  const already = alreadyRows.map(row => row.userno);
  const allcolno = alreadyRows.map(row => parseInt(row.colno));

  const missing = already.filter(userno => !changeUser.map(user => user).includes(userno));
  console.log('缺少的教師 userno:', missing);

  if (missing.length > 0) {
    await pool.query(
      'DELETE FROM `student-project`.collaborator WHERE prono = ? AND userno IN (?)',
      [prono, missing]
    );
    console.log('已刪除的教師:', missing);
  }

  const extra = changeUser.filter(user => !already.includes(user));

  console.log('多出來的教師 userno:', extra);

  if (extra.length > 0) {
    const values = extra.map((userno,index) => [
      // console.log(index);
      parseInt(`${prono}${allcolno.length>1 ? parseInt((Math.max(...allcolno)).toString().slice(-1))+index+1: (parseInt(index)+1) }`), prono, userno]); // 構造插入數據
    await pool.query(
      'INSERT INTO `student-project`.collaborator (colno, prono, userno) VALUES ?', [values]
    );
    console.log('已新增的教師:', values);
  }

  return res.status(200).json({
    message: '操作成功',
    added: extra,
    deleted: missing
  });

} catch (error) {
  console.error('伺服器錯誤:', error);
  return res.status(500).json({ error: '伺服器錯誤' });
}});





module.exports = router;