const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

router.get('/:prono', async (req, res) => {
  try {
    const { prono } = req.query;
    const docnumber = await pool.query(
      'SELECT COUNT(*) AS total_students FROM ESN.students WHERE `pro_no` = ? ;', [prono]
    )
    const [teacher] = await pool.query(
    'SELECT  u.user_name FROM ESN.collaborators as c left JOIN ESN.users as u ON c.user_no = u.user_no WHERE c.pro_no = ?;', [prono]
    )
    const [ProjectRows] =
      await pool.query(
        'SELECT pro_no, pro_name, pro_academic, phase1, end_date, share_type, admissions FROM ESN.projects WHERE `pro_no` = ? ;', [prono]);
        ProjectRows.push(docnumber[0][0])
        ProjectRows.push({'teachers':teacher})
        console.log(ProjectRows)
    if (ProjectRows.length === 0) {
      return res.status(404).json({ error: '未找到此專案' });
    } 
    console.log()
    res.json(ProjectRows);
  } catch (error) {
    console.error('查詢資料時發生錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// 專案名稱
router.post('/name', async (req, res) => {
    const { title, prodescription } = req.body;  // 接收從前端傳來的資料
    const { prono } = req.query;  // 從 query 參數中取得 pro_no
  
    // 檢查是否有 pro_no 和要更新的內容
    if (!prono) {
      return res.status(400).json({ message: 'prono is required' });
    }
    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }
  
    try {
      // 更新 MySQL 數據庫中的 projects 表
      const sql = `UPDATE ESN.projects SET pro_name = ?, pro_academic = ? WHERE pro_no = ?`;
      const values = [title, prodescription , prono];
      await pool.query(sql, values);
  
      res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Failed to update project' });
    }
});

// 第一階段, 結束日期
router.post('/date', async (req, res) => {
    const { phase1, end_date, pro_no } = req.body; // 增加 pro_no 參數
    let updates = [];
    let params = [];
  
    if (phase1) {
      updates.push('phase1 = ?');
      params.push(phase1);
    }
  
    if (end_date) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
  
    // 確保有查詢和參數
    if (updates.length === 0) {
      return res.status(400).send('沒有提供更新參數');
    }
  
    const query = `UPDATE ESN.projects SET ${updates.join(', ')} WHERE pro_no = ?`;
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
    const { admissions, prono } = req.body; // 取得 admissions 和 pro_no
  
    // SQL 更新語句
    const query = `UPDATE ESN.projects SET admissions = ? WHERE pro_no = ?`;
  
    if (admissions) {
      try {
        // 執行查詢，並將結果存入 result 變數
        console.log(123)
        const [result] = await pool.query(query, [admissions, prono]);
  
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

module.exports = router;