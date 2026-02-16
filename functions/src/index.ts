import { cicInit } from 'cic-kit-firebase-functions';

const { sendUserPush, syncPublicUser } = cicInit({
  region: 'europe-west1',
  https: { cors: true },
});

export { sendUserPush, syncPublicUser };