const { DB, COLLECTION } = require('./lib');

module.exports.up = async function up(next) {
  await DB.collection(COLLECTION.SETTING).updateMany({
    public: true,
    autoload: {
      $ne: false
    }
  }, {
    $set: {
      autoload: true
    }
  });

  // remove SEO home meta settings autoload
  await DB.collection(COLLECTION.SETTING).updateMany({
    key: {
      $in: [
        'metaKeywords',
        'metaDescription'
      ]
    }
  }, {
    $set: {
      autoload: false
    }
  });

  // change name
  await DB.collection(COLLECTION.SETTING).updateOne({ key: 'metaKeywords' }, {
    $set: {
      name: 'Home meta keywords',
      description: 'SEO Meta keywords for Home page'
    }
  });
  await DB.collection(COLLECTION.SETTING).updateOne({ key: 'metaDescription' }, {
    $set: {
      name: 'Home meta description',
      description: 'SEO Meta description for Home page'
    }
  });

  next();
};

module.exports.down = function down(next) {
  next();
};
