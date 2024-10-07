const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');


router.get('/:prono', async (req, res) => {
   try {
    const { prono } = req.query;
    const docnumber = await pool.query('SELECT COUNT(*) AS total_students FROM `student-project`.`student` WHERE `prono` = ? ;', [prono])
    const [ProjectRows] = 
      await pool.query(
        'SELECT prono, proname, prodescription, phase1, endDate, share_type, admissions FROM `student-project`.project WHERE `prono` = ? ;', [prono]);
    ProjectRows.push({'docnumber':docnumber})
    console.log(ProjectRows[1])
    if (ProjectRows.length === 0) {
      return res.status(404).json({ error: '未找到此專案' });
    }
    
    res.json(ProjectRows.push({'docnumber':docnumber[0]}));
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



module.exports = router;