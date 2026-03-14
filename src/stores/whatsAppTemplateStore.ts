import { reactive } from 'vue'
import { FirestoreStore } from 'cic-kit'
import {
  WHATSAPP_TEMPLATE_CONFIG_ID,
  mergeWhatsAppTemplateWithDefaults,
  WhatsAppTemplate,
  type WhatsAppTemplateData,
  type WhatsAppTemplateKey,
} from '../models/WhatsAppTemplate'
import {
  replaceWhatsAppPlaceholders,
  sendWhatsAppMessage,
  type WhatsAppTemplateVariables,
} from '../utils/whatsapp'

export type WhatsAppMessageType = 'confirmation' | 'update' | 'delete' | 'reminder'

const MESSAGE_TYPE_TO_TEMPLATE_KEY: Record<WhatsAppMessageType, WhatsAppTemplateKey> = {
  confirmation: 'confirmationTemplate',
  update: 'updateTemplate',
  delete: 'deleteTemplate',
  reminder: 'reminderTemplate',
}

class WhatsAppTemplateStore extends FirestoreStore<WhatsAppTemplate, WhatsAppTemplateData> {
  constructor() {
    super(WhatsAppTemplate)
  }

  getConfig() {
    return this.findItemsById(WHATSAPP_TEMPLATE_CONFIG_ID)
  }

  getConfigData() {
    return mergeWhatsAppTemplateWithDefaults(this.getConfig()?.toData())
  }

  templateKeyFromType(type: WhatsAppMessageType) {
    return MESSAGE_TYPE_TO_TEMPLATE_KEY[type]
  }

  getTemplate(type: WhatsAppMessageType) {
    const data = this.getConfigData()
    return data[this.templateKeyFromType(type)]
  }

  renderTemplate(type: WhatsAppMessageType, variables: WhatsAppTemplateVariables) {
    const template = this.getTemplate(type)
    return replaceWhatsAppPlaceholders(template, variables)
  }

  buildMessage(type: WhatsAppMessageType, variables: WhatsAppTemplateVariables) {
    return this.renderTemplate(type, variables)
  }

  sendWhatsApp(message: unknown, phoneNumber: unknown) {
    return sendWhatsAppMessage(message, phoneNumber)
  }
}

export const whatsAppTemplateStore = reactive(new WhatsAppTemplateStore())
