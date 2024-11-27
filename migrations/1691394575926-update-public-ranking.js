const {
  DB, COLLECTION
} = require('./lib');

module.exports.up = async function (next) {
  await DB.collection(COLLECTION.SETTING).updateOne({
    key: 'enableModelRankingHomePage'
  }, {
    $set: {
      public: true
    }
  });

  next();
};

module.exports.down = function (next) {
  next();
};
