const express = require('express');
const router = express.Router();
const pool = require('../../lib/db');

const createProjectInDb = async (ProjectInfo) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() - 1911; // 將西元年轉為民國年

    // 判斷學年
    const augustFirst = new Date(currentDate.getFullYear(), 7, 1); // 7 表示 8 月，因為月份是從 0 開始的
    if (currentDate < augustFirst) {
        currentYear -= 1; // 如果今天日期是 8/1 以前，民國年減一
    }

    const currentedu = {
        "博士": "01",
        "二技": "02",
        "碩士": "03",
        "四技": "04",
    }

    const eduCode = currentedu[ProjectInfo.prodescription];

    const [result] = await pool.query('SELECT prono FROM `student-project`.`project` ORDER BY prono DESC LIMIT 1');
    let newProNo;

    if (result.length > 0) {
        const latestProNo = result[0].prono;
        const latestSequence = latestProNo % 1000 + 1; // 提取最新的序號部分並加1
        newProNo = `${currentYear}${eduCode}${String(latestSequence).padStart(3, '0')}`;
    } else {
        newProNo = `${currentYear}${eduCode}001`;
    }
    await pool.query('INSERT INTO `student-project`.`project` (prono, proname, prodescription, startdate, phase1, phase2, enddate, create_id, state, admissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        newProNo, ProjectInfo.proname, ProjectInfo.prodescription, ProjectInfo.startdate, ProjectInfo.phase1, ProjectInfo.phase2, ProjectInfo.enddate, ProjectInfo.create_id, '開放中', ProjectInfo.admissions
    ]);
}

// 新增專案
router.get('/', async (req, res) => {
    try{
        const { proname, prodescription, startdate, phase1, phase2, enddate, create_id, admissions  } = req.query;

        // 檢查必填欄位是否存在
        if (!proname || !prodescription || !startdate || !phase1 || !phase2 || !enddate || !create_id || !admissions ) {
            return res.status(400).json({ message: '所有欄位都是必填的' });
        }

        const ProjectInfo = {
            proname, 
            prodescription,
            startdate,
            phase1,
            phase2,
            enddate,
            create_id,
            admissions
        };

        // 呼叫 createProjectInDb 來新增專案
        await createProjectInDb(ProjectInfo);

        // 新增成功
            res.status(201).json({ message: '專案新增成功' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: '伺服器錯誤，無法新增專案' });
        }
        
});

module.exports = router;