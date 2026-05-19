const mongoose = require('mongoose');

const cloudSchema = new mongoose.Schema({
    roomId:{
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    folders:[
        {
            createTime: String,
            folderId:{
                type: String,
                trim: true,
                required: true
            },
            folderPath:{
                type: String,
                trim: true,
                default: '',
            },
            folderName:{
                type: String,
                trim: true,
                default: '新資料夾',
            },
            files:[
                {
                    createTime: String,
                    fileId:{
                        type: String,
                        trim: true,
                        required: true
                    },
                    fileName:{
                        type: String,
                        trim: true,
                        default: '新檔案',
                    },
                    filePath:{
                        type: String,
                        trim: true,
                        default: '',
                    },
                }
             ]
        }
    ]
});


const cloudModel = mongoose.model('Cloud', cloudSchema);

module.exports = cloudModel;
