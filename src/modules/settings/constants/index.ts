export const SETTING_CHANNEL = 'SETTINGS';

export const SETTING_KEYS = {
  SITE_NAME: 'siteName',
  LOGO_URL: 'logoUrl',
  FAVICON: 'favicon',
  LOGIN_PLACEHOLDER_IMAGE: 'loginPlaceholderImage',
  REQUIRE_EMAIL_VERIFICATION: 'requireEmailVerification',
  ADMIN_EMAIL: 'adminEmail',
  SENDER_EMAIL: 'senderEmail',
  META_KEYWORDS: 'metaKeywords',
  META_DESCRIPTION: 'metaDescription',
  HEADER_SCRIPT: 'headerScript',
  AFTER_BODY_SCRIPT: 'afterBodyScript',
  MONTHLY_SUBSCRIPTION_COMMISSION: 'monthlySubscriptionCommission',
  YEARLY_SUBSCRIPTION_COMMISSION: 'yearlySubscriptionCommission',
  VIDEO_SALE_COMMISSION: 'videoSaleCommission',
  PRODUCT_SALE_COMMISSION: 'productSaleCommission',
  ENABLE_CCBILL: 'ccbillEnabled',
  FEED_SALE_COMMISSION: 'feedSaleCommission',
  CCBILL_SUB_ACCOUNT_NUMBER: 'ccbillSubAccountNumber',
  CCBILL_SUB_ACCOUNT_NUMBER_RECURRING: 'ccbillSubAccountNumberRecurring',
  CCBILL_FLEXFORM_ID: 'ccbillFlexformId',
  CCBILL_SALT: 'ccbillSalt',
  CCBILL_CURRENCY_CODE: 'ccbilCurrencyCode',
  CCBILL_FORCE_USE_GLOBAL_CONFIG: 'ccbillForceUseGlobalConfig',
  USE_SENDGRID_TRANSPORTER: 'useSengridTransporter',
  SMTP_TRANSPORTER: 'smtpTransporter',
  GOOGLE_ANALYTICS_CODE: 'gaCode',
  MAINTENANCE_MODE: 'maintenanceMode',
  CCBILL_CLIENT_ACCOUNT_NUMBER: 'ccbillClientAccountNumber',
  CCBILL_DATALINK_USERNAME: 'ccbillDatalinkUsername',
  CCBILL_DATALINK_PASSWROD: 'ccbillDatalinkPassword',
  PRIVATE_C2C_DEFAULT_PRICE: 'privateC2CDefaultPrice',
  PRIVATE_CHAT_COMMISSION: ' privateChatDefaultCommission',
  TOKEN_TIP_COMMISSION: 'tokenTipCommission',
  VIEWER_URL: 'viewerURL',
  PUBLISHER_URL: 'publisherURL',
  SUBSCRIBER_URL: 'subscriberUrl',
  OPTION_FOR_BROADCAST: 'optionForBroadcast',
  OPTION_FOR_PRIVATE: 'optionForPrivate',
  SECURE_OPTION: 'secureOption',
  ANT_MEDIA_API_ENDPOINT: 'AntMediaApiEndpoint',
  ANT_MEDIA_APPNAME: 'AntMediaAppname',
  FOOTER_CONTENT: 'footerContent',
  USER_BENEFIT: 'userBenefit',
  MODEL_BENEFIT: 'modelBenefit',

  // verotel configuration
  VEROTEL_SHOP_ID: 'verotelShopId',
  VEROTEL_FLEXPAY_SIGNATURE_KEY: 'verotelFlexpaySignatureKey',
  VEROTEL_API_VERSION: 'verotelApiVersion',
  VEROTEL_CURRENCY: 'verotelCurrency',
  VEROTEL_ENABLED: 'verotelEnabled',
  VEROTEL_IS_VEROTEL_SERVICE: 'verotelIsVerotel',

  SEND_MODEL_ONBOARD_INSTRUCTION: 'sendModelOnboardInstruction',
  REQUIRE_EMAIL_VERIFICATION_USER: 'requireEmailVerificationUser',
  REQUIRE_EMAIL_VERIFICATION_PERFORMER: 'requireEmailVerificationPerformer',

  ENABLE_MODEL_RANKING_HOME_PAGE: 'enableModelRankingHomePage',

  EMAIL_VERIFIED_SUCCESS_URL: 'emailVerifiedSuccessUrl',

  MIN_SUBSCRIPTION_PRICE: 'minSubscriptionPrice',
  MAX_SUBSCRIPTION_PRICE: 'maxSubscriptionPrice',
  MIN_TOPUP_WALLET_AMOUNT: 'minTopupWalletAmount',
  MAX_TOPUP_WALLET_AMOUNT: 'maxTopupWalletAmount',
  MIN_TIPPING_AMOUNT: 'minTippingAmount',
  MAX_TIPPING_AMOUNT: 'maxTippingAmount',

  ONDATO_MODE: 'ondatoMode',
  ONDATO_VERSION: 'ondatoVersion',
  ONDATO_SETUP_ID: 'ondatoSetupId',
  ONDATO_CLIENT_ID: 'ondatoClientId',
  ONDATO_CLIENT_SECRET: 'ondatoClientSecret',
  ONDATO_ENABLED: 'ondatoEnabled',
  // Emerchantpay
  EMERCHANT_API_ENVIROMENT: 'emerchantAPIEnviroment',
  EMERCHANT_USERNAME: 'emerchantUsername',
  EMERCHANT_PASSWORD: 'emerchantPassword',
  EMERCHANT_CURRENCY: 'emerchantCurrency',
  EMERCHANT_ENABLED: 'emerchantEnabled',
  EMERCHANT_TEMINAL_TOKEN: 'emerchantTerminalToken'
};

export const MENU_SECTION = {
  MAIN: 'main',
  HEADER: 'header',
  FOOTER: 'footer'
};

export const WHITELIST_IPS = [
  // local IP
  '127.0.0.1', '0.0.0.1', '0.0.0.0', '::1', '::ffff:'
];
