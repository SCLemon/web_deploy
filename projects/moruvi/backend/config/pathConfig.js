
// 暫存資料夾
const tmpDirMap = {
  win32: 'D:/moruvi_database/tmp/',
  darwin: '/Volumes/moruvi_database/tmp/'
};
const tmpDir = tmpDirMap[process.platform] || '/mnt/moruvi_database/tmp/';

// 本地資料夾
const baseDirMap = {
  win32: 'D:/moruvi_database/local/',
  darwin: '/Volumes/moruvi_database/local/'
};
const baseDir = baseDirMap[process.platform] || '/mnt/moruvi_database/local/';

module.exports = {
    tmpDir, baseDir
}
