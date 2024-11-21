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

    const [result] = await pool.query('SELECT pro_no FROM ESN.projects ORDER BY pro_no DESC LIMIT 1');

    if (result.length > 0) {
        const latestProNo = result[0].prono;
        const latestSequence = ((latestProNo + 1).toString()).slice(-3);
        newProNo = `${currentYear}${eduCode}${latestSequence}`;
    } else {
        newProNo = `${currentYear}${eduCode}001`;
    }

    await pool.query('INSERT INTO `ESN`.`projects` (pro_name, pro_year, pro_academic , start_date, phase1, end_date, create_id, status, admissions ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        ProjectInfo.proname,currentYear ,ProjectInfo.prodescription , currentDate, ProjectInfo.phase1, ProjectInfo.enddate, ProjectInfo.user_no, '開放中', ProjectInfo.admissions
    ]);
}

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 設定檔案暫存目錄

router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { proname, prodescription, phase1, enddate, user_no, admissions } = req.body;
        const filePath = req.file.path; // 上傳檔案的路徑
        console.log('接收到的檔案路徑:', filePath);

        // 處理專案新增邏輯
        const ProjectInfo = { proname, prodescription, phase1, enddate, user_no, admissions };
        await createProjectInDb(ProjectInfo);

        res.status(201).json({ message: '專案新增成功' });
    } catch (error) {
        console.error('新增專案時發生錯誤:', error);
        res.status(500).json({ message: '伺服器錯誤，無法新增專案' });
    }
});
// 新增專案
// router.post('/', async (req, res) => {
//     try{
//         const { files,proname, prodescription, phase1, enddate, user_no, admissions  } = req.body;

//         console.log([proname, prodescription, phase1, enddate, user_no, admissions]);
//         console.log(files)
//         // 檢查必填欄位是否存在
//         if (!proname || !prodescription || !phase1 || !enddate || !admissions ) {
//             return res.status(400).json({ message: '所有欄位都是必填的' });
//         }

//         const ProjectInfo = { 
//             proname, 
//             prodescription,
//             phase1, 
//             enddate, 
//             user_no, 
//             admissions
//         };
//         await createProjectInDb(ProjectInfo);

//         // 新增成功
//             res.status(201).json({ message: '專案新增成功' });
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ message: '伺服器錯誤，無法新增專案' });
//         }
        
// });

// 新增student table
router.post('/addStudent', async (req, res) => {
    try {
        const { prono } = req.body;

        // 呼叫 addStudentInDb 來新增學生，並取得新生成的 stuno
        const newStuNo = await addStudentInDb(prono);

        // 新增成功，回傳新 stuno
        res.status(201).json({ message: '學生新增成功', stuno: newStuNo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '伺服器錯誤，無法新增學生' });
    }
});

router.get('/search/teacher', async (req, res) => {
    try {
      const teacherDB = await pool.query(
        'SELECT user_no,user_name, permissions FROM `ESN`.users where  permissions = 0;'
      );

      const max = await pool.query(
        // 'SELECT  FROM `ESN`.users where  permissions = 0;'
        'SELECT MAX(pro_no) AS max_score FROM `ESN`.projects;'
      );

      if (teacherDB.length === 0) {
        return res.status(404).json({ error: '未找此專案' });
      }
      console.log(teacherDB)
      res.json({teacherDB, max}); // 返回查询到的所有数据
    } catch (error) {
      console.error('查詢資料時發生錯誤:', error);
      res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
    }
});
router.get('/projectid', async (req, res) => {
    try {
      const max = await pool.query(
        // 'SELECT  FROM `ESN`.users where  permissions = 0;'
        'SELECT MAX(pro_no) AS max_score FROM `ESN`.projects;'
      );

      res.json(max); // 返回查询到的所有数据
    } catch (error) {
      console.error('查詢資料時發生錯誤:', error);
      res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
    }
});

module.exports = router;