// src/models/AppConfig.ts
import { FirestoreModel, type Timestampble } from 'cic-kit'

export const APP_CONFIG_ID = 'main'
export const COOKIE_CONSENT_STORAGE_KEY_PREFIX = 'cicbeauty_cookie_consent_'

export type AppConfigFields = {
  brandName: string
  legalLastUpdated: string
  cookieConsentKeyDate: string
  ownerName: string
  legalEntity: string
  vatOrTaxCode: string
  officeAddress: string
  publicPhone: string
  privacyEmail: string
  pec: string
  aiModel: string
  aiProvider: string
  cookieBannerTextHtml: string
  cookieBannerRejectBtnText: string
  cookieBannerAcceptBtnText: string
  privacyPolicyBodyHtml: string
  cookiePolicyBodyHtml: string
  termsConditionsBodyHtml: string
  aiTransparencyBodyHtml: string
  businessTimezone: string
  dayStart: string
  breakStart: string
  breakEnd: string
  dayEnd: string
  workingDays?: number[]
  appointmentSlotMinutes: number
  defaultAppointmentDurationMinutes: number
  personalAppointmentDurationMinutes: number
  calendarPrefetchMonths: number
  availabilitySearchDays: number
  availabilityMinNoticeMinutes: number
  googleCalendarSyncEnabled: boolean
  googleCalendarId: string
}

export interface AppConfigData extends AppConfigFields, Partial<Timestampble> {
  id: string
}

