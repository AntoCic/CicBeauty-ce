import { FirestoreModel, type Timestampble } from 'cic-kit'

export const WHATSAPP_TEMPLATE_CONFIG_ID = 'default'

export const WHATSAPP_TEMPLATE_KEYS = [
  'confirmationTemplate',
  'updateTemplate',
  'deleteTemplate',
  'reminderTemplate',
] as const

export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number]

export type WhatsAppTemplateFields = Record<WhatsAppTemplateKey, string> & {
  updateBy: string
}

export interface WhatsAppTemplateData extends Partial<Timestampble>, WhatsAppTemplateFields {
  id: string
}

const FLOWER = '\u{1F338}'
const CALENDAR = '\u{1F4C5}'
const CLOCK = '\u{1F552}'
const HOURGLASS = '\u23F3'
const EURO = '\u{1F4B6}'
const PIN = '\u{1F4CD}'
const MASSAGE = '\u{1F486}\u200D\u2640\uFE0F'
const SPARKLES = '\u2728'
const RED_DOT = '\u{1F534}'
const HEART = '\u{1F496}'
const CROSS = '\u274C'
const SMILE = '\u{1F60A}'

export const WHATSAPP_TEMPLATE_DEFAULTS: WhatsAppTemplateFields = {
  confirmationTemplate: `Ciao [NOME]! ${FLOWER}
Ti confermo il tuo appuntamento:

${CALENDAR} Data: [GIORNO], [DATA]
${CLOCK} Orario: [ORA]
${HOURGLASS} Durata: [DURATA]
${EURO} Prezzo: [PREZZO]
${PIN} [INDIRIZZO]

Non vedo l'ora di coccolarti e regalarti un momento di relax e bellezza! ${MASSAGE}${SPARKLES}
${RED_DOT} Ti ricordo di avvisarmi almeno 48 ore prima per qualsiasi variazione o disdetta. A presto! ${HEART}`,
  updateTemplate: `Ciao [NOME]! ${FLOWER}
Ti informo che il tuo appuntamento e stato modificato:

${CALENDAR} Nuova Data: [GIORNO], [DATA]
${CLOCK} Nuovo Orario: [ORA]
${HOURGLASS} Durata: [DURATA]
${EURO} Prezzo: [PREZZO]
${PIN} [INDIRIZZO]

${RED_DOT} Ti ricordo di avvisarmi almeno 48 ore prima per qualsiasi variazione o disdetta. A presto! ${HEART}`,
  deleteTemplate: `Ciao [NOME]! ${FLOWER}
${CROSS}${CALENDAR} Volevo informarti che il tuo appuntamento di [GIORNO], [DATA] alle [ORA] e stato cancellato. Mi dispiace per l'inconveniente!
Se dovessi aver bisogno di chiarimenti, sono qui per te. ${SMILE}`,
  reminderTemplate: `Ciao [NOME]! ${FLOWER}
Un piccolo promemoria per il tuo appuntamento di domani:
${CLOCK} Orario: [ORA]
${HOURGLASS} Durata: [DURATA]
${EURO} Prezzo: [PREZZO]
${PIN} [INDIRIZZO]
Se dovessi aver bisogno di chiarimenti, sono qui per te. Ci vediamo presto! ${SMILE}`,
  updateBy: 'system',
}

function normalizeTemplateText(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function normalizeUpdateBy(value: unknown, fallback: string) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

export function mergeWhatsAppTemplateWithDefaults(
  data?: Partial<WhatsAppTemplateData> | null,
): WhatsAppTemplateData {
  return {
    ...(data ?? {}),
    id: String(data?.id ?? WHATSAPP_TEMPLATE_CONFIG_ID).trim() || WHATSAPP_TEMPLATE_CONFIG_ID,
    confirmationTemplate: normalizeTemplateText(
      data?.confirmationTemplate,
      WHATSAPP_TEMPLATE_DEFAULTS.confirmationTemplate,
    ),
    updateTemplate: normalizeTemplateText(
      data?.updateTemplate,
      WHATSAPP_TEMPLATE_DEFAULTS.updateTemplate,
    ),
    deleteTemplate: normalizeTemplateText(
      data?.deleteTemplate,
      WHATSAPP_TEMPLATE_DEFAULTS.deleteTemplate,
    ),
    reminderTemplate: normalizeTemplateText(
      data?.reminderTemplate,
      WHATSAPP_TEMPLATE_DEFAULTS.reminderTemplate,
    ),
    updateBy: normalizeUpdateBy(data?.updateBy, WHATSAPP_TEMPLATE_DEFAULTS.updateBy),
  }
}

export class WhatsAppTemplate extends FirestoreModel<WhatsAppTemplateData> {
  static collectionName = 'whatsAppTemplates'

  confirmationTemplate: string
  updateTemplate: string
  deleteTemplate: string
  reminderTemplate: string
  updateBy: string

  constructor(data: WhatsAppTemplateData) {
    const normalized = mergeWhatsAppTemplateWithDefaults(data)
    super(normalized)
    this.confirmationTemplate = normalized.confirmationTemplate
    this.updateTemplate = normalized.updateTemplate
    this.deleteTemplate = normalized.deleteTemplate
    this.reminderTemplate = normalized.reminderTemplate
    this.updateBy = normalized.updateBy
  }

  toData(): WhatsAppTemplateData {
    const normalized = mergeWhatsAppTemplateWithDefaults({
      id: this.id,
      confirmationTemplate: this.confirmationTemplate,
      updateTemplate: this.updateTemplate,
      deleteTemplate: this.deleteTemplate,
      reminderTemplate: this.reminderTemplate,
      updateBy: this.updateBy,
    })

    return {
      id: normalized.id,
      confirmationTemplate: normalized.confirmationTemplate,
      updateTemplate: normalized.updateTemplate,
      deleteTemplate: normalized.deleteTemplate,
      reminderTemplate: normalized.reminderTemplate,
      updateBy: normalized.updateBy,
      ...this.timestampbleProps(),
    }
  }
}
