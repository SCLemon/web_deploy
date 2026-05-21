// for /moruvi/mission

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');
const missionModel = require('../models/missionModel');
const subscribeModel = require('../models/subscribeModel');

const { v4: uuidv4 } = require('uuid');
const { format } = require('date-fns');

const authMiddleware = require('../middleware/auth.middleware');
const prizeModel = require('../models/prizeModel');

const { recordNotification } = require('./notifyRouter');
const { pushNotification } = require('./service-worker/serviceWorker');
const roomMiddleware = require('../middleware/room.middleware');

// 待批准、已批准、已駁回、待撥款、已完成

// 獲取任務接取清單
router.get('/api/mission/waitToGet', authMiddleware, roomMiddleware, async (req, res) => {

    const isMineList = req.query.isMineList === 'true';

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: []
            });
        }

        const room = req.room;

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
                data: []
            });
        }

        const partnerToken = room.owners.find(owner => owner !== user.token);
        
        let targetList = [];

        if(isMineList){
            const myMission = await missionModel.findOne({ token: user.token });
            targetList = myMission?.postMission ?? [];
        }
        else{
            const partnerMission = await missionModel.findOne({ token: partnerToken });
            targetList = partnerMission?.postMission ?? [];
        }
        
        // 已完成與已駁回的拆分出來
        const endList = targetList.filter(m => m.status === '已完成' || m.status === '已駁回').sort((a, b) => new Date(b.date) - new Date(a.date));
        const notEndList = targetList.filter(m => m.status !== '已完成' && m.status !== '已駁回').sort((a, b) => new Date(b.date) - new Date(a.date));

        const output = [...notEndList, ...endList].map(m => ({
            itemId: m.itemId,
            date: m.date,
            money: m.money,
            title: m.title,
            description: m.description,
            status: m.status,
            isMine: m.creator === user.token,
        }));

        return res.send({
            type:'success',
            message:'任務資料獲取成功。',
            data: output || [],
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 獲取已接取的清單
router.get('/api/mission/getMissionList', authMiddleware, async (req, res) => {

    try {
        const mission = await missionModel.findOne({token: req.headers['x-user-token']});
    
        if(!mission){
            return res.send({
                type:'success',
                message:'用戶資料獲取成功。',
                data: []
            });
        }

        const output = mission.getMission
        .map(m => ({
            itemId: m.itemId,
            date: m.date,
            money: m.money,
            title: m.title,
            status: m.status,
        })).reverse();

        return res.send({
                type:'success',
                message:'任務資料獲取成功。',
                data: output || [],
            });


    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 獲取特定任務的詳細資料
router.get('/api/mission/getSpecificMission/:itemId', authMiddleware, roomMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: {}
            });
        }

        const room = req.room;

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
                data: {}
            });
        }

        const partnerToken = room.owners.find(owner => owner !== user.token);
        
        const partnerMission = await missionModel.findOne({ token: partnerToken });

        const myMission = await missionModel.findOne({ token: user.token });

        const targetMission = partnerMission?.postMission.find(m => m.itemId === itemId) 
                            || myMission?.postMission.find(m => m.itemId === itemId);

        if(!targetMission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
                data: {}
            });
        }

        return res.send({
                type:'success',
                message:'任務資料獲取成功。',
                data: {
                    money: targetMission.money,
                    title: targetMission.title,
                    description: targetMission.description,
                }
            });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。',
        });
    }
});

