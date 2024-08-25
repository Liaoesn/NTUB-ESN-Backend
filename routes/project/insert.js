const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

const createProjectInDb = async (ProjectInfo) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() - 1911; // 將西元年轉為民國年

    const [result] = await pool.query('SELECT prono FROM `student-project`.`project` ORDER BY prono DESC LIMIT 1');
    let newProNo;
    if (result.length > 0) {
        const latestUserNo = result[0].userno;
        const latestSequence = latestUserNo % 10000 + 1; // 提取最新的序號部分並加1
        newProNo = parseInt(`${currentYear}${String(latestSequence).padStart(4, '0')}`);
    } else {
        newProNo = `${currentYear}0001`;
    }
    await pool.query('INSERT INTO `student-project`.`project` (prono, proname, prodescription, startdate, phase1, phase2, enddate, create_id, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        newProNo, ProjectInfo.name, ProjectInfo.description, ProjectInfo.startdate, ProjectInfo.phase1, ProjectInfo.phase2, ProjectInfo.enddate, ProjectInfo.id, '開放中'
    ]);
}