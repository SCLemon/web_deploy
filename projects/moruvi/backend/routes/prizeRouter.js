// for /moruvi/mission

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const prizeModel = require('../models/prizeModel');
const roomModel = require('../models/roomModel');
const subscribeModel = require('../models/subscribeModel')

const { v4: uuidv4 } = require('uuid');
const { format } = require('date-fns');

const authMiddleware = require('../middleware/auth.middleware');
const { recordNotification } = require('./notifyRouter');
const { pushNotification } = require('./service-worker/serviceWorker');

// 獲取用戶資訊
router.get('/api/prize/getUserInfo', authMiddleware, async (req, res) => {

    try {
        const user = await userModel.findOne({token: req.headers['x-user-token']});
        const prize = await prizeModel.findOne({token: req.headers['x-user-token']});

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: {}
            });
        }

        const output = {
            name: user.name,
            userImgUrl: user.userImgUrl.url,
            money: prize?.money || 0
        }

        return res.send({
            type:'success',
            message:'用戶資料獲取成功。',
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

// 獲取商品列表
router.get('/api/prize/getPrizeList', authMiddleware, async (req, res) => {

    const isMineList = req.query.isMineList === 'true';

    try {
        const user = await userModel.findOne({token: req.headers['x-user-token']});
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: []
            });
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

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
            const myPrize = await prizeModel.findOne({ token: user.token });
            targetList = myPrize?.postPrize ?? [];

        }
        else{
            const partnerPrize = await prizeModel.findOne({ token: partnerToken });
            targetList = partnerPrize?.postPrize ?? [];
        }
    
        
        targetList = targetList.sort((a, b) => a.money - b.money).map(m => ({
            itemId: m.itemId,
            money: m.money,
            title: m.title,
            description: m.description,
            isMine: m.creator === user.token
        }))
        

        return res.send({
                type:'success',
                message:'商品資料獲取成功。',
                data: targetList || [],
            });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 獲取已購買的清單
router.get('/api/prize/getPurchasedList', authMiddleware, async (req, res) => {

    try {
        const prize = await prizeModel.findOne({token: req.headers['x-user-token']});
    
        if(!prize){
            return res.send({
                type:'success',
                message:'用戶資料獲取成功。',
                data: []
            });
        }

        const output = prize.exchangePrize
        .map(m => ({
            itemId: m.itemId,
            date: m.date,
            money: m.money,
            title: m.title,
            status: m.status,
        })).reverse();

        return res.send({
                type:'success',
                message:'商品資料獲取成功。',
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

// 獲取特定商品的詳細資料
router.get('/api/prize/getSpecificPrize/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {

        const user = await userModel.findOne({token: req.headers['x-user-token']});
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: []
            });
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
                data: []
            });
        }

        const partnerToken = room.owners.find(owner => owner !== user.token);

        const [partnerPostPrizeList, myPostPrizeList, myExchangePrizeList] = await Promise.all([
            prizeModel.findOne({ token: partnerToken })
                .then(m => m?.postPrize ?? []),

            prizeModel.findOne({ token: user.token })
                .then(m => m?.postPrize ?? []),

            prizeModel.findOne({ token: user.token })
                .then(m => m?.exchangePrize ?? []) 
        ]);

         const mergedList = [
            ...partnerPostPrizeList,
            ...myPostPrizeList,
            ...myExchangePrizeList
        ]
        const targetPrize = mergedList.find(p => p.itemId === itemId);

        if(!targetPrize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
                data: {}
            });
        }

        return res.send({
                type:'success',
                message:'商品資料獲取成功。',
                data: {
                    money: targetPrize.money,
                    title: targetPrize.title,
                    description: targetPrize.description,
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

// 商品發布
router.post('/api/prize/postPrize', authMiddleware, async (req, res) => {
    const { title, description, money } = req.body;

    try {

        // 檢查是否為空 且 money 是否為數字
        if(!title || !description || money == null){
            return res.send({
                type:'error',
                message:'商品發布失敗（資料不可為空）。',
            });
        }

        if(isNaN(money)){
            return res.send({
                type:'error',
                message:'商品發布失敗（金額必須為數字）。',
            });
        }

        const user = await userModel.findOne({token: req.headers['x-user-token']});
    
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
        let prize = await prizeModel.findOne({ token: user.token });

        if(!prize){
            prize =await prizeModel.create({
                token: user.token,
                money: 0,
                postPrize: [],
                getPrize: []
            });
        }
        prize.postPrize.push(save);

        await prize.save();

        return res.send({
            type:'success',
            message:'商品發布成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 撤銷商品
router.delete('/api/prize/removePrize/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const prize = await prizeModel.findOne({ token: user.token });

        if(!prize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }

        prize.postPrize = prize.postPrize.filter(p => p.itemId !== itemId);

        await prize.save();

        return res.send({
            type:'success',
            message:'商品撤銷成功。',
        });
    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 購買商品
router.post('/api/prize/purchase', authMiddleware, async (req, res) => {

    const { itemId } = req.body;

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: []
            });
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

        if(!room){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此房間）。',
                data: []
            });
        }

        const partnerToken = room.owners.find(owner => owner !== user.token);
        
        const [partnerPostPrizeList, myPostPrizeList] = await Promise.all([
            prizeModel.findOne({ token: partnerToken })
                .then(m => m?.postPrize ?? []),

            prizeModel.findOne({ token: user.token })
                .then(m => m?.postPrize ?? [])
        ]);

         const mergedList = [
            ...partnerPostPrizeList,
            ...myPostPrizeList
        ]
        const targetPrize = mergedList.find(p => p.itemId === itemId);
        if(!targetPrize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }

        // 購買者金額減少（檢查金額是否足夠）
        const myPrizeDoc = await prizeModel.findOne({ token: user.token });
        if(!myPrizeDoc){
            return res.send({
                type:'error',
                message:'購買失敗（用戶獎勵資料異常）。',
            });
        }
        if(myPrizeDoc.money < targetPrize.money){
            return res.send({
                type:'error',
                message:'購買失敗（用戶餘額不足）。',
            });
        }

        myPrizeDoc.money -= targetPrize.money;

        myPrizeDoc.exchangePrize.push({
            creator: targetPrize.creator,
            itemId: uuidv4(),
            date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            title: targetPrize.title,
            description: targetPrize.description,
            money: targetPrize.money,
            status: false, // 待兌換
        });

        await myPrizeDoc.save();

        await notifyPrize(req, '商品購買通知', '開啟通知查看商品內容' ,`您的伴侶購買了名稱為「 ${targetPrize.title}」的商品，請等待對方確認兌換。`,);

        return res.send({
            type:'success',
            message:'商品購買成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 商品完成
router.get('/api/prize/completePrize/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const prize = await prizeModel.findOne({ token: user.token });

        if(!prize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }

        const targetPrize = prize.exchangePrize.find(p => p.itemId === itemId);

        if(!targetPrize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }

        targetPrize.status = true; // 已兌換

        await prize.save();

        await notifyPrize(req, '商品兌換通知', '開啟通知查看商品內容', `您的伴侶已確認兌換名稱為「${targetPrize.title}」的商品，請履行交付義務。`);

        return res.send({
            type:'success',
            message:'商品完成狀態更新成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 商品退款
router.get('/api/prize/cancelPrize/:itemId', authMiddleware, async (req, res) => {
    const { itemId } = req.params;

    try {
        const user = req.user;
    
        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            });
        }

        const prize = await prizeModel.findOne({ token: user.token });

        if(!prize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }
        
        const targetPrize = prize.exchangePrize.find(p => p.itemId === itemId);

        if(!targetPrize){
            return res.send({
                type:'error',
                message:'商品資料獲取失敗（查無此商品）。',
            });
        }

        // 將金額退回購買者
        prize.money += targetPrize.money;

        // 從 exchangePrize 中移除該商品
        prize.exchangePrize = prize.exchangePrize.filter(p => p.itemId !== itemId);

        await prize.save();

        await notifyPrize(req, '商品退款通知', '開啟通知查看商品內容', `您的伴侶取消了商品名稱為「${targetPrize.title}」的購買。`);

        return res.send({
            type:'success',
            message:'商品退款成功。',
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

async function notifyPrize(req, title, subTitle, content) {
    try{
        const user = req.user;
    
        if(!user){
            return {
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
            };
        }

        const roomId = user.roomId;

        const room = await roomModel.findOne({ roomId });

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