export const APP_CONFIG_DEFAULTS: AppConfigFields = {
  brandName: 'Cnc Beauty',
  legalLastUpdated: '27 febbraio 2026',
  cookieConsentKeyDate: '2026-02-27',
  ownerName: 'Carla Ciancimino',
  legalEntity: 'Carla Ciancimino',
  vatOrTaxCode: '03055730844',
  officeAddress: 'Via Enrico de Nicola, 16, 92019 Sciacca AG',
  publicPhone: '+39 329 709 4859',
  privacyEmail: 'carla.ciancimino99@gmail.com',
  pec: '',
  aiModel: 'gemini-2.5-flash-lite',
  aiProvider: 'Google Gemini API',
  cookieBannerTextHtml: '<p>Usiamo cookie e storage tecnici per sicurezza e funzionamento. Gli analytics Firebase sono opzionali e vengono attivati solo con consenso.</p>',
  cookieBannerRejectBtnText: 'Rifiuta analytics',
  cookieBannerAcceptBtnText: 'Accetta analytics',
  privacyPolicyBodyHtml: `
<h2>Tipi di dati trattati</h2>
<ul>
  <li>Dati tecnici di navigazione (log, indirizzo IP, user agent, diagnostica di sicurezza).</li>
  <li>Dati di autenticazione per area riservata amministratori (account Firebase Authentication).</li>
  <li>Dati gestionali inseriti dagli amministratori (catalogo, clienti, appuntamenti, spese).</li>
</ul>
<h2>Finalita e base giuridica</h2>
<ul>
  <li>Erogazione del sito e sicurezza: legittimo interesse e misure precontrattuali/contrattuali.</li>
  <li>Gestione area riservata amministratori: esecuzione del rapporto professionale.</li>
  <li>Adempimenti legali/fiscali: obbligo di legge.</li>
  <li>Analytics facoltativi: consenso.</li>
</ul>
<h2>Natura del servizio</h2>
<p>Il sito e un catalogo informativo. Non sono attive funzioni di vendita online o pagamento elettronico verso i clienti finali.</p>
<p>I prezzi mostrati nel catalogo sono indicativi e riferiti al fornitore; non costituiscono offerta commerciale vincolante.</p>
<h2>Destinatari e responsabili</h2>
<ul>
  <li>Firebase / Google Cloud per hosting, autenticazione, database, storage e funzioni server.</li>
</ul>
<h2>Trasferimenti extra SEE</h2>
<p>Alcuni fornitori possono trattare dati anche fuori dallo Spazio Economico Europeo. Il trattamento avviene con garanzie contrattuali previste dal GDPR (es. Clausole Contrattuali Standard).</p>
<h2>Conservazione</h2>
<ul>
  <li>Dati tecnici: per il tempo necessario a sicurezza, diagnostica e continuita operativa.</li>
  <li>Dati gestionali area admin: secondo tempi organizzativi e obblighi di legge applicabili.</li>
  <li>Preferenze cookie: fino a revoca o cancellazione dal browser.</li>
</ul>
<h2>Modifiche</h2>
<p>La presente informativa puo essere aggiornata. In caso di modifiche rilevanti verra aggiornata la data di ultima revisione.</p>`.trim(),
  cookiePolicyBodyHtml: `
<h2>Cosa usiamo</h2>
<p>Questo sito usa cookie e tecnologie equivalenti (es. localStorage) per funzioni tecniche indispensabili e, solo se accettati, per analytics.</p>
<h2>Cookie e storage tecnici</h2>
<ul>
  <li>Autenticazione e gestione sessione area riservata amministratori.</li>
  <li>Preferenze applicative e configurazioni locali.</li>
  <li>Sicurezza, prevenzione abusi e continuita operativa.</li>
</ul>
<p>Questi strumenti sono necessari al funzionamento del servizio e non richiedono consenso preventivo ai sensi della normativa applicabile.</p>
<h2>Durata e revoca</h2>
<p>La scelta viene salvata nel browser e puo essere modificata in ogni momento in questa pagina, oltre che tramite impostazioni del browser.</p>`.trim(),
  termsConditionsBodyHtml: `
<h2>Prezzi e disponibilita</h2>
<p>I prezzi pubblicati sono indicativi e allineati ai listini fornitore; possono cambiare senza preavviso e non costituiscono offerta vincolante.</p>
<p>Le informazioni su disponibilita, descrizioni e immagini sono fornite a scopo orientativo.</p>
<h2>Accesso area riservata</h2>
<p>L'accesso autenticato e riservato al personale amministrativo autorizzato. E vietato ogni accesso non autorizzato, tentativo di abuso o manomissione dei sistemi.</p>
<h2>Limitazione di responsabilita</h2>
<p>Nei limiti consentiti dalla legge, il titolare non risponde di danni indiretti derivanti da interruzioni del servizio, errori materiali, indisponibilita temporanee o uso improprio del sito.</p>
<h2>Proprieta intellettuale</h2>
<p>Testi, immagini, marchi e materiali presenti sono protetti e non possono essere riutilizzati senza autorizzazione del titolare o dei rispettivi aventi diritto.</p>
<h2>Legge applicabile</h2>
<p>I presenti termini sono disciplinati dalla legge italiana, fatti salvi eventuali diritti inderogabili previsti dalla normativa applicabile.</p>`.trim(),
  aiTransparencyBodyHtml: `
<h2>Stato attuale</h2>
<p>Alla data di aggiornamento, le funzioni AI operative sono disponibili solo per utenti amministrativi autorizzati.</p>
<h2>Uso previsto (inclusa futura chat in home)</h2>
<ul>
  <li>Suggerimenti su trattamenti e prodotti del catalogo.</li>
  <li>Supporto redazionale interno su testi descrittivi.</li>
  <li>Nessuna decisione automatizzata con effetti legali sull'utente.</li>
</ul>
<h2>Limiti importanti</h2>
<ul>
  <li>I risultati AI possono contenere errori, omissioni o valutazioni non perfette.</li>
  <li>I contenuti AI non sostituiscono parere medico, dermatologico o professionale qualificato.</li>
  <li>Prima di decisioni rilevanti e sempre necessaria la verifica umana.</li>
</ul>
<h2>Dati inviati all'AI</h2>
<p>Possono essere inviati prompt testuali e metadati del catalogo necessari a generare la risposta. Evita di inserire dati sanitari o categorie particolari di dati personali.</p>
<h2>Governance e sicurezza</h2>
<ul>
  <li>Accesso AI limitato da autorizzazioni applicative.</li>
  <li>Elaborazione tramite Cloud Functions protette da autenticazione e permessi.</li>
  <li>Controlli lato server su formato, lunghezza e contenuti minimi del payload.</li>
</ul>`.trim(),
  businessTimezone: 'Europe/Rome',
  dayStart: '09:00',
  breakStart: '13:00',
  breakEnd: '14:00',
  dayEnd: '19:00',
  workingDays: [1, 2, 3, 4, 5],
  appointmentSlotMinutes: 15,
  defaultAppointmentDurationMinutes: 60,
  personalAppointmentDurationMinutes: 30,
  calendarPrefetchMonths: 1,
  availabilitySearchDays: 45,
  availabilityMinNoticeMinutes: 30,
  googleCalendarSyncEnabled: false,
  googleCalendarId: '',
}

