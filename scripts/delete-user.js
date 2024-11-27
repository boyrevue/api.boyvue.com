const { tail } = require('lodash');
const { existsSync, unlinkSync } = require('fs');
const {
  DB,
  COLLECTION
} = require('../migrations/lib');

const removeFiles = async (obj) => {
  const fileIds = [];
  if (obj.fileId) fileIds.push(obj.fileId);
  if (obj.thumbnailId) fileIds.push(obj.thumbnailId);
  if (obj.teaserId) fileIds.push(obj.teaserId);
  if (obj.photoId) fileIds.push(obj.photoId);
  if (obj.videoId) fileIds.push(obj.videoId);
  if (obj.documentId) fileIds.push(obj.documentId);
  if (obj.avatarId) fileIds.push(obj.avatarId);
  if (obj.coverId) fileIds.push(obj.coverId);
  if (obj.idVerificationId) fileIds.push(obj.idVerificationId);
  if (obj.documentVerificationId) fileIds.push(obj.documentVerificationId);
  if (obj.welcomeVideoId) fileIds.push(obj.welcomeVideoId);

  if (!fileIds.length) return;

  const files = await DB.collection('files').find({
    _id: {
      $in: fileIds
    }
  })
    .toArray();
  await files.reduce(async (lp, file) => {
    await lp;

    // remove physical files
    // do not support s3 yet
    const paths = [];
    if (file.path) paths.push(file.path);
    if (file.absolutePath) paths.push(file.absolutePath);
    if (file.blurImagePath) paths.push(file.blurImagePath);
    if (file.thumbnails && file.thumbnails.length) {
      file.thumbnails.forEach((f) => {
        if (f.path) paths.push(f.path);
        if (f.absolutePath) paths.push(f.absolutePath);
      });
    }

    paths.forEach((p) => {
      if (existsSync(p)) unlinkSync(p);
    });

    return Promise.resolve();
  }, Promise.resolve());
};

const removeElement = async (collectionName, performerId) => {
  const items = await DB.collection(collectionName).find({
    $or: [{
      _id: performerId
    }, {
      performerId
    }, {
      userId: performerId
    }, {
      targetId: performerId
    }, {
      objectId: performerId
    }, {
      itemId: performerId
    }, {
      sourceId: performerId
    }, {
      senderId: performerId
    }]
  })
    .toArray();
  await items.reduce(async (lp, item) => {
    await lp;
    await removeFiles(item);
    await DB.collection(collectionName).deleteOne({ _id: item._id });
    return Promise.resolve();
  }, Promise.resolve());
};

module.exports = async () => {
  const args = process.argv.slice(2);
  const userIds = tail(args);
  if (!userIds.length) return;
  const performers = await DB.collection(COLLECTION.PERFORMER).find({
    $or: [{
      username: {
        $in: userIds
      }
    }, {
      email: {
        $in: userIds
      }
    }]
  }).toArray();
  const users = await DB.collection(COLLECTION.USER).find({
    $or: [{
      username: {
        $in: userIds
      }
    }, {
      email: {
        $in: userIds
      }
    }]
  }).toArray();
  const usersToDelete = [
    ...performers,
    ...users
  ];
  await usersToDelete.reduce(async (lp, user) => {
    await lp;
    const conversations = await DB.collection(COLLECTION.CONVERSATION).find({
      recipients: {
        $elemMatch: {
          sourceId: user._id
        }
      }
    }).toArray();
    await conversations.reduce(async (cp, conversation) => {
      await cp;
      await DB.collection(COLLECTION.MESSAGE).deleteMany({
        conversationId: conversation._id
      });
      return Promise.resolve();
    }, Promise.resolve());
    await DB.collection(COLLECTION.CONVERSATION).deleteMany({
      _id: {
        $in: conversations.map((c) => c._id)
      }
    });

    await [
      'auth',
      'bankingsettings',
      'blockcountries',
      'blockedbyperformers',
      'comments',
      'conversations',
      'earnings',
      'earningtokens',
      'feedfiles',
      'feeds',
      'forgot',
      'marketplace_products',
      'matchings',
      'messages',
      'notificationmessages',
      'notitcations',
      'oauthloginsocials',
      'orderdetails',
      'orders',
      'paymentgatewaysettings',
      'paymenttokens',
      'paymenttransactions',
      'paymentwallettransactions',
      'payoutrequests',
      'payoutrequesttokens',
      'performerassetmaps',
      'performerbankingsettings',
      'performerblockcountries',
      'performerblockcountriessettings',
      'performerblockusers',
      'performerblogs',
      'performercategories',
      'performercommissionsettings',
      'performergalleries',
      'performermonthlystats',
      'performerpaymentgatewaysettings',
      'performerphotos',
      'performerproducts',
      'performers',
      'performersettings',
      'performerstats',
      'performerstories',
      'performersubscriptionpackages',
      'performertrendings',
      'performervideos',
      'performerwishlists',
      'places',
      'polls',
      'postmetas',
      'posts',
      'reacts',
      'referralEarnings',
      'referralReport',
      'reportcontents',
      'reports',
      'reverselists',
      'siteblockcountries',
      'socialconnects',
      'socialconnectsettings',
      'stories',
      'streamgoals',
      'streams',
      'userfavourites',
      'usermatches',
      'users',
      'usersubscriptions',
      'verifications',
      'votes'
    ].reduce(async (pp, collectionName) => {
      await pp;
      await removeElement(collectionName, user._id);
      await removeFiles(user);

      return Promise.resolve();
    }, Promise.resolve());

    return Promise.resolve();
  }, Promise.resolve());
};
