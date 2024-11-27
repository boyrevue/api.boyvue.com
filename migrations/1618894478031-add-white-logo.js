const { DB, COLLECTION } = require('./lib');

const SETTING_KEYS = {
  WHITE_LOGO_URL: 'whiteLogoUrl'
};

const settings = [
  {
    key: SETTING_KEYS.WHITE_LOGO_URL,
    value: '',
    name: 'White Logo',
    description: 'Site white logo',
    public: true,
    autoload: true,
    group: 'general',
    editable: true,
    meta: {
      upload: true,
      image: true
    }
  }
];

module.exports.up = async function up(next) {
  // eslint-disable-next-line no-console
  console.log('Migrate white logo settings');

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
  console.log('Migrate white logo settings done');
  next();
};

module.exports.down = function down(next) {
  next();
};