export function mergeAppConfigWithDefaults(data?: Partial<AppConfigData> | null): AppConfigData {
  return {
    id: APP_CONFIG_ID,
    ...APP_CONFIG_DEFAULTS,
    ...(data ?? {}),
  }
}

export function normalizeCookieConsentKeyDate(value: unknown): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) return APP_CONFIG_DEFAULTS.cookieConsentKeyDate
  return normalized.replace(/\s+/g, '-')
}

export function buildCookieConsentStorageKey(cookieConsentKeyDate: unknown): string {
  return `${COOKIE_CONSENT_STORAGE_KEY_PREFIX}${normalizeCookieConsentKeyDate(cookieConsentKeyDate)}`
}

export function hasLegalPlaceholdersInConfig(config: Pick<AppConfigFields, 'ownerName' | 'legalEntity' | 'vatOrTaxCode' | 'officeAddress' | 'publicPhone' | 'privacyEmail'>): boolean {
  return [
    config.ownerName,
    config.legalEntity,
    config.vatOrTaxCode,
    config.officeAddress,
    config.publicPhone,
    config.privacyEmail,
  ].some((value) => {
    const normalized = String(value ?? '').trim()
    return !normalized || normalized.includes('DA_COMPLETARE')
  })
}

export class AppConfig extends FirestoreModel<AppConfigData> {
  static collectionName = 'appConfig'
  protected localStorageKey() { return 'APP_CONFIG' }

  brandName: string
  legalLastUpdated: string
  cookieConsentKeyDate: string
  ownerName: string
  legalEntity: string
  vatOrTaxCode: string
  officeAddress: string
  publicPhone: string
  privacyEmail: string
  pec: string
  aiModel: string
  aiProvider: string
  cookieBannerTextHtml: string
  cookieBannerRejectBtnText: string
  cookieBannerAcceptBtnText: string
  privacyPolicyBodyHtml: string
  cookiePolicyBodyHtml: string
  termsConditionsBodyHtml: string
  aiTransparencyBodyHtml: string
  businessTimezone: string
  dayStart: string
  breakStart: string
  breakEnd: string
  dayEnd: string
  workingDays: number[]
  appointmentSlotMinutes: number
  defaultAppointmentDurationMinutes: number
  personalAppointmentDurationMinutes: number
  calendarPrefetchMonths: number
  availabilitySearchDays: number
  availabilityMinNoticeMinutes: number
  googleCalendarSyncEnabled: boolean
  googleCalendarId: string

