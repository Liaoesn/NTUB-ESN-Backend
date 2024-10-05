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
        const latestSequence = latestProNo % 10 + 1; // 提取最新的序號部分並加1
        newProNo = `${currentYear}${eduCode}${latestSequence}`;
    } else {
        newProNo = `${currentYear}${eduCode}`;
    }
    await pool.query('INSERT INTO `student-project`.`project` (prono, proname, prodescription, startdate, phase1, enddate, create_id, state, admissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        newProNo, ProjectInfo.proname, ProjectInfo.prodescription, ProjectInfo.startdate, ProjectInfo.phase1, ProjectInfo.enddate, ProjectInfo.create_id, '開放中', ProjectInfo.admissions
    ]);
}

const addStudentInDb = async (prono) => {
    // 從 student table 取得該 prono 下最新的 stuno
    const [result] = await pool.query('SELECT stuno FROM `student-project`.`student` WHERE prono = ? ORDER BY stuno DESC LIMIT 1', [prono]);
    let newStuNo;

    if (result.length > 0) {
        // 提取 stuno 的數字部分，將其轉為數字並加1
        const latestStuNo = result[0].stuno;
        const latestSequence = parseInt(latestStuNo.slice(-3)) + 1; // 取最後三位數字並加1
        newStuNo = `${prono}S${String(latestSequence).padStart(3, '0')}`;
    } else {
        // 如果沒有任何記錄，從 S100 開始
        newStuNo = `${prono}S100`;
    }

    // 將 stuno 和 prono 插入到 student 資料表
    await pool.query('INSERT INTO `student-project`.`student` (stuno, prono) VALUES (?, ?)', [newStuNo, prono]);

    return newStuNo; // 回傳新產生的 stuno
}


// 新增專案
router.get('/', async (req, res) => {
    try{
        const { proname, prodescription, startdate, phase1, enddate, create_id, admissions  } = req.query;

        // 檢查必填欄位是否存在
        if (!proname || !prodescription || !startdate || !phase1 || !enddate || !create_id || !admissions ) {
            return res.status(400).json({ message: '所有欄位都是必填的' });
        }

        const ProjectInfo = {
            proname, 
            prodescription,
            startdate,
            phase1,
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

// student table
router.post('/addStudent', async (req, res) => {
    try {
        const { prono } = req.body;

        // 檢查必填欄位是否存在
        if (!prono) {
            return res.status(400).json({ message: 'prono 是必填的' });
        }

        // 呼叫 addStudentInDb 來新增學生，並取得新生成的 stuno
        const newStuNo = await addStudentInDb(prono);

        // 新增成功，回傳新 stuno
        res.status(201).json({ message: '學生新增成功', stuno: newStuNo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '伺服器錯誤，無法新增學生' });
    }
});


module.exports = router;