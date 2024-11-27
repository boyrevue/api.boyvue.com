const { DB, COLLECTION } = require('./lib');

const keys = {
  EMERCHANT_ENABLED: 'emerchantEnabled',
  EMERCHANT_API_ENVIROMENT: 'emerchantAPIEnviroment',
  EMERCHANT_USERNAME: 'emerchantUsername',
  EMERCHANT_PASSWORD: 'emerchantPassword',
  EMERCHANT_CURRENCY: 'emerchantCurrency'
};

const settings = [
  {
    key: keys.EMERCHANT_ENABLED,
    value: false,
    name: 'Enable',
    description:
      'Active emerchanpay',
    type: 'boolean',
    public: true,
    autoload: true,
    group: 'emerchant',
    editable: true,
    visible: true
  },
  {
    key: keys.EMERCHANT_API_ENVIROMENT,
    value: false,
    name: 'Environments',
    description: 'Enable for test mode and else',
    public: false,
    type: 'boolean',
    autoload: false,
    group: 'emerchant',
    editable: true,
    visible: true
  },
  {
    key: keys.EMERCHANT_USERNAME,
    value: '',
    name: 'Api login',
    description: 'Configuration / Merchants / terminals',
    public: false,
    autoload: false,
    group: 'emerchant',
    editable: true,
    visible: true
  },
  {
    key: keys.EMERCHANT_PASSWORD,
    value: '',
    name: 'Api password',
    description: '',
    public: false,
    autoload: false,
    group: 'emerchant',
    editable: true,
    visible: true
  },
  {
    key: keys.EMERCHANT_CURRENCY,
    value: 'EUR',
    name: 'Currency',
    description: '',
    public: false,
    autoload: false,
    group: 'emerchant',
    editable: true,
    visible: true
  }
];

module.exports.up = async function up(next) {
  // eslint-disable-next-line no-console
  console.log('Migrate settings');

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
  console.log('Migrate settings done');
  next();
};

module.exports.down = function down(next) {
  next();
};