// 任務發布
router.post('/api/mission/postMission', authMiddleware, async (req, res) => {
    const { title, description, money } = req.body;

    try {

        // 檢查是否為空 且 money 是否為數字
        if(!title || !description || money == null){
            return res.send({
                type:'error',
                message:'任務發布失敗（資料不可為空）。',
            });
        }

        if(isNaN(money)){
            return res.send({
                type:'error',
                message:'任務發布失敗（金額必須為數字）。',
            });
        }

        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const save = {
            creator: user.token,
            itemId: uuidv4(),
            date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            money,
            title,
            description,
        }
        let mission = await missionModel.findOne({ token: user.token });

        if(!mission){
            mission =await missionModel.create({
                token: user.token,
                postMission: [],
                getMission: []
            });
        }
        mission.postMission.push(save);

        await mission.save();

        await notifyMission(req, '您的伴侶剛才發布了一個任務！', '開啟通知查看任務內容。', `您的伴侶於 ${format(new Date(), 'yyyy.MM.dd HH:mm:ss')} 發布了一個任務，任務標題為「${title}」。`);

        return res.send({
            type:'success',
            message:'任務發布成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 撤銷任務
router.delete('/api/mission/removeMission/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const mission = await missionModel.findOne({ token: user.token });

        if(!mission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        const targetMission = mission.postMission.find(m => m.itemId === itemId);

        if(targetMission?.status !== '待批准'){
            return res.send({
                type:'error',
                message:'無法撤銷任務（任務已被批准）。',
            });
        }

        mission.postMission = mission.postMission.filter(m => m.itemId !== itemId);

        await mission.save();

        return res.send({
            type:'success',
            message:'任務撤銷成功。',
        });
    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 任務接取（批准與駁回）
router.post('/api/mission/handleMission', authMiddleware, async (req, res) => {

    const { action, itemId } = req.body; // 'approve' 或 'reject'

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: []
            });
        }

        const room = req.room;

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
                data: []
            });
        }

        const partnerToken = room.owners.find(owner => owner !== user.token);

        const mission = await missionModel.findOne({ token: partnerToken });

        if(!mission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        const targetMission = mission.postMission.find(m => m.itemId === itemId);

        if(!targetMission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        if(action === 'approve'){
            targetMission.status = '已批准';
        } 
        else if(action === 'reject'){
            targetMission.status = '已駁回';
        } 
        else {
            return res.send({
                type:'error',
                message:'無效的操作類型。',
            });
        }

        await mission.save();

        // 將任務狀態更新同步到接取者的 getMission 中
        let myMission = await missionModel.findOne({ token: user.token });

        if(!myMission){
            myMission = await missionModel.create({
                token: user.token,
                postMission: [],
                getMission: []
            });
        }

        myMission.getMission.push(targetMission);

        await myMission.save();

        await notifyMission(req, `您的伴侶剛才${action === 'approve' ? '批准了' : '駁回了'}您的任務！`, '開啟通知查看任務內容。', `您的伴侶於 ${format(new Date(), 'yyyy.MM.dd HH:mm:ss')} ${action === 'approve' ? '批准了' : '駁回了'}您的任務，任務標題為「${targetMission.title}」。`);

        return res.send({
            type:'success',
            message:'任務處理成功。',
        });


    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 任務完成
router.get('/api/mission/completeMission/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const mission = await missionModel.findOne({ token: user.token });

        if(!mission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        const targetMission = mission.getMission.find(m => m.itemId === itemId);

        if(!targetMission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        targetMission.status = '待撥款';

        await mission.save();

        // 同步更新發布者的 postMission 中的任務狀態
        const publisherMission = await missionModel.findOne({ token: targetMission.creator });

        if(publisherMission){
            const publisherTargetMission = publisherMission.postMission.find(m => m.itemId === itemId);
            if(publisherTargetMission){
                publisherTargetMission.status = '待撥款';
                await publisherMission.save();
            }
        }

        await notifyMission(req, '您的伴侶剛才完成了一個任務！', '開啟通知查看任務內容。', `您的伴侶於 ${format(new Date(), 'yyyy.MM.dd HH:mm:ss')} 完成了一個任務，任務標題為「${targetMission.title}」。`);

        return res.send({
            type:'success',
            message:'任務完成狀態更新成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 取消任務
router.get('/api/mission/cancelMission/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const mission = await missionModel.findOne({ token: user.token });

        if(!mission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }
        
        const targetMission = mission.getMission.find(m => m.itemId === itemId);

        if(!targetMission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        // 從 getMission 中移除該任務
        mission.getMission = mission.getMission.filter(m => m.itemId !== itemId);

        await mission.save();

        // 同步更新發布者的 postMission 中的任務狀態
        const publisherMission = await missionModel.findOne({ token: targetMission.creator });

        if(publisherMission){
            const publisherTargetMission = publisherMission.postMission.find(m => m.itemId === itemId);
            if(publisherTargetMission){
                publisherTargetMission.status = '待批准';
                await publisherMission.save();
            }
        }

        await notifyMission(req, '您的伴侶剛才取消了一個任務！', '開啟通知查看任務內容。', `您的伴侶於 ${format(new Date(), 'yyyy.MM.dd HH:mm:ss')} 取消了一個任務，任務標題為「${targetMission.title}」。`);

        return res.send({
            type:'success',
            message:'任務取消狀態更新成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 確認撥款
router.get('/api/mission/allocateMoney/:itemId', authMiddleware, roomMiddleware, async (req, res) => {
    
    const { itemId } = req.params;

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const room = req.room;

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
            });
        }

        const mission = await missionModel.findOne({ token: user.token });

        if(!mission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }
        
        const targetMission = mission.postMission.find(m => m.itemId === itemId);

        if(!targetMission){
            return res.send({
                type:'error',
                message:'任務資料獲取失敗（查無此任務）。',
            });
        }

        // 更新用戶的餘額
        const partnerToken = room.owners.find(owner => owner !== user.token);
        const money = targetMission.money;
        const target = await prizeModel.findOne({ token: partnerToken });
        if(!target){
            await prizeModel.create({
                token: partnerToken,
                money: money
            });
        } else {
            target.money += money;
            await target.save();
        }

        // 同步更新發布者的 postMission 中的任務狀態
        targetMission.status = '已完成';
        await mission.save();

        // 同步更新接取者的 getMission 中的任務狀態
        const myMission = await missionModel.findOne({ token: partnerToken });
        if(myMission){
            const myTargetMission = myMission.getMission.find(m => m.itemId === itemId);
            if(myTargetMission){
                myTargetMission.status = '已完成';
                await myMission.save();
            }
        }

        await notifyMission(req, '您的伴侶剛才撥款了一個任務！', '開啟通知查看任務內容。', `您的伴侶於 ${format(new Date(), 'yyyy.MM.dd HH:mm:ss')} 撥款了一個任務，任務標題為「${targetMission.title}」。`);

        return res.send({
            type:'success',
            message:'任務撥款狀態更新成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

async function notifyMission(req, title, subTitle, content) {
    try{
        const user = req.user;

        if(!user){
            return {
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            };
        }

        const room = req.room;

        if(!room){
            return {
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
            };
        }
        const partnerToken = room.owners.find(owner => owner !== user.token);
        
        const result = await subscribeModel.findOne({ token: partnerToken });

        if(result) pushNotification(title, subTitle, undefined, result.subscription);
        await recordNotification(user.token, title, subTitle, content, partnerToken);

        return {
            type:'success',
            message:'通知發送成功。',
        };
    }
    catch(e){
        console.log(e);
    }
}
module.exports = router;