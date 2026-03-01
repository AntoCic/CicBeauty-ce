import { cicInit } from 'cic-kit-firebase-functions';
import { marketingAgent } from './agents/marketingAgent.js';
import { metaAIAgent } from './agents/metaAIAgent.js';
import { catalogChatAgent } from './agents/catalogChatAgent.js';
import { relayProjectMessage } from './agents/projectMessageRelay.js';
import { REGION } from './config/runtime.js';

const { sendUserPush, syncPublicUser } = cicInit({
  region: REGION,
  https: { cors: true },
});

export { sendUserPush, syncPublicUser, marketingAgent, metaAIAgent, catalogChatAgent, relayProjectMessage };
