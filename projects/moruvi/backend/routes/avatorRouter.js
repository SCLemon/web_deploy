
// 頭像上傳與返回

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');

const {format} = require('date-fns');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const authMiddleware = require('../middleware/auth.middleware')
const { upload, autoCleanupTmp } = require('../config/multer.config');
const path = require('path');

const { baseDir } = require('../config/pathConfig');

const { tokenCache } = require('../cache/cache');

// 確保 userAvatar 資料夾存在
const avatarDir = path.join(baseDir, 'userAvatar');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

// 更改頭貼
router.post('/api/img/updateUserAvator',authMiddleware,upload.fields([{ name: 'attachments', maxCount: 1}]),autoCleanupTmp, async (req, res) => {
    
    // 本次專屬 id
    const key = uuidv4();

    const token = req.headers['x-user-token']
    
    try {
        const file = req.files?.attachments?.[0];
            
        if (!file) return res.send({ type:'error', message:'上傳頭像不可為空。'});
        
        if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

        const user = await userModel.findOne({ token });
        let originalPath = user.userImgUrl.original;
        
        // 刪除原先資料
        if(originalPath){
            if (fs.existsSync(originalPath)){
                fs.rmSync(originalPath);
            }
        }

        // 創建新的資料
        const filename = key + path.extname(file.originalname);
        originalPath = path.join(avatarDir,filename);

        fs.renameSync(file.path, originalPath);

        user.userImgUrl = {
            url: `/api/img/getUserAvator/${filename}`,
            original: originalPath
        }

        await user.save();
        tokenCache.delete(token);

        return res.send({
            type:'success',
            message:'頭像上傳成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 返回頭貼
router.get('/api/img/getUserAvator/:filename',async (req, res) => {
    
    const filePath = path.join(avatarDir,req.params.filename);

    if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).send('File not found');
    }
});

module.exports = router;