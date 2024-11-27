const { readFileSync } = require('fs');
const { join } = require('path');
const { DB, COLLECTION } = require('./lib');

const TEMPLATE_DIR = join(__dirname, '..', 'templates', 'emails');

module.exports.up = async function up(next) {
  // setting option
  const checkKey = await DB.collection(COLLECTION.SETTING).findOne({
    key: 'requireEmailVerification'
  });
  const defaultValue = checkKey ? checkKey.value : false;

  await DB.collection(COLLECTION.SETTING).insertOne({
    key: 'requireEmailVerificationUser',
    value: defaultValue,
    name: 'Email Verification for Users',
    description:
      'Require users to verify email address to login.',
    public: false,
    group: 'general',
    editable: true,
    type: 'boolean',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await DB.collection(COLLECTION.SETTING).insertOne({
    key: 'requireEmailVerificationPerformer',
    value: defaultValue,
    name: 'Email Verification for Models',
    description:
      'Require models to verify their email address to login.',
    public: false,
    group: 'general',
    editable: true,
    type: 'boolean',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // update email template
  const emailVerificationContent = await DB.collection(COLLECTION.EMAIL_TEMPLATE).findOne({ key: 'email-verificaiton' });
  const defaultContent = emailVerificationContent ? emailVerificationContent.content : null;
  const exist = await DB.collection(COLLECTION.EMAIL_TEMPLATE).findOne({ key: 'email-verification-user' });
  if (!exist) {
    await DB.collection(COLLECTION.EMAIL_TEMPLATE).insertOne({
      key: 'email-verification-user',
      content:
        defaultContent
        || readFileSync(
          join(TEMPLATE_DIR, 'email-verification-user.html')
        ).toString(),
      subject: 'Please verify your email address',
      name: 'Email Verification for Users',
      description:
        'Template for the email sent to users to verify their email address.',
      layout: 'layouts/default',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  const exist2 = await DB.collection(COLLECTION.EMAIL_TEMPLATE).findOne({ key: 'email-verification-performer' });
  if (!exist2) {
    await DB.collection(COLLECTION.EMAIL_TEMPLATE).insertOne({
      key: 'email-verification-performer',
      content:
        defaultContent
        || readFileSync(
          join(TEMPLATE_DIR, 'email-verification-performer.html')
        ).toString(),
      subject: 'Please verify your email address',
      name: 'Email Verification for Models',
      description:
        'Template for the email sent to models to verify their email address.',
      layout: 'layouts/default',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  next();
};

module.exports.down = function down(next) {
  next();
};
