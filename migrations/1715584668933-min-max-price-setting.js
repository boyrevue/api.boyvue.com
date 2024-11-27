const { DB } = require('./lib');

const SETTING_KEYS = {
  MIN_SUBSCRIPTION_PRICE: 'minSubscriptionPrice',
  MAX_SUBSCRIPTION_PRICE: 'maxSubscriptionPrice',
  MIN_TOPUP_WALLET_AMOUNT: 'minTopupWalletAmount',
  MAX_TOPUP_WALLET_AMOUNT: 'maxTopupWalletAmount',
  MIN_TIPPING_AMOUNT: 'minTippingAmount',
  MAX_TIPPING_AMOUNT: 'maxTippingAmount'
};

const settings = [
  {
    key: SETTING_KEYS.MIN_SUBSCRIPTION_PRICE,
    value: 2.95,
    name: 'Minimum subscription price',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 1
  },
  {
    key: SETTING_KEYS.MAX_SUBSCRIPTION_PRICE,
    value: 200,
    name: 'Maximum subscription price',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 2
  },
  {
    key: SETTING_KEYS.MIN_TOPUP_WALLET_AMOUNT,
    value: 10,
    name: 'Minimum topup wallet amount',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 3
  },
  {
    key: SETTING_KEYS.MAX_TOPUP_WALLET_AMOUNT,
    value: 1000,
    name: 'Maximum topup wallet amount',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 4
  },
  {
    key: SETTING_KEYS.MIN_TIPPING_AMOUNT,
    value: 10,
    name: 'Minimum tipping amount',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 5
  },
  {
    key: SETTING_KEYS.MAX_TIPPING_AMOUNT,
    value: 1000,
    name: 'Maximum tipping amount',
    description: '',
    public: true,
    group: 'pricing',
    editable: true,
    type: 'number',
    meta: {
      min: 0,
      step: 0.1
    },
    autoload: false,
    ordering: 6
  }
];

module.exports.up = async function up(next) {
  await settings.reduce(async (cb, setting) => {
    await cb;
    const check = await DB.collection('settings').findOne({ key: setting.key });
    if (!check) {
      await DB.collection('settings').insertOne({
        ...setting,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return Promise.resolve();
  }, Promise.resolve());

  // repalce value of max topup wallet and remove that key
  const maxWalletTopupAmount = await DB.collection('settings').findOne({
    key: 'maxWalletTopupAmount'
  });
  if (maxWalletTopupAmount && maxWalletTopupAmount.value) {
    await DB.collection('settings').updateOne({
      key: SETTING_KEYS.MAX_TOPUP_WALLET_AMOUNT
    }, {
      $set: {
        value: maxWalletTopupAmount.value
      }
    });
  }
  await DB.collection('settings').deleteOne({
    key: 'maxWalletTopupAmount'
  });

  next();
};

module.exports.down = function down(next) {
  next();
};
