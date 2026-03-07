import { APP_CONFIG_DEFAULTS, type AppConfigData } from '../models/AppConfig'
import type { CaseStudy, ServiceItem } from './types'
import iconStrategy from '../assets/home/icons/strategy.svg'
import iconNarrative from '../assets/home/icons/narrative.svg'
import iconContent from '../assets/home/icons/content.svg'
import iconVisual from '../assets/home/icons/visual.svg'
import iconExperience from '../assets/home/icons/experience.svg'
import iconGovernance from '../assets/home/icons/governance.svg'

type HomeSeoContent = {
  title: string
  description: string
}

type HomeHeaderContent = {
  skipLinkLabel: string
  brandTitle: string
  methodLabel: string
  pathsLabel: string
  productsLabel: string
  treatmentsLabel: string
  contactsLabel: string
}

type HomeFooterContent = {
  brandName: string
  tagline: string
  legalLine: string
}

type HomeHeroContent = {
  kicker: string
  titleLines: string[]
  subtitle: string
  image: string
  imageAlt: string
  primaryCtaLabel: string
  secondaryCtaLabel: string
  inlineCtaLabel: string
  inlineCtaHref: string
}

type HomeManifestoPoint = {
  number: string
  title: string
  description: string
}

type HomeManifestoContent = {
  eyebrow: string
  title: string
  description: string
  points: HomeManifestoPoint[]
}

type HomeCredibilityStat = {
  value: string
  label: string
}

type HomeCredibilityQuote = {
  text: string
  author: string
}

type HomeCredibilityContent = {
  eyebrow: string
  title: string
  description: string
  technologiesLabel: string
  technologies: string[]
  stats: HomeCredibilityStat[]
  quotes: HomeCredibilityQuote[]
}

type HomeShowcaseContent = {
  eyebrow: string
  title: string
  description: string
  problemLabel: string
  interventionLabel: string
  resultLabel: string
  items: CaseStudy[]
}

type HomeServicesContent = {
  eyebrow: string
  title: string
  description: string
  items: ServiceItem[]
}

type HomeFinalCtaLink = {
  kind?: 'default' | 'map'
  label: string
  href: string
  isExternal?: boolean
}

type HomeFinalCtaContent = {
  kicker: string
  title: string
  description: string
  image: string
  primaryCtaLabel: string
  secondaryCtaLabel: string
  phoneLabel: string
  phoneHref: string
  whatsappHref: string
  whatsappLabel: string
  instagramHref: string
  instagramLabel: string
  links: HomeFinalCtaLink[]
}

export type HomeContent = {
  seo: HomeSeoContent
  header: HomeHeaderContent
  footer: HomeFooterContent
  hero: HomeHeroContent
  manifesto: HomeManifestoContent
  credibility: HomeCredibilityContent
  showcase: HomeShowcaseContent
  services: HomeServicesContent
  finalCta: HomeFinalCtaContent
}

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const
function normalizeBrandName(value: string) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'CNC Beauty'
  return trimmed
}

function normalizeOwner(value: string) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Team CNC Beauty'
  return trimmed
}

function formatWorkingDays(workingDays: number[]) {
  if (!Array.isArray(workingDays) || !workingDays.length) return 'Su appuntamento'

  const unique = [...new Set(workingDays)]
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b)

  if (!unique.length) return 'Su appuntamento'
  if (unique.join(',') === '1,2,3,4,5') return 'Lun-Ven'
  if (unique.join(',') === '1,2,3,4,5,6') return 'Lun-Sab'

  return unique.map((day) => WEEKDAY_LABELS[day] ?? '').filter(Boolean).join(', ')
}

function toMapsUrl(address: string) {
  const trimmed = String(address ?? '').trim()
  if (!trimmed) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
}

function toTelHref(phone: string) {
  const trimmed = String(phone ?? '').trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/[^\d+]/g, '')
  if (!normalized) return ''
  return `tel:${normalized}`
}

