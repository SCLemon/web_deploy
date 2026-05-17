// for /moruvi/more

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const roomModel = require('../models/roomModel');

const authMiddleware = require('../middleware/auth.middleware');

// 獲取資料
router.get('/api/overview/getData', authMiddleware, async (req, res) => {
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
        const user = await userModel.findOne({token: req.headers['x-user-token']});

        output.user.name = user.name;
        output.user.memberNo = user.memberNo;
        output.user.userImgUrl = user.userImgUrl.url;

        const roomId = user.roomId;

        let roomData = await roomModel.findOne({ roomId });
        
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

// 上傳頭貼

module.exports = router;