const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    createTime:String,
    roomId:{
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    locked:{
        type: Boolean,
        default: true,
    },
    roomName:{
        type: String,
        trim: true,
        default: '甜蜜小屋',
    },
    owners:{ // 最多兩人
        type: Array,
        default: [],
    },
    database:{
        url:{
            type: String,
            trim: true,
            default: '',
        },
        limit:{
            memory:{
                type: Number,
                default: 0.032*1024*1024 // kB
            }
        }

    }
});


const roomModel = mongoose.model('Room', roomSchema);

module.exports = roomModel;
