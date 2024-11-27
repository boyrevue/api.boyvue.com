const { DB, COLLECTION } = require('./lib');

const SETTING_KEYS = {
  FEED_SALE_COMMISSION: 'feedSaleCommission'
};
const settings = [
  {
    key: SETTING_KEYS.FEED_SALE_COMMISSION,
    value: 0.2,
    name: 'Feed commission',
    description: 'Feed for sale commission',
    public: false,
    group: 'commission',
    editable: true,
    type: 'number'
  }
];
module.exports.up = async function up(next) {
  // eslint-disable-next-line no-console
  console.log('Migrate feed commission settings');
  // eslint-disable-next-line no-restricted-syntax
  for (const setting of settings) {
    // eslint-disable-next-line no-await-in-loop
    const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
      key: setting.key
    });
    if (!checkKey) {
      // eslint-disable-next-line no-await-in-loop
      await DB.collection(COLLECTION.SETTING).insertOne({
        ...setting,
        type: setting.type || 'text',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      // eslint-disable-next-line no-console
      console.log(`Inserted setting: ${setting.key}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Setting: ${setting.key} exists`);
    }
  }
  // eslint-disable-next-line no-console
  console.log('Migrate feed commission setting done');
  next();
};
module.exports.down = function down(next) {
  next();
};
