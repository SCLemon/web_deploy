// for /moruvi/more/home-setting

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');

const authMiddleware = require('../middleware/auth.middleware');

const { getFolderSize } = require('../middleware/checkUsageMemory.middleware')

// 獲取資料
router.get('/api/homeSetting/getData', authMiddleware, async (req, res) => {

    try {
        const user = await userModel.findOne({token: req.headers['x-user-token']});

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: {}
            });
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

        const usage = await getFolderSize(room.database.url);

        const output = {
            roomId: room.roomId,
            roomName: room.roomName,
            locked: room.locked,
            memory: {
                usage: (usage / 1024 / 1024).toFixed(2), // MB
                limit: room.database.limit.memory / 1024
            }
        }

        return res.send({
            type:'success',
            message:'房間資料獲取成功。',
            data: output
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 修改資料
router.put('/api/homeSetting/modifyData', authMiddleware, async (req, res) => {
    const { roomName, locked } = req.body;
    
    try {
        const user = await userModel.findOne({token: req.headers['x-user-token']});

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const isEmpty = Object.values({roomName, locked}).some(value => value == null || String(value).trim() === '');
        if(isEmpty){
            return res.send({
                type:'success',
                message:'用戶資料修改失敗（資料不可為空）。',
            });
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

        room.roomName = roomName;
        room.locked = locked;

        await room.save();

        return res.send({
            type:'success',
            message:'房間資料修改成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

module.exports = router;