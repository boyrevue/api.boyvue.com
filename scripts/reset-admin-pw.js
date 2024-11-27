const {
  DB, COLLECTION, generateSalt, encryptPassword
} = require('../migrations/lib');

const defaultPassword = 'adminadmin';

async function createAuth(newUser, userId, type = 'email') {
  const salt = generateSalt();
  const authCheck = await DB.collection(COLLECTION.AUTH).findOne({
    type: 'password',
    source: 'user',
    sourceId: userId
  });
  if (!authCheck) {
    await DB.collection(COLLECTION.AUTH).insertOne({
      type: 'password',
      source: 'user',
      sourceId: userId,
      salt,
      value: encryptPassword(defaultPassword, salt),
      key: type === 'email' ? newUser.email : newUser.username
    });
  } else {
    await DB.collection(COLLECTION.AUTH).updateOne({
      type: 'password',
      source: 'user',
      sourceId: userId
    }, {
      $set: {
        type: 'password',
        salt,
        value: encryptPassword(defaultPassword, salt),
        key: type === 'email' ? newUser.email : newUser.username
      }
    });
  }
}

module.exports = async () => {
  let adminUsers = await DB.collection(COLLECTION.USER).find({ roles: 'admin' }).toArray();

  if (!adminUsers.length) {
    await DB.collection(COLLECTION.USER).insertOne({
      firstName: 'Admin',
      lastName: 'Admin',
      email: `admin@${process.env.DOMAIN || 'example.com'}`,
      username: 'admin',
      roles: ['admin'],
      status: 'active',
      verifiedEmail: true
    });

    adminUsers = await DB.collection(COLLECTION.USER).find({ roles: 'admin' }).toArray();
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const admin of adminUsers) {
    // eslint-disable-next-line no-await-in-loop
    await DB.collection(COLLECTION.USER).updateOne({ _id: admin._id }, {
      $set: {
        verifiedEmail: true
      }
    });

    // eslint-disable-next-line no-await-in-loop
    await createAuth(admin, admin._id, 'email');
  }
};