  constructor(data: AppConfigData) {
    super(data)
    this.brandName = data.brandName ?? APP_CONFIG_DEFAULTS.brandName
    this.legalLastUpdated = data.legalLastUpdated ?? APP_CONFIG_DEFAULTS.legalLastUpdated
    this.cookieConsentKeyDate = normalizeCookieConsentKeyDate(data.cookieConsentKeyDate)
    this.ownerName = data.ownerName ?? APP_CONFIG_DEFAULTS.ownerName
    this.legalEntity = data.legalEntity ?? APP_CONFIG_DEFAULTS.legalEntity
    this.vatOrTaxCode = data.vatOrTaxCode ?? APP_CONFIG_DEFAULTS.vatOrTaxCode
    this.officeAddress = data.officeAddress ?? APP_CONFIG_DEFAULTS.officeAddress
    this.publicPhone = data.publicPhone ?? APP_CONFIG_DEFAULTS.publicPhone
    this.privacyEmail = data.privacyEmail ?? APP_CONFIG_DEFAULTS.privacyEmail
    this.pec = data.pec ?? APP_CONFIG_DEFAULTS.pec
    this.aiModel = data.aiModel ?? APP_CONFIG_DEFAULTS.aiModel
    this.aiProvider = data.aiProvider ?? APP_CONFIG_DEFAULTS.aiProvider
    this.cookieBannerTextHtml = data.cookieBannerTextHtml ?? APP_CONFIG_DEFAULTS.cookieBannerTextHtml
    this.cookieBannerRejectBtnText = data.cookieBannerRejectBtnText ?? APP_CONFIG_DEFAULTS.cookieBannerRejectBtnText
    this.cookieBannerAcceptBtnText = data.cookieBannerAcceptBtnText ?? APP_CONFIG_DEFAULTS.cookieBannerAcceptBtnText
    this.privacyPolicyBodyHtml = data.privacyPolicyBodyHtml ?? APP_CONFIG_DEFAULTS.privacyPolicyBodyHtml
    this.cookiePolicyBodyHtml = data.cookiePolicyBodyHtml ?? APP_CONFIG_DEFAULTS.cookiePolicyBodyHtml
    this.termsConditionsBodyHtml = data.termsConditionsBodyHtml ?? APP_CONFIG_DEFAULTS.termsConditionsBodyHtml
    this.aiTransparencyBodyHtml = data.aiTransparencyBodyHtml ?? APP_CONFIG_DEFAULTS.aiTransparencyBodyHtml
    this.businessTimezone = data.businessTimezone ?? APP_CONFIG_DEFAULTS.businessTimezone
    this.dayStart = data.dayStart ?? APP_CONFIG_DEFAULTS.dayStart
    this.breakStart = data.breakStart ?? APP_CONFIG_DEFAULTS.breakStart
    this.breakEnd = data.breakEnd ?? APP_CONFIG_DEFAULTS.breakEnd
    this.dayEnd = data.dayEnd ?? APP_CONFIG_DEFAULTS.dayEnd
    this.workingDays = data.workingDays ?? APP_CONFIG_DEFAULTS.workingDays ?? [1, 2, 3, 4, 5, 6]
    this.appointmentSlotMinutes = data.appointmentSlotMinutes ?? APP_CONFIG_DEFAULTS.appointmentSlotMinutes
    this.defaultAppointmentDurationMinutes =
      data.defaultAppointmentDurationMinutes ?? APP_CONFIG_DEFAULTS.defaultAppointmentDurationMinutes
    this.personalAppointmentDurationMinutes =
      data.personalAppointmentDurationMinutes ?? APP_CONFIG_DEFAULTS.personalAppointmentDurationMinutes
    this.calendarPrefetchMonths = data.calendarPrefetchMonths ?? APP_CONFIG_DEFAULTS.calendarPrefetchMonths
    this.availabilitySearchDays = data.availabilitySearchDays ?? APP_CONFIG_DEFAULTS.availabilitySearchDays
    this.availabilityMinNoticeMinutes =
      data.availabilityMinNoticeMinutes ?? APP_CONFIG_DEFAULTS.availabilityMinNoticeMinutes
    this.googleCalendarSyncEnabled = data.googleCalendarSyncEnabled ?? APP_CONFIG_DEFAULTS.googleCalendarSyncEnabled
    this.googleCalendarId = data.googleCalendarId ?? APP_CONFIG_DEFAULTS.googleCalendarId
  }

  toData(): AppConfigData {
    return {
      id: this.id,
      brandName: this.brandName,
      legalLastUpdated: this.legalLastUpdated,
      cookieConsentKeyDate: normalizeCookieConsentKeyDate(this.cookieConsentKeyDate),
      ownerName: this.ownerName,
      legalEntity: this.legalEntity,
      vatOrTaxCode: this.vatOrTaxCode,
      officeAddress: this.officeAddress,
      publicPhone: this.publicPhone,
      privacyEmail: this.privacyEmail,
      pec: this.pec,
      aiModel: this.aiModel,
      aiProvider: this.aiProvider,
      cookieBannerTextHtml: this.cookieBannerTextHtml,
      cookieBannerRejectBtnText: this.cookieBannerRejectBtnText,
      cookieBannerAcceptBtnText: this.cookieBannerAcceptBtnText,
      privacyPolicyBodyHtml: this.privacyPolicyBodyHtml,
      cookiePolicyBodyHtml: this.cookiePolicyBodyHtml,
      termsConditionsBodyHtml: this.termsConditionsBodyHtml,
      aiTransparencyBodyHtml: this.aiTransparencyBodyHtml,
      businessTimezone: this.businessTimezone,
      dayStart: this.dayStart,
      breakStart: this.breakStart,
      breakEnd: this.breakEnd,
      dayEnd: this.dayEnd,
      workingDays: this.workingDays,
      appointmentSlotMinutes: this.appointmentSlotMinutes,
      defaultAppointmentDurationMinutes: this.defaultAppointmentDurationMinutes,
      personalAppointmentDurationMinutes: this.personalAppointmentDurationMinutes,
      calendarPrefetchMonths: this.calendarPrefetchMonths,
      availabilitySearchDays: this.availabilitySearchDays,
      availabilityMinNoticeMinutes: this.availabilityMinNoticeMinutes,
      googleCalendarSyncEnabled: this.googleCalendarSyncEnabled,
      googleCalendarId: this.googleCalendarId,
      ...this.timestampbleProps()
    }
  }
}
