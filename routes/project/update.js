const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

// 專案名稱
router.post('/:pro_no', async (req, res) => {
    const { name } = req.body;  // 接收從前端傳來的資料
    const { pro_no } = req.query;  // 從 query 參數中取得 pro_no
  
    // 檢查是否有 pro_no 和要更新的內容
    if (!pro_no) {
      return res.status(400).json({ message: 'pro_no is required' });
    }
    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }
  
    try {
      // 更新 MySQL 數據庫中的 projects 表
      const sql = `UPDATE ESN.projects SET pro_name = ? WHERE pro_no = ?`;
      const values = [name, pro_no];
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
    const { admissions, pro_no } = req.body; // 取得 admissions 和 pro_no
  
    // SQL 更新語句
    const query = `UPDATE ESN.projects SET admissions = ? WHERE pro_no = ?`;
  
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

module.exports = router;