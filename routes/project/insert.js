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
        const latestSequence = ((latestProNo + 1).toString()).slice(-3);
        newProNo = `${currentYear}${eduCode}${latestSequence}`;
    } else {
        newProNo = `${currentYear}${eduCode}001`;
    }

    
    await pool.query('INSERT INTO `student-project`.`project` (prono, proname, prodescription, startdate, phase1, enddate, create_id, state, admissions, share_type ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        parseInt(newProNo), ProjectInfo.proname, ProjectInfo.prodescription, ProjectInfo.startdate, ProjectInfo.phase1, ProjectInfo.enddate, ProjectInfo.userno, '開放中', ProjectInfo.admissions, ProjectInfo.share_type
    ]);
}

const addStudentInDb = async (prono) => {
    const [result] = await pool.query('SELECT stuno FROM `student-project`.`student` WHERE prono = ? ORDER BY stuno DESC LIMIT 1', [prono]);
    let newStuNo;

    if (result.length > 0) {
        const latestStuNo = result[0].stuno;
        const latestSequence = parseInt(latestStuNo.slice(-3)) + 1; 
        newStuNo = `${prono.slice(0, 5)}${String(latestSequence).padStart(3, '0')}`; 
    } else {
        // 如果沒有任何記錄，從 001 開始
        newStuNo = `${prono.slice(0, 5)}001`; 
    }


    await pool.query('INSERT INTO `student-project`.`student` (stuno, prono) VALUES (?, ?)', [newStuNo, prono]);

    // 新增學生備註資料
    await addStudentDetailsInDb(newStuNo);
    // 新增學生履歷資料
    await addresumeInDb(newStuNo);
    // 新增學生自傳資料
    await addautobiographyInDb(newStuNo);

    return newStuNo; 
}

// 新增備注編號
const addStudentDetailsInDb = async (stuno) => {
    const detailno = `${stuno}9`; // detailno 是 stuno 後加上 9
    await pool.query('INSERT INTO `student-project`.`studetails` (stuno, detailno) VALUES (?, ?)', [stuno, detailno]);
};

// 新增履歷編號
const addresumeInDb = async (stuno) => {
    const resno = `${stuno}8`; //  是 stuno 後加上 8
    await pool.query('INSERT INTO `student-project`.`resume` (stuno, resno) VALUES (?, ?)', [stuno, resno]);
};

// 新增自傳編號
const addautobiographyInDb = async (stuno) => {
    const autno = `${stuno}7`; //  是 stuno 後加上 7
    await pool.query('INSERT INTO `student-project`.`autobiography` (stuno, autno) VALUES (?, ?)', [stuno, autno]);
};



// 新增專案
router.post('/', async (req, res) => {
    try{
        // const userno = req.session.user.userno; 
        const { proname, prodescription, startdate, phase1, enddate, userno, admissions, share_type  } = req.body;

        console.log([proname, prodescription, startdate, phase1, enddate, userno, admissions, share_type]);

        // 檢查必填欄位是否存在
        if (!proname || !prodescription || !startdate || !phase1 || !enddate || !admissions || !share_type ) {
            return res.status(400).json({ message: '所有欄位都是必填的' });
        }

        const ProjectInfo = {
            proname, 
            prodescription,
            startdate,
            phase1,
            enddate,
            userno,
            admissions,
            share_type
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

// 新增student table
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