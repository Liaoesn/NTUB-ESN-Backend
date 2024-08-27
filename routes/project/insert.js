const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

const createProjectInDb = async (ProjectInfo) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() - 1911; // 將西元年轉為民國年
    const currentedu = {
        "博士": "01",
        "二技": "02",
        "碩士": "03",
        "四技": "04",
    }

    const eduCode = currentedu[ProjectInfo.education];

    const [result] = await pool.query('SELECT prono FROM `student-project`.`project` ORDER BY prono DESC LIMIT 1');
    let newProNo;
    if (result.length > 0) {
        const latestUserNo = result[0].prono;
        const latestSequence = latestUserNo % 1000 + 1; // 提取最新的序號部分並加1
        newProNo = parseInt(`${currentYear}${eduCode}${String(latestSequence).padStart(3, '0')}`);
    } else {
        newProNo = `${currentYear}${eduCode}001`;
    }
    await pool.query('INSERT INTO `student-project`.`project` (prono, proname, prodescription, startdate, phase1, phase2, enddate, create_id, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        newProNo, ProjectInfo.name, ProjectInfo.description, ProjectInfo.startdate, ProjectInfo.phase1, ProjectInfo.phase2, ProjectInfo.enddate, ProjectInfo.id, '開放中'
    ]);
}

// 新增專案
// router.get('/', (req, res) => {
    
// });