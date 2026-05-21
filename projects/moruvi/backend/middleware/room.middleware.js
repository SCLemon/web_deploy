const roomModel = require('../models/roomModel');


const { roomCache } = require('../cache/cache'); 

const roomMiddleware = async (req, res, next) => {
    const token = req.headers['x-user-token'];


    let room = roomCache.get(req.user.roomId);

    if (!room) {
        try {

            room = await roomModel.findOne({ token }).lean(); 
            
            if (!room) {
                return res.send({ type: 'error', message: '未找到房間。' });
            }

            roomCache.set(room.roomId, room);
            
        } catch (e) {
            console.error(e);
            return res.send({ type: 'error', message: '伺服器錯誤' });
        }
    }

    req.room = room;
    next();
};

module.exports = roomMiddleware;