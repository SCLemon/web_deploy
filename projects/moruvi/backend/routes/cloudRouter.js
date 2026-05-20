
// 雲端儲存空間

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');
const cloudModel = require('../models/cloudModel');

const {format} = require('date-fns');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const authMiddleware = require('../middleware/auth.middleware')

const { upload, autoCleanupTmp } = require('../config/multer.config');
const path = require('path');
const { ZipArchive } = require('archiver');
const { checkUsageMemory } = require('../middleware/checkUsageMemory.middleware');


// 獲取資料夾列表
router.get('/api/cloud/folders', authMiddleware, async (req, res) => {
    const token = req.headers['x-user-token']

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud){
            cloud = new cloudModel({
                roomId: room.roomId,
                folders: []
            });
            await cloud.save();
        }

        let folders = cloud.folders.map(folder => ({
            folderId: folder.folderId,
            folderName: folder.folderName,
            createTime: format(folder.createTime, 'yyyy/MM/dd'),
        })).reverse();

        return res.send({
            type:'success',
            message:'資料夾列表獲取成功。',
            data: folders
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 創建資料夾
router.post('/api/cloud/createFolder',authMiddleware, async (req, res) => {
    
    // 本次專屬 id
    const uuid = uuidv4();

    const token = req.headers['x-user-token']
    
    const { folderName } = req.body;

    // 判斷名稱不為空
    if(!folderName || folderName.trim() === ''){
        return res.send({
            type:'error',
            message:'資料夾名稱不可為空。'
        });
    }

    try {

        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        const databaseUrl = room.database.url;
        if(!fs.existsSync(databaseUrl)) fs.mkdirSync(databaseUrl, { recursive: true });

        const newFolderPath = path.join(databaseUrl, uuid);
        if(!fs.existsSync(newFolderPath)) fs.mkdirSync(newFolderPath, { recursive: true });
       
        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud){
            cloud = new cloudModel({
                roomId: room.roomId,
                folders: []
            });
        }

        cloud.folders.push({
            createTime: format(new Date(), 'yyyy/MM/dd HH:mm:ss'),
            folderId: uuid,
            folderPath: newFolderPath,
            folderName,
            files: []
        });

        await cloud.save();

        return res.send({
            type:'success',
            message:'資料夾創建成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 刪除資料夾
router.delete('/api/cloud/deleteFolder/:folderId', authMiddleware, async (req, res) => {
    
    const token = req.headers['x-user-token']
    
    const { folderId } = req.params;

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        const folderPath = cloud.folders[folderIndex].folderPath;
        if(fs.existsSync(folderPath)) fs.rmdirSync(folderPath, { recursive: true });

        cloud.folders.splice(folderIndex, 1);
        await cloud.save();

        return res.send({
            type:'success',
            message:'資料夾刪除成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 更改資料夾名稱
router.put('/api/cloud/renameFolder', authMiddleware, async (req, res) => {
    
    const token = req.headers['x-user-token']
    
    const { folderId, folderName } = req.body;

    if(!folderName || folderName.trim() === ''){
        return res.send({
            type:'error',
            message:'資料夾名稱不可為空。'
        });
    }

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        cloud.folders[folderIndex].folderName = folderName;
        await cloud.save();

        return res.send({
            type:'success',
            message:'資料夾名稱更新成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 下載資料夾
router.get('/api/cloud/downloadFolder/:folderId', authMiddleware, async (req, res) => {

    const token = req.headers['x-user-token'];
    const { folderId } = req.params;

    try {
        const room = await roomModel.findOne({ owners: token });
        if (!room)
            return res.send({
                type: 'error',
                message: '查無房間。'
            });

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if (!cloud)
            return res.send({
                type: 'error',
                message: '查無雲端資料。'
            });

        const folder = cloud.folders.find(folder => folder.folderId === folderId);

        if (!folder)
            return res.send({
                type: 'error',
                message: '查無資料夾。'
            });

        const folderPath = folder.folderPath;

        // 確認資料夾存在
        if (!fs.existsSync(folderPath)) {
            return res.send({
                type: 'error',
                message: '資料夾不存在。'
            });
        }

        // 設定下載檔名
        const zipName = `${folder.folderName}.zip`;

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(zipName)}"`
        );

        res.setHeader('Content-Type','application/zip');

        const archive = new ZipArchive({
            zlib: { level: 9 } // 壓縮等級一樣放在 options 裡面
        });


        archive.pipe(res);

        // 把整個資料夾加入 zip
        archive.directory(folderPath, false);

        archive.finalize();

    } catch (e) {
        console.log(e);

        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 獲取當前資料夾下的檔案列表
router.get('/api/cloud/files/:folderId', authMiddleware, async (req, res) => {
    
    const token = req.headers['x-user-token']
    
    const { folderId } = req.params;

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folder = cloud.folders.find(folder => folder.folderId === folderId);
        if(!folder) return res.send({ type:'error', message:'查無資料夾。'});

        const files = folder.files.map(file => ({
            fileId: file.fileId,
            fileName: file.fileName,
            fileSize: file.fileSize,
            createTime: format(file.createTime, 'yyyy/MM/dd'),
        })).reverse();

        return res.send({
            type:'success',
            message:'檔案列表獲取成功。',
            data: {
                folderName: folder.folderName,
                files,
            }
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 上傳檔案
router.post('/api/cloud/uploadFile',authMiddleware, upload.fields([{ name: 'attachments', maxCount: 1 }]), checkUsageMemory, autoCleanupTmp, async (req, res) => {
    
    // 本次專屬 id
    const uuid = uuidv4();

    const token = req.headers['x-user-token']
    
    const { folderId } = req.body;

    if(!req.files || !req.files.attachments || req.files.attachments.length === 0){
        return res.send({
            type:'error',
            message:'未選擇檔案。'
        });
    }

    const file = req.files.attachments[0];

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        const folderPath = cloud.folders[folderIndex].folderPath;
        const newFilePath = path.join(folderPath, file.originalname);

        fs.renameSync(file.path, newFilePath);

        const createTime = format(new Date(), 'yyyy/MM/dd HH:mm:ss')
        const meta = {
            fileId: uuid,
            fileName: file.originalname,
            fileSize: file.size,
            filePath: newFilePath,
            createTime: createTime,
        }

        cloud.folders[folderIndex].files.push(meta);

        await cloud.save();

        return res.send({
            type:'success',
            message:'檔案上傳成功。',
            data:{
                fileId: uuid,
                fileName: file.originalname,
                createTime: format(new Date(), 'yyyy/MM/dd'),
            }
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }   
});

// 刪除檔案
router.post('/api/cloud/deleteFile', authMiddleware, async (req, res) => {
    
    const token = req.headers['x-user-token']
    
    const { folderId, fileId } = req.body;

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        const fileIndex = cloud.folders[folderIndex].files.findIndex(file => file.fileId === fileId);
        if(fileIndex === -1) return res.send({ type:'error', message:'查無檔案。'});

        const filePath = cloud.folders[folderIndex].files[fileIndex].filePath;
        if(fs.existsSync(filePath)) fs.unlinkSync(filePath);

        cloud.folders[folderIndex].files.splice(fileIndex, 1);
        await cloud.save();

        return res.send({
            type:'success',
            message:'檔案刪除成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 更改檔案名稱
router.put('/api/cloud/renameFile', authMiddleware, async (req, res) => {
    
    const token = req.headers['x-user-token']
    
    const { folderId, fileId, fileName } = req.body;

    if(!fileName || fileName.trim() === ''){
        return res.send({
            type:'error',
            message:'檔案名稱不可為空。'
        });
    }

    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        const fileIndex = cloud.folders[folderIndex].files.findIndex(file => file.fileId === fileId);
        if(fileIndex === -1) return res.send({ type:'error', message:'查無檔案。'});

        // 保留舊後綴
        const oldFileName = cloud.folders[folderIndex].files[fileIndex].fileName;
        const oldExt = path.extname(oldFileName);
        const newFileName = fileName + oldExt;

        cloud.folders[folderIndex].files[fileIndex].fileName = newFileName;

        await cloud.save();

        return res.send({
            type:'success',
            message:'檔案名稱更新成功。'
        });
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 下載檔案
router.get('/api/cloud/downloadFile/:folderId/:fileId', authMiddleware, async (req, res) => {

    const token = req.headers['x-user-token'];
    const { folderId, fileId } = req.params;
    try {
        const room = await roomModel.findOne({ owners: token });
        if(!room) return res.send({ type:'error', message:'查無房間。'});

        let cloud = await cloudModel.findOne({ roomId: room.roomId });
        if(!cloud) return res.send({ type:'error', message:'查無雲端資料。'});

        const folderIndex = cloud.folders.findIndex(folder => folder.folderId === folderId);
        if(folderIndex === -1) return res.send({ type:'error', message:'查無資料夾。'});

        const fileIndex = cloud.folders[folderIndex].files.findIndex(file => file.fileId === fileId);
        if(fileIndex === -1) return res.send({ type:'error', message:'查無檔案。'});

        // 下載檔案
        const filePath = cloud.folders[folderIndex].files[fileIndex].filePath;
        const fileName = cloud.folders[folderIndex].files[fileIndex].fileName;

        if(fs.existsSync(filePath)){
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            return res.send({
                type:'error',
                message:'檔案不存在。'
            });
        } 
    } catch (e) {
        console.log(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。',
        });
    }
        
});

module.exports = router;
   