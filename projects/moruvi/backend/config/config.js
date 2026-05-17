
const isProd = false;

module.exports = {
  DBHOST: isProd ? 'Moruvi_mongo' : '127.0.0.1',
  DBPORT: 27017,
  DBNAME: 'Moruvi'
};
