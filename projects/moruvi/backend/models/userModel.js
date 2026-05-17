const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    createTime:String,
    roomId:{
        type: String,
        trim: true,
        default: '',
    },
    // 私人特徵碼（uuid）
    token: {
        type: String,
        required:true,
        unique: true,
        trim: true,
    },
    account:{
        type:String,
        required:true,
        unique: true,
        trim: true,
    },
    password:{
        type:String,
        required:true,
        trim: true,
    },
    memberNo:{
        type: String,
        trim: true,
        default: 'Moruvi #NaN',
    },
    name:{
        type: String,
        trim: true,
        default: 'Moruvi',
    },
    userImgUrl: {
        url: { 
            type: String, 
            trim: true, 
            default: 'img/user.png' 
        },
        original: { 
            type: String, 
            trim: true, 
            default: '' 
        }
    },
    lastOnline:{
        type:String,
        default:''
    },
    historyRecord:{
        type: Array,
        default: []
    },
    detail:{
        phoneNumber:{
            type:String,
            default:''
        },
        address:{
            type:String,
            default:''
        },
        mailAddress:{
            type:String,
            default:''
        },
    }
});


const userModel = mongoose.model('User', userSchema);

module.exports = userModel;
