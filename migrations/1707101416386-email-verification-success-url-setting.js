const { DB, COLLECTION } = require('./lib');

module.exports.up = async function (next) {
  const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'emailVerifiedSuccessUrl'
  });
  if (!checkKey) {
    const ordering = await DB.collection(COLLECTION.SETTING).countDocuments({ group: 'general' });

    await DB.collection(COLLECTION.SETTING).insertOne({
      key: 'emailVerifiedSuccessUrl',
      value: `https://${process.env.DOMAIN}/auth/login`,
      name: 'Email verification success URL',
      description: 'Redirect link after user clicks to email verification link.',
      public: false,
      autoload: false,
      group: 'general',
      editable: true,
      type: 'text',
      ordering,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  next();
};

module.exports.down = function (next) {
  next();
};
