const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
    token:{
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    // 發布的任務
    postMission:[
        {
            creator:{
                type: String,
                trim: true,
                required: true,
            },
            itemId:{
                type: String,
                trim: true,
            },
            date:{
                type: String,
                trim: true,
            },
            money:{
                type: Number,
                default: 0,
            },
            title:{
                type: String,
                trim: true,
            },
            description:{
                type: String,
                trim: true,
            },
            status:{
                type: String,
                trim: true,
                default: '待批准'
            }
        }
    ],
    // 接取的任務
    getMission:[
        {
            creator:{
                type: String,
                trim: true,
                required: true,
            },
            itemId:{
                type: String,
                trim: true,
            },
            date:{
                type: String,
                trim: true,
            },
            money:{
                type: Number,
                default: 0,
            },
            title:{
                type: String,
                trim: true,
            },
            description:{
                type: String,
                trim: true,
            },
            status:{
                type: String,
                trim: true,
                default: '待批准'
            }
        }
    ]

});



const missionModel = mongoose.model('Mission', missionSchema);

module.exports = missionModel;
