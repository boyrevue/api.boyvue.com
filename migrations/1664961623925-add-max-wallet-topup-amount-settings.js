const { DB, COLLECTION } = require('./lib');

module.exports.up = async function (next) {
  const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'maxWalletTopupAmount'
  });
  if (!checkKey) {
    // eslint-disable-next-line no-await-in-loop
    await DB.collection(COLLECTION.SETTING).insertOne({
      key: 'maxWalletTopupAmount',
      value: 100,
      name: 'Max wallet topup amount',
      description: 'Max amount user can topup to wallet each time',
      public: true,
      group: 'general',
      editable: true,
      type: 'number',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  next();
};

module.exports.down = function (next) {
  next();
};
