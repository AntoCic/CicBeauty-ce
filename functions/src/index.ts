import { cicInit } from 'cic-kit-firebase-functions';
import { marketingAgent } from './agents/marketingAgent.js';
import { metaAIAgent } from './agents/metaAIAgent.js';
import { catalogChatAgent } from './agents/catalogChatAgent.js';
import { publishProjectMessage, relayProjectMessage } from './agents/projectMessageRelay.js';
import { availabilityAgent } from './agents/availabilityAgent.js';
import { syncAppointmentGoogleCalendar, syncGoogleCalendarAcl } from './agents/googleCalendarSync.js';
import { legacyTreatmentMapper } from './agents/legacyTreatmentMapper.js';
import { sendWhatsAppTestMessage } from './agents/sendWhatsAppTestMessage.js';
import {
  listWhatsAppInboundMessages,
  whatsAppInboundWebhook,
} from './agents/whatsAppInboundWebhook.js';
import { REGION } from './config/runtime.js';

const { sendUserPush, syncPublicUser } = cicInit({
  region: REGION,
  https: { cors: true },
});

export {
  sendUserPush,
  syncPublicUser,
  marketingAgent,
  metaAIAgent,
  catalogChatAgent,
  publishProjectMessage,
  relayProjectMessage,
  availabilityAgent,
  syncAppointmentGoogleCalendar,
  syncGoogleCalendarAcl,
  legacyTreatmentMapper,
  sendWhatsAppTestMessage,
  whatsAppInboundWebhook,
  listWhatsAppInboundMessages,
};
