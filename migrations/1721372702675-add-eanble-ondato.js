const { DB, COLLECTION } = require('./lib');

const SETTING_KEYS = {
  ONDATO_ENABLED: 'ondatoEnabled'
};

const data = [
  {
    key: SETTING_KEYS.ONDATO_ENABLED,
    value: false,
    name: 'Enable Ondato Verification',
    description: '',
    public: true,
    type: 'boolean',
    group: 'ondato',
    editable: true
  }
];

module.exports.up = async function up(next) {
  // eslint-disable-next-line no-restricted-syntax
  for (const setting of data) {
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
  console.log('done');
  next();
};

module.exports.down = function dow(next) {
  next();
};
