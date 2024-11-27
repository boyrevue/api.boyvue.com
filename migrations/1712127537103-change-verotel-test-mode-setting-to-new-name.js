const { DB, COLLECTION } = require('./lib');

module.exports.up = async function (next) {
  await DB.collection(COLLECTION.SETTING).updateOne({ key: 'verotelTestMode' }, {
    $set: {
      key: 'verotelIsVerotel',
      name: 'Verotel or billing.creditcard',
      description: 'Enable if you are using verotel.com service, disable if use billing.creditcard servoce'
    }
  });

  next();
};

module.exports.down = function (next) {
  next();
};
