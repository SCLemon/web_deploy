// for /moruvi/more

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');

const authMiddleware = require('../middleware/auth.middleware');
const roomMiddleware = require('../middleware/room.middleware');

// 獲取資料
router.get('/api/overview/getData', authMiddleware, roomMiddleware, async (req, res) => {
    let output = {
        user:{
            name:'',
            memberNo:'',
            userImgUrl:'',
        },
        roomInfo:{
            createTime:'',
            roomName:'',
            partner:{}
        },
    };
    
    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'概覽資料獲取失敗（查無此用戶）。',
                data: {}
            });
        }

        output.user.name = user.name;
        output.user.memberNo = user.memberNo;
        output.user.userImgUrl = user.userImgUrl.url;

        let roomData = req.room;
        
        output.roomInfo.createTime = roomData.createTime;
        output.roomInfo.roomName = roomData.roomName;

        const partnerToken = roomData.owners.find(token => token !== req.headers['x-user-token']);
        const partner = await userModel.findOne({token: partnerToken});
        output.roomInfo.partner = partner?.name || '-'

        return res.send({
            type:'success',
            message:'概覽資料獲取成功。',
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

module.exports = router;