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
router.get('/name', async (req, res) => {
  const { proname, academic } = req.query;

  let updates = [];
  let params = [];

  if (proname) {
    updates.push('proname = ?');
    params.push(proname);
  }

  if (academic) {
    updates.push('prodescription = ?');
    params.push(academic);
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

    // 提交交易
    await connection.commit();
    console.log('Collaborators added successfully!');

    connection.release();
  } catch (error) {
    console.error('Error adding collaborators:', error);
    if (connection) await connection.rollback();
  }
}


// 協作老師
router.get('/teacher', async (req, res) => {
  const { prono, userno } = req.query; // 從請求的 body 中獲取 prono 和 userno

  // 檢查 prono 是否存在，userno 是否存在且有效
  if (!prono || !userno) {
    return res.status(400).json({ error: '請提供有效的 prono 和 userno' });
  }

  // 將 userno 包裝成陣列
  const usernoArray = Array.isArray(userno) ? userno : [userno];

  try {
    await addCollaborators(prono, usernoArray);
    res.json({ message: '協作老師添加成功', result });
  } catch (error) {
    console.error('Error in adding collaborators:', error);
    res.status(500).json({ error: '添加協作老師時發生錯誤' });
  }
});

// 新增分配
const addAssignmentInDb = async (prono) => {
    const connection = await pool.getConnection();
    
    try {
        // 開始交易
        await connection.beginTransaction();

        // 查詢該 prono 的 colno 和 stuno
        const [collaborators] = await connection.query('SELECT colno FROM `student-project`.`collaborator` WHERE prono = ?', [prono]);
        const [students] = await connection.query('SELECT stuno FROM `student-project`.`student` WHERE prono = ?', [prono]);

        // 檢查是否有 collaborators 和 students
        if (collaborators.length === 0 || students.length === 0) {
            throw new Error('沒有找到任何協作老師或學生');
        }

        // 取得當前月份
        const currentDate = new Date();
        const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // 取得當前月份並轉為兩位數

        // 生成 assno
        let assNoPrefix = prono.slice(0, 3); // prono 的前三位
        let assNo = `${assNoPrefix}${currentMonth}100`; // 假設 assno 以 prono 前三位 + 當前月份 + 序號 100 開始
        const [existingAssignments] = await connection.query('SELECT assno FROM `student-project`.`assignment` WHERE assno LIKE ?', [assNo]);
        
        // 獲取最大序號
        let maxSuffix = 0;
        if (existingAssignments.length > 0) {
            maxSuffix = existingAssignments.map(a => parseInt(a.assno.slice(-3))).sort((a, b) => b - a)[0];
        }

        // 對於每個 collaborator 和 student，插入 assignment 資料
        for (const collaborator of collaborators) {
            for (const student of students) {
                const newAssNo = `${assNoPrefix}${currentMonth}${String(maxSuffix + 1).padStart(3, '0')}`; // 生成新的 assno
                await connection.query('INSERT INTO `student-project`.`assignment` (assno, colno, stuno) VALUES (?, ?, ?)', [newAssNo, collaborator.colno, student.stuno]);
                maxSuffix++; // 增加序號
            }
        }

        // 提交交易
        await connection.commit();
        console.log('Assignments added successfully!');
    } catch (error) {
        console.error('Error adding assignments:', error);
        await connection.rollback();
    } finally {
        connection.release();
    }
};

// 新增分配路由
router.post('/addAssignment', async (req, res) => {
    const { prono } = req.body;

    // 檢查必填欄位是否存在
    if (!prono) {
        return res.status(400).json({ message: 'prono 是必填的' });
    }

    try {
        await addAssignmentInDb(prono);
        res.status(201).json({ message: '分配新增成功' });
    } catch (error) {
        console.error('Error in adding assignment:', error);
        res.status(500).json({ message: '伺服器錯誤，無法新增分配' });
    }
});


module.exports = router;