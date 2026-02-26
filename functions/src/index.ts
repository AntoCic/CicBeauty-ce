import { cicInit } from 'cic-kit-firebase-functions';
import { aiGenerateText } from './routes/aiGenerate.js';

const { sendUserPush, syncPublicUser } = cicInit({
  region: 'europe-west1',
  https: { cors: true },
});

export { sendUserPush, syncPublicUser, aiGenerateText };
