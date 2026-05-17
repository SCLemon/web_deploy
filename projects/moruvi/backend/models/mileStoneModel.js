const mongoose = require('mongoose');

const mileStoneSchema = new mongoose.Schema({
    roomId:{
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    list:[{
        itemId:{
            type: String,
            trim: true,
        },
        date:{
            type: String,
            trim: true,
        },
        event:{
            type: String,
            trim: true,
        },
        icon:{
            type: Number,
        }
    }]
});


const mileStoneModel = mongoose.model('MileStone', mileStoneSchema);

module.exports = mileStoneModel;
