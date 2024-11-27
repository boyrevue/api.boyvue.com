const { DB, COLLECTION } = require('./lib');

module.exports.up = async function up(next) {
  await DB.collection(COLLECTION.SETTING).updateOne(
    {
      key: 'secureOption'
    },
    {
      $set: {
        editable: false,
        value: false
      }
    }
  );
  next();
};

module.exports.down = function down(next) {
  next();
};
