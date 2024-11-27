const { DB, COLLECTION } = require('./lib');

module.exports.up = async function up(next) {
  const loadingIconSetting = {
    key: 'pageLoadingIconUrl',
    value: '',
    name: 'Page loading icon',
    description: 'Loading icon when navigating',
    public: true,
    autoload: true,
    group: 'general',
    editable: true,
    meta: {
      upload: true,
      image: true
    }
  };
  const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'pageLoadingIconUrl'
  });
  if (!checkKey) {
    // eslint-disable-next-line no-await-in-loop
    await DB.collection(COLLECTION.SETTING).insertOne({
      ...loadingIconSetting,
      type: 'text',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  next();
};

module.exports.down = function down(next) {
  next();
};
