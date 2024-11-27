const {
  DB, COLLECTION
} = require('./lib');

module.exports.up = async function up(next) {
  await DB.collection(COLLECTION.SETTING).updateMany({
    public: true,
    autoload: null
  }, {
    $set: {
      autoload: true
    }
  });
  next();
};

module.exports.down = function down(next) {
  next();
};
