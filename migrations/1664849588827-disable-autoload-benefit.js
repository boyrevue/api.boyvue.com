const {
  DB, COLLECTION
} = require('./lib');

module.exports.up = async function up(next) {
  await DB.collection(COLLECTION.SETTING).updateMany({
    key: {
      $in: [
        'userBenefit',
        'modelBenefit',
        'loginPlaceholderImage'
      ]
    }
  }, {
    $set: {
      autoload: false
    }
  });
  next();
};

module.exports.down = function down(next) {
  next();
};
