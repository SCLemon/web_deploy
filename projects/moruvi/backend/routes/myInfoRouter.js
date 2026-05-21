// for /moruvi/more/my-info

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');

const authMiddleware = require('../middleware/auth.middleware');

const { tokenCache } = require('../cache/cache');

// 獲取資料
router.get('/api/myInfo/getData', authMiddleware, async (req, res) => {

    try {
        const user = req.user;

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料獲取失敗（查無此用戶）。',
                data: {}
            });
        }

        const output = {
            name: user.name,
            account: user.account,
            password: user.password,
            mailAddress: user.detail?.mailAddress || ''
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

// 修改資料
router.put('/api/myInfo/modifyData', authMiddleware, async (req, res) => {
    const { name, password, mailAddress } = req.body;
    try {
        const user = await userModel.findOne({token: req.headers['x-user-token']});

        if(!user){
            return res.send({
                type:'error',
                message:'用戶資料修改失敗（查無此用戶）。',
            });
        }

        const isEmpty = Object.values({name, password, mailAddress}).some(value => value == null || String(value).trim() === '');
        if(isEmpty){
            return res.send({
                type:'success',
                message:'用戶資料修改失敗（資料不可為空）。',
            });
        }

        user.name = name;
        user.password = password;
        user.detail.mailAddress = mailAddress;

        await user.save();
        tokenCache.delete(user.token);
        
        return res.send({
            type:'success',
            message:'用戶資料修改成功。',
            data:{
                account: user.account,
                password: password,
                name: name,
                mailAddress: mailAddress
            }
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