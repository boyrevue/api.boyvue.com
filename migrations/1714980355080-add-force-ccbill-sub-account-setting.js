const { DB, COLLECTION } = require('./lib');

module.exports.up = async function up(next) {
  const checkKeyRecurringNumber = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'ccbillSubAccountNumberRecurring'
  });
  if (!checkKeyRecurringNumber) {
    await DB.collection(COLLECTION.SETTING).insertOne({
      key: 'ccbillSubAccountNumberRecurring',
      value: false,
      name: 'CCbill sub account for recurring payment',
      description: 'CCBill sub account number, recurring payment such as for performer subscription feature',
      public: false,
      group: 'ccbill',
      editable: true,
      type: 'text',
      ordering: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // rename old setting
  await DB.collection(COLLECTION.SETTING).updateOne({
    key: 'ccbillSubAccountNumber'
  }, {
    $set: {
      name: 'CCbill sub account for single payment',
      description: 'CCBill sub account number, single payment such as for wallet feature'
    }
  });

  const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'ccbillForceUseGlobalConfig'
  });
  if (!checkKey) {
    const ordering = await DB.collection('settings').countDocuments({ group: 'ccbill' });
    await DB.collection(COLLECTION.SETTING).insertOne({
      key: 'ccbillForceUseGlobalConfig',
      value: false,
      name: 'Use global setting',
      description: 'Use this option when you want to apply this option to all model accounts, it will overwrite ccbill setting in model profile tab if any.',
      public: false,
      group: 'ccbill',
      editable: true,
      type: 'boolean',
      ordering,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  next();
};

module.exports.down = function down(next) {
  next();
};
