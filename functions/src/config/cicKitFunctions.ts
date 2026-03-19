import { cicInit } from 'cic-kit-firebase-functions';
import { REGION } from './runtime.js';

const cicFeatures = cicInit({
  region: REGION,
  https: { cors: true },
});

export const sendUserPush = cicFeatures.sendUserPush;
export const syncPublicUser = cicFeatures.syncPublicUser;
