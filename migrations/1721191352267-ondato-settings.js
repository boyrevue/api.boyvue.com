const { DB, COLLECTION } = require('./lib');

const SETTING_KEYS = {
  ONDATO_MODE: 'ondatoMode', // sandbox or live
  ONDATO_VERSION: 'ondatoVersion',
  ONDATO_SETUP_ID: 'ondatoSetupId',
  ONDATO_CLIENT_ID: 'ondatoClientId',
  ONDATO_CLIENT_SECRET: 'ondatoClientSecret'
};

const data = [
  {
    key: SETTING_KEYS.ONDATO_MODE,
    value: 'sandbox',
    name: 'Mode',
    description:
      'Ondato mode (sandbox or live). Please switch to sandbox for testing',
    public: false,
    type: 'radio',
    group: 'ondato',
    editable: true,
    meta: {
      value: [{ key: 'sandbox', name: 'Sandbox' }, { key: 'live', name: 'Live' }]
    }
  },
  {
    key: SETTING_KEYS.ONDATO_VERSION,
    value: 'v1',
    name: 'Version',
    description:
      'Ondato version will be applied',
    public: false,
    type: 'text',
    group: 'ondato',
    editable: true
  },
  {
    key: SETTING_KEYS.ONDATO_CLIENT_ID,
    value: 'MF-Technologies Ltd.',
    name: 'Client ID',
    description:
      'Ondato Client ID is provided by Ondato',
    public: false,
    type: 'text',
    group: 'ondato',
    editable: true
  },
  {
    key: SETTING_KEYS.ONDATO_CLIENT_SECRET,
    value: '4820828aee35744a638e248214855ee5f77b75bb2cbfc4a55adf743e21ce8425',
    name: 'Client Secret',
    description:
      'Ondato Client Secret is provided by Ondato',
    public: false,
    type: 'text',
    group: 'ondato',
    editable: true
  },
  {
    key: SETTING_KEYS.ONDATO_SETUP_ID,
    value: '2db96be5-8f6a-4fe8-b9e0-a4b05d99bf13',
    name: 'Setup ID',
    description:
      'Ondato Setup ID is provided by Ondato',
    public: false,
    type: 'text',
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
