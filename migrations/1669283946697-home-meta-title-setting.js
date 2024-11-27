const { DB, COLLECTION } = require('./lib');

module.exports.up = async function up(next) {
  const meta = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'homeTitle'
  });

  if (!meta) {
    await DB.collection(COLLECTION.SETTING).insertOne({
      key: 'homeTitle',
      value: 'xFans',
      name: 'Home title',
      description: 'Custom title for home page (landing page)',
      public: true,
      autoload: false,
      group: 'custom',
      editable: true,
      visible: true,
      type: 'text',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  await DB.collection(COLLECTION.SETTING).updateOne({ key: 'metaKeywords' }, {
    $set: {
      key: 'homeMetaKeywords',
      description: 'Custom meta keywords for home page (landing page).',
      autoload: false,
      public: true
    }
  });

  await DB.collection(COLLECTION.SETTING).updateOne({ key: 'metaDescription' }, {
    $set: {
      key: 'homeMetaDescription',
      description: 'Custom meta description for home page (landing page). Description should be max 160 characters.',
      autoload: false,
      public: true
    }
  });

  next();
};

module.exports.down = function down(next) {
  next();
};
