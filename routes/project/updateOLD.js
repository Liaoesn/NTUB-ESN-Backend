const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');


router.get('/:pro_no', async (req, res) => {
  try {
    const { pro_no } = req.query;
    const docnumber = await pool.query(
      'SELECT COUNT(*) AS total_students FROM ESN.students WHERE `pro_no` = ? ;', [pro_no]
    )
    const [teacher] = await pool.query(
    'SELECT  u.user_name FROM ESN.collaborators as c left JOIN ESN.users as u ON c.user_no = u.user_no WHERE c.pro_no = ?;', [pro_no]
    )
    const [ProjectRows] =
      await pool.query(
        'SELECT pro_no, pro_name, pro_academic, phase1, end_date, share_type, admissions FROM ESN.projects WHERE `pro_no` = ? ;', [pro_no]);
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
  const { title, pro_academic } = req.body;  // 接收從前端傳來的資料
  const { pro_no } = req.query;  // 從 query 參數中取得 pro_no

  // 檢查是否有 pro_no 和要更新的內容
  if (!pro_no) {
    return res.status(400).json({ message: 'pro_no is required' });
  }
  if (!title || !prodescription) {
    return res.status(400).json({ message: 'title and prodescription are required' });
  }

  try {
    // 更新 MySQL 數據庫中的 projects 表
    const sql = `UPDATE ESN.projects SET pro_name = ?, pro_academic = ? WHERE pro_no = ?`;
    const values = [title, prodescription, pro_no];
    await pool.query(sql, values);

    res.status(200).json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// 第一階段, 結束日期
router.post('/date', async (req, res) => {
  const { phase1, endDate, pro_no } = req.body; // 增加 pro_no 參數
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

  const query = `UPDATE ESN.\`project\` SET ${updates.join(', ')} WHERE pro_no = ?`;
  params.push(pro_no); // 將 pro_no 加入參數

  try {
    const [result] = await pool.query(query, params);
    res.json({ message: '更新成功', result });
  } catch (error) {
    console.error('Error in database query:', error);
    res.status(500).send('Error updating project data');
  }
});

// 錄取人數
router.post('/admissions', async (req, res) => {
  const { admissions, pro_no } = req.body; // 取得 admissions 和 pro_no

  // SQL 更新語句
  const query = `UPDATE ESN.\`project\` SET admissions = ? WHERE pro_no = ?`;

  if (admissions) {
    try {
      // 執行查詢，並將結果存入 result 變數
      const [result] = await pool.query(query, [admissions, pro_no]);

      // 檢查是否有更新行數 (affectedRows)
      if (result.affectedRows > 0) {
        res.json({ message: '更新成功', result });
      } else {
        res.status(404).json({ message: '項目未找到' });
      }
    } catch (error) {
      console.error('Error in database query:', error);
      res.status(500).send('更新專案資料時發生錯誤');
    }
  } else {
    return res.status(400).json({ message: 'admissions 是必填欄位' });
  }
});
router.post('/type', async (req, res) => {
  const { type, pro_no } = req.body; // 取得 type 和 pro_no

  // SQL 更新語句
  const query = `UPDATE ESN.\`project\` SET share_type = ? WHERE pro_no = ?`;

  if (type) {
    try {
      // 執行查詢，並將結果存入 result 變數
      const [result] = await pool.query(query, [type, pro_no]);

      // 檢查是否有更新行數 (affectedRows)
      if (result.affectedRows > 0) {
        res.json({ message: '更新成功', result });
      } else {
        res.status(404).json({ message: '項目未找到' });
      }
    } catch (error) {
      console.error('Error in database query:', error);
      res.status(500).send('更新專案資料時發生錯誤');
    }
  } else {
    return res.status(400).json({ message: '有資料為空' });
  }
});



async function AssEvaInDb(pro_no) {
  try {
    const connection = await pool.getConnection();

    // 查詢 project 資料表中的 share_type
    const [projectRows] = await connection.query(
      'SELECT share_type FROM project WHERE pro_no = ?',
      [pro_no]
    );
    
    if (projectRows.length === 0) {
      throw new Error(`No project found with pro_no: ${pro_no}`);
    }

    const shareType = projectRows[0].share_type;

    // 使用 COUNT 查詢此 pro_no 下的學生總數
    const [studentCountResult] = await connection.query(
      'SELECT COUNT(*) AS studentCount FROM student WHERE pro_no = ?',
      [pro_no]
    );
    const studentCount = studentCountResult[0].studentCount;

    if (studentCount === 0) {
      throw new Error(`No students found with pro_no: ${pro_no}`);
    }

    // 使用 COUNT 查詢與此 pro_no 有關的教師總數
    const [collaboratorCountResult] = await connection.query(
      'SELECT COUNT(*) AS collaboratorCount FROM collaborator WHERE pro_no = ?',
      [pro_no]
    );
    const collaboratorCount = collaboratorCountResult[0].collaboratorCount;

    if (collaboratorCount === 0) {
      throw new Error(`No collaborators found with pro_no: ${pro_no}`);
    }

    // 獲取所有學生和協作老師的資料
    const [students] = await connection.query(
      'SELECT stuno FROM student WHERE pro_no = ?',
      [pro_no]
    );
    const [collaborators] = await connection.query(
      'SELECT colno FROM collaborator WHERE pro_no = ?',
      [pro_no]
    );

    let assnoCounter = 100;
    const currentMonth = new Date().getMonth() + 1; // 取得當前月份
    const pro_noPrefix = pro_no.toString().substring(0, 3); // pro_no 前三位

    if (shareType === 1) {
      // 平均分配學生給每個協作老師
      const studentsPerTeacher = Math.floor(studentCount / collaboratorCount);
      let extraStudents = studentCount % collaboratorCount;
      let studentIndex = 0;

      for (const collaborator of collaborators) {
        const assignedStudents = students.slice(
          studentIndex,
          studentIndex + studentsPerTeacher
        );

        // 將學生分配給此協作老師
        for (const student of assignedStudents) {
          const assno = `${pro_noPrefix}${currentMonth}${assnoCounter}`;
          await connection.query(
            'INSERT INTO assignment (stuno, colno, assno) VALUES (?, ?, ?)',
            [student.stuno, collaborator.colno, assno]
          );

          const evano = `${assno}5`; // 產生 evano
          await connection.query(
            'INSERT INTO evaluations (assno, evano) VALUES (?, ?)',
            [assno, evano]
          );

          assnoCounter++;
        }

        studentIndex += studentsPerTeacher;
      }

      // 隨機分配剩餘的學生
      while (extraStudents > 0) {
        const randomIndex = Math.floor(Math.random() * collaboratorCount);
        const randomCollaborator = collaborators[randomIndex];
        const extraStudent = students[studentIndex];

        const assno = `${pro_noPrefix}${currentMonth}${assnoCounter}`;
        await connection.query(
          'INSERT INTO assignment (stuno, colno, assno) VALUES (?, ?, ?)',
          [extraStudent.stuno, randomCollaborator.colno, assno]
        );

        const evano = `${assno}5`; // 產生 evano
        await connection.query(
          'INSERT INTO evaluations (assno, evano) VALUES (?, ?)',
          [assno, evano]
        );

        assnoCounter++;
        studentIndex++;
        extraStudents--;
      }
    } else if (shareType === 2) {
      // 將每個學生分配給每個協作老師
      for (const student of students) {
        for (const collaborator of collaborators) {
          const assno = `${pro_noPrefix}${currentMonth}${assnoCounter}`;
          await connection.query(
            'INSERT INTO assignment (stuno, colno, assno) VALUES (?, ?, ?)',
            [student.stuno, collaborator.colno, assno]
          );

          const evano = `${assno}5`; // 產生 evano
          await connection.query(
            'INSERT INTO evaluations (assno, evano) VALUES (?, ?)',
            [assno, evano]
          );
          
          assnoCounter++;
        }
      }
    }

    console.log('Students assigned successfully!');
  } catch (err) {
    console.error('Error assigning students:', err.message);
  }
}

router.get('/search/teacher', async (req, res) => {
  try {
    const pro_no = req.query.pro_no;
    const teacher = []; // 从 req.params 获取 pro_no
    const [teacherDB] = await pool.query(
      'SELECT user_no,username,permissions FROM ESN.user where  permissions = 0;'
      // ?'SELECT c.colno,c.user_no,s.usernae FROM ESN.collaborator c JOIN ESN.user s ON c.user_no = s.user_no WHERE c.pro_no = ?', [pro_no]
    );
    const [ready] = await pool.query(
      'SELECT colno, user_no FROM ESN.collaborator where pro_no = ?',[pro_no]
    )
    
    teacher.push({'ready':ready})
    teacher.push({'teacherDB':teacherDB})
    console.log(teacher)
    console.log(pro_no)

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
const { pro_no } = req.query; // 專案編號

if (!changeUser || !pro_no) {
  return res.status(400).json({ error: '缺少必要的資料' });
}

try {
  const [alreadyRows] = await pool.query(
    'SELECT colno,user_no FROM ESN.collaborator WHERE pro_no = ?', [pro_no]
  );
  const already = alreadyRows.map(row => row.user_no);
  const allcolno = alreadyRows.map(row => parseInt(row.colno));

  const missing = already.filter(user_no => !changeUser.map(user => user).includes(user_no));
  console.log('缺少的教師 user_no:', missing);

  if (missing.length > 0) {
    await pool.query(
      'DELETE FROM ESN.collaborator WHERE pro_no = ? AND user_no IN (?)',
      [pro_no, missing]
    );
    console.log('已刪除的教師:', missing);
  }

  const extra = changeUser.filter(user => !already.includes(user));

  console.log('多出來的教師 user_no:', extra);

  if (extra.length > 0) {
    const values = extra.map((user_no,index) => [
      // console.log(index);
      parseInt(`${pro_no}${allcolno.length>1 ? parseInt((Math.max(...allcolno)).toString().slice(-1))+index+1: (parseInt(index)+1) }`), pro_no, user_no]); // 構造插入數據
    await pool.query(
      'INSERT INTO ESN.collaborator (colno, pro_no, user_no) VALUES ?', [values]
    );
    console.log('已新增的教師:', values);
  }

  // 調用 AssEvaInDb 函數
  await AssEvaInDb(pro_no);

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