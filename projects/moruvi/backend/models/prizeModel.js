const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
    token:{
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    money:{
        type: Number,
        default: 0,
    },
    // 發布的獎勵
    postPrize:[
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
        }
    ],
    // 兌換的獎勵
    exchangePrize:[
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
                type: Boolean,
                default: false // false 表示未兌換，true表示已兌換
            }
        }
    ]
});



const prizeModel = mongoose.model('Prize', prizeSchema);

module.exports = prizeModel;
