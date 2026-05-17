
const isProd = true;

module.exports = {
  DBHOST: isProd ? 'moruvi_mongo' : '127.0.0.1',
  DBPORT: 27017,
  DBNAME: 'moruvi'
};
