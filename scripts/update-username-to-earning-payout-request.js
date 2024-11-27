const { DB, COLLECTION } = require('../migrations/lib');

module.exports = async () => {
  const earnings = await DB.collection(COLLECTION.EARNING).find().toArray();

  await earnings.reduce(async (lastPromise, earning) => {
    await lastPromise;

    const [
      user,
      performer
    ] = await Promise.all([
      DB.collection(COLLECTION.USER).findOne({
        _id: earning.userId
      }),
      DB.collection(COLLECTION.PERFORMER).findOne({
        _id: earning.performerId
      })
    ]);

    return DB.collection(COLLECTION.EARNING).updateOne(
      { _id: earning._id },
      {
        $set: {
          userUsername: user.username,
          performerUsername: performer.username
        }
      }
    );
  }, Promise.resolve());

  const payoutRequests = await DB.collection(COLLECTION.PAYOUT_REQUESTS).find().toArray();

  await payoutRequests.reduce(async (lastPromise, request) => {
    await lastPromise;

    const [
      performer
    ] = await Promise.all([
      DB.collection(COLLECTION.PERFORMER).findOne({
        _id: request.sourceId
      })
    ]);

    return DB.collection(COLLECTION.PAYOUT_REQUESTS).updateOne(
      { _id: request._id },
      {
        $set: {
          sourceUsername: performer.username
        }
      }
    );
  }, Promise.resolve());
};