function toWhatsAppUrl(phone: string) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}`
}

export function buildHomeContent(config: AppConfigData): HomeContent {
  const brandName = normalizeBrandName(config.brandName)
  const ownerName = normalizeOwner(config.ownerName)
  const address = String(config.officeAddress ?? '').trim()
  const phone = String(config.publicPhone ?? '').trim() || APP_CONFIG_DEFAULTS.publicPhone
  const dayStart = String(config.dayStart ?? '').trim() || '09:00'
  const dayEnd = String(config.dayEnd ?? '').trim() || '19:00'
  // const breakStart = String(config.breakStart ?? '').trim()
  // const breakEnd = String(config.breakEnd ?? '').trim()
  const appointmentSlot = Number(config.appointmentSlotMinutes ?? 15)
  const workingDaysLabel = formatWorkingDays(config.workingDays ?? [])
  const instagramHref = 'https://www.instagram.com/_cnc_beauty_'

  const hoursLabel = `${dayStart}-${dayEnd}`

  const legalEntity = String(config.legalEntity ?? '').trim() || ownerName
  const vatOrTaxCode = String(config.vatOrTaxCode ?? '').trim()
  const legalLine = [legalEntity, vatOrTaxCode ? `P.IVA ${vatOrTaxCode}` : ''].filter(Boolean).join(' | ')

  const caseStudies: CaseStudy[] = [
    {
      id: 'laser-epilazione',
      image: '/img/home/laser.webp',
      title: 'Laser Epilazione Progressiva',
      subtitle: 'Tecnologia ad alta precisione',
      problem: 'Peli superflui, irritazione da rasatura e ricrescita rapida.',
      intervention: 'Percorso personalizzato con tecnologia laser e parametri calibrati.',
      result: 'Riduzione progressiva dei peli e pelle piu uniforme nel tempo.',
      tags: ['Laser', 'Viso e corpo', 'Percorso su misura'],
    },
    {
      id: 'microneedling',
      image: '/img/home/microneedling.webp',
      title: 'Microneedling Professionale',
      subtitle: 'Stimolazione e rinnovo cutaneo',
      problem: 'Texture irregolare, segni post acne e perdita di luminosita.',
      intervention: 'Protocollo microneedling con supporto cosmetico mirato.',
      result: 'Pelle piu compatta, levigata e visibilmente piu luminosa.',
      tags: ['Microneedling', 'Skin quality', 'Risultati progressivi'],
    },
    {
      id: 'viso-corpo-tech',
      image: '/img/home/macchinario-viso-corpo.webp',
      title: 'Tecnologie Viso e Corpo',
      subtitle: 'Rimodellamento e tono',
      problem: 'Perdita di tono e necessita di trattamenti mirati per zone specifiche.',
      intervention: 'Combinazione di tecnologie e manualita in base agli obiettivi.',
      result: 'Percorso completo con miglioramento graduale di tonicita e definizione.',
      tags: ['Estetica avanzata', 'Viso e corpo', 'Protocollo integrato'],
    },
  ]

  const services: ServiceItem[] = [
    {
      id: 'check-up',
      title: 'Check-up iniziale',
      summary: 'Analisi viso e corpo per capire priorita e obiettivi.',
      details: 'Ogni percorso parte da una valutazione iniziale per scegliere protocollo, frequenza e supporto domiciliare.',
      icon: iconStrategy,
    },
    {
      id: 'trattamenti-viso',
      title: 'Trattamenti viso',
      summary: 'Percorsi avanzati per luminosita, texture e compattezza.',
      details: 'Protocolli personalizzati che combinano tecnologie e prodotti professionali in base alla pelle.',
      icon: iconNarrative,
    },
    {
      id: 'trattamenti-corpo',
      title: 'Trattamenti corpo',
      summary: 'Azioni mirate su tonicita, silhouette e benessere generale.',
      details: 'Programmi strutturati per accompagnare ogni fase del percorso con monitoraggio progressivo.',
      icon: iconContent,
    },
    {
      id: 'laser',
      title: 'Epilazione laser',
      summary: 'Tecnologia professionale per una riduzione progressiva dei peli.',
      details: 'Parametri personalizzati e pianificazione sedute per lavorare in sicurezza e con continuita.',
      icon: iconVisual,
    },
    {
      id: 'prodotti',
      title: 'Routine prodotti',
      summary: 'Consigli prodotti per continuare il risultato a casa.',
      details: 'Selezione guidata di prodotti in base al trattamento eseguito e alle necessita reali della pelle.',
      icon: iconExperience,
    },
    {
      id: 'follow-up',
      title: 'Follow-up',
      summary: 'Controlli periodici per mantenere i risultati ottenuti.',
      details: 'Aggiorniamo il percorso nel tempo per consolidare i benefici e adattarlo alle nuove esigenze.',
      icon: iconGovernance,
    },
  ]

  const contactVisualImage = '/img/home/ingresso-archi.jpg'

  const links: HomeFinalCtaLink[] = []
  const mapsUrl = toMapsUrl(address)
  if (mapsUrl) {
    links.push({ kind: 'map', label: 'Apri su Google Maps', href: mapsUrl, isExternal: true })
  }

  return {
    seo: {
      title: `${brandName} | Estetica avanzata, trattamenti e prodotti`,
      description:
        `${brandName}: centro estetico di estetica avanzata con tecnologie professionali, trattamenti viso e corpo e catalogo prodotti dedicato.`,
    },
    header: {
      skipLinkLabel: 'Salta al contenuto',
      brandTitle: brandName,
      methodLabel: 'Metodo',
      pathsLabel: 'Percorsi',
      productsLabel: 'Prodotti',
      treatmentsLabel: 'Trattamenti',
      contactsLabel: 'Contatti',
    },
    footer: {
      brandName,
      tagline: 'Centro estetico specializzato in estetica avanzata con tecnologie professionali.',
      legalLine,
    },
    hero: {
      kicker: `${brandName} | Estetica avanzata`,
      titleLines: [
        'Tecnologie viso e corpo',
        'per risultati reali',
        'con percorsi su misura',
      ],
      subtitle:
        'Accedi subito ai trattamenti e ai prodotti: un percorso semplice, con protocolli personalizzati e macchinari professionali.',
      image: contactVisualImage,
      imageAlt: `Trattamento di estetica avanzata nel centro ${brandName}`,
      primaryCtaLabel: 'Vai ai trattamenti',
      secondaryCtaLabel: 'Vai ai prodotti',
      inlineCtaLabel: 'Scopri i percorsi piu richiesti',
      inlineCtaHref: '#percorsi',
    },
    manifesto: {
      eyebrow: 'Metodo',
      title: 'Percorso chiaro in quattro step',
      description: 'Dalla valutazione iniziale alla routine di mantenimento: tutto orientato al risultato.',
      points: [
        {
          number: '01',
          title: 'Valutazione iniziale',
          description: 'Analisi dello stato della pelle e definizione degli obiettivi reali del percorso.',
        },
        {
          number: '02',
          title: 'Protocollo personalizzato',
          description: 'Scelta di trattamento, frequenza e supporto domiciliare in base alla tua situazione.',
        },
        {
          number: '03',
          title: 'Tecnologia + manualita',
          description: 'In cabina combiniamo macchinari professionali e competenza estetica mirata.',
        },
        {
          number: '04',
          title: 'Monitoraggio continuo',
          description: 'Verifica risultati e aggiornamento del percorso per mantenere i benefici nel tempo.',
        },
      ],
    },
    credibility: {
      eyebrow: 'Tecnologie',
      title: 'Estetica avanzata con metodo',
      description: 'Tre tecnologie centrali, un protocollo strutturato e accesso diretto a trattamenti e prodotti.',
      technologiesLabel: 'Tecnologie principali',
      technologies: ['Laser', 'Microneedling', 'Macchinari viso/corpo'],
      stats: [
        { value: workingDaysLabel, label: 'giorni operativi' },
        { value: hoursLabel, label: 'fascia oraria centro' },
        { value: `${appointmentSlot} min`, label: 'slot appuntamenti' },
      ],
      quotes: [
        {
          text: 'Ogni percorso parte da una valutazione iniziale e da obiettivi condivisi.',
          author: `${ownerName} | ${brandName}`,
        },
        {
          text: 'Trattamenti e prodotti sono collegati per rendere semplice la continuita tra cabina e casa.',
          author: `Protocollo ${brandName}`,
        },
        {
          text: `Ricevi indicazioni chiare su tempi, frequenza e mantenimento in base alla tua situazione.`,
          author: `Team ${brandName}`,
        },
      ],
    },
    showcase: {
      eyebrow: 'Trattamenti',
      title: 'I percorsi piu richiesti in cabina',
      description: 'Focus su indicazione, protocollo e beneficio atteso per orientarti subito.',
      problemLabel: 'Indicazione',
      interventionLabel: 'Protocollo',
      resultLabel: 'Beneficio atteso',
      items: caseStudies,
    },
    services: {
      eyebrow: 'Servizi',
      title: 'Dalla prima consulenza al mantenimento',
      description: 'Servizi concreti per semplificare la scelta tra trattamenti e prodotti.',
      items: services,
    },
    finalCta: {
      kicker: 'Contatti',
      title: 'Prenota una consulenza e scegli il percorso giusto',
      description: [
        address || 'Sede in aggiornamento.',
        `Scopri subito trattamenti e prodotti ${brandName} e richiedi informazioni personalizzate.`,
      ].join(' '),
      image: contactVisualImage,
      primaryCtaLabel: 'Apri trattamenti',
      secondaryCtaLabel: 'Apri prodotti',
      phoneLabel: phone,
      phoneHref: toTelHref(phone),
      whatsappHref: toWhatsAppUrl(phone),
      whatsappLabel: 'Scrivi su WhatsApp',
      instagramHref,
      instagramLabel: 'Scrivimi su Instagram',
      links,
    },
  }
}
