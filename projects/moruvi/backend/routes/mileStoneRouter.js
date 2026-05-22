// for /moruvi/home

// 全頁驗證機制
const express = require('express');
const router = express.Router();

const userModel = require('../models/userModel');
const mileStoneModel = require('../models/mileStoneModel');
const roomModel = require('../models/roomModel');

const { format } = require('date-fns');
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middleware/auth.middleware');
const roomMiddleware = require('../middleware/room.middleware');

const { roomCache } = require('../cache/cache');

// 獲取資料
router.get('/api/milestone/getData', authMiddleware, async (req, res) => {

    try {
        const user = req.user;

        const roomId = user.roomId;

        let mileStoneData = await mileStoneModel.findOne({ roomId });

        // 初次讀取，自動建立新文件
        if(!mileStoneData){ 

            mileStoneData = new mileStoneModel({
                roomId,
                list: []
            });
            await mileStoneData.save();
        }
        return res.send({
            type:'success',
            roomId: user.roomId,
            message:'戀愛日誌獲取成功。',
            data: mileStoneData.list.sort((a, b) => new Date(a.date) - new Date(b.date)) || [],
        });

    } catch (e) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 新增資料
router.post('/api/milestone/add', authMiddleware, async (req, res) => {

    try {
        const user = req.user;
        const roomId = user.roomId;

        let { date, event, icon } = req.body;
        if(!date || !event){
            return res.send({
                type:'error',
                message:'請提供完整的資料。'
            });
        }

        const mileStoneData = await mileStoneModel.findOne({ roomId });

        date = format(new Date(date), 'yyyy-MM-dd');

        mileStoneData.list.push({
            itemId: uuidv4(),
            date,
            event,
            icon,
        });
        await mileStoneData.save();

        return res.send({
            type:'success',
            message:'戀愛日誌新增成功。',
        });

    } catch (e ) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 刪除資料
router.delete('/api/milestone/remove/:itemId', authMiddleware, async (req, res) => {

    try {
        const user = req.user;
        const roomId = user.roomId;

        let { itemId } = req.params;
        if(!itemId){
            return res.send({
                type:'error',
                message:'請提供完整的資料。'
            });
        }

        const mileStoneData = await mileStoneModel.findOne({ roomId });

        mileStoneData.list = mileStoneData.list.filter(i => i.itemId !== itemId);
        await mileStoneData.save();

        return res.send({
            type:'success',
            message:'戀愛日誌刪除成功。',
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
router.put('/api/milestone/edit', authMiddleware, async (req, res) => {

    try {
        const user = req.user;

        const roomId = user.roomId;

        let { itemId, date, event, icon } = req.body;
        if(!itemId || !date || !event){
            return res.send({
                type:'error',
                message:'請提供完整的資料。'
            });
        }

        const mileStoneData = await mileStoneModel.findOne({ roomId });

        date = format(new Date(date), 'yyyy-MM-dd');

        const itemIndex = mileStoneData.list.findIndex(i => i.itemId === itemId);
        if(itemIndex === -1){
            return res.send({
                type:'error',
                message:'找不到對應的戀愛日誌。'
            });
        }

        mileStoneData.list[itemIndex] = {
            itemId,
            date,
            event,
            icon,
        };
        await mileStoneData.save();

        return res.send({
            type:'success',
            message:'戀愛日誌修改成功。',
        });

    } catch (e ) {
        console.log(e)
        return res.send({
            type:'error',
            message:'伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 獲取 roomInfo
router.get('/api/milestone/getRoomInfo', authMiddleware, roomMiddleware, async (req, res) => {
    try {
        
        const user = req.user; 
        const roomId = user.roomId;

        const room = req.room;
        if (!room) {
            return res.send({ type: 'error', message: '找不到該房間資訊。' });
        }

        
        const ownersData = await userModel.find(
            { token: { $in: room.owners } },
            'token name userImgUrl.url'
        ).lean();

        const formattedOwners = ownersData.map(owner => ({
                token: owner.token,
                name: owner.name,
                userImgUrl: owner.userImgUrl?.url || '',
            }))
            .sort((a, b) => (a.token === user.token ? -1 : 1))
            .map(({ token, ...rest }) => rest);

        return res.send({
            type: 'success',
            message: '房間資訊獲取成功。',
            data: {
                roomId,
                locked: room.locked,
                owners: formattedOwners,
            }
        });

    } 
    catch (e) {
        console.error(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。'
        });
    }
});

// 修改房間鎖定狀態
router.put('/api/milestone/toggleLock', authMiddleware, roomMiddleware, async (req, res) => {
    try {

        const user = req.user;
        const roomId = user.roomId;

        const updatedRoom = await roomModel.findOneAndUpdate(
            { 
                roomId, 
                owners: user.token
            },
            [{ $set: { locked: { $not: "$locked" } } }],
            { new: true }
        ).lean();

        if (!updatedRoom) {
            return res.send({
                type: 'error',
                message: '修改失敗，找不到房間或您沒有修改權限。'
            });
        }

        roomCache.delete(roomId);

        return res.send({
            type: 'success',
            message: '房間鎖定狀態修改成功。',
            data: {
                locked: updatedRoom.locked,
            }
        });

    } 
    catch (e) {
        console.error(e);
        return res.send({
            type: 'error',
            message: '伺服器錯誤，請洽客服人員協助。'
        });
    }
});
module.exports = router;