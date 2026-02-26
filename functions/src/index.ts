import { cicInit } from 'cic-kit-firebase-functions';
import { marketingAgent } from './agents/marketingAgent.js';
import { productChatAgent } from './agents/productChatAgent.js';
import { REGION } from './config/runtime.js';

const { sendUserPush, syncPublicUser } = cicInit({
  region: REGION,
  https: { cors: true },
});

export { sendUserPush, syncPublicUser, marketingAgent, productChatAgent };
