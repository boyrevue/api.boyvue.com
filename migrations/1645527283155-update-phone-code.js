const { DB, COLLECTION, PHONE_CODE } = require('./lib');

module.exports.up = async function up(next) {
  const performers = await DB.collection(COLLECTION.PERFORMER).find({ phoneCode: { $exists: true } }).toArray();
  await performers.reduce(async (lp, performer) => {
    await lp;
    if (!performer.phoneCode) return Promise.resolve();

    const phone = PHONE_CODE.find((phone) => phone.dialCode === performer.phoneCode);
    if (!phone) return Promise.resolve();
    return DB.collection(COLLECTION.PERFORMER).updateOne({ _id: performer._id }, {
      $set: {
        phoneCode: `${phone.code}_${phone.dialCode}`
      }
    });
  }, Promise.resolve());
  next();
};

module.exports.down = function down(next) {
  next();
};