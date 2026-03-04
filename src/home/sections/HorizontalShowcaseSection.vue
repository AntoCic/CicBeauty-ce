<script setup lang="ts">
import { computed, onMounted } from 'vue'
import caseImage1 from '../../assets/home/case-01.svg'
import caseImage2 from '../../assets/home/case-02.svg'
import caseImage3 from '../../assets/home/case-03.svg'
import caseImage4 from '../../assets/home/case-04.svg'
import caseImage5 from '../../assets/home/case-05.svg'
import caseImage6 from '../../assets/home/case-06.svg'
import type { CaseStudy } from '../types'
import SectionTitle from '../components/SectionTitle.vue'
import CaseSlide from '../components/CaseSlide.vue'
import ProgressIndicator from '../components/ProgressIndicator.vue'
import { useHorizontalScroll } from '../composables/useHorizontalScroll'
import { usePrefersReducedMotion } from '../composables/usePrefersReducedMotion'

const caseStudies: CaseStudy[] = [
  {
    id: 'case-aurora',
    image: caseImage1,
    title: 'Aurora Skin Lab',
    subtitle: 'Reframing del catalogo viso',
    problem: 'Le categorie erano percepite come uguali e il traffico si disperdeva tra pagine simili.',
    intervention: 'Nuova tassonomia, headline editoriali e gerarchia visuale orientata all intento.',
    result: '+34% click verso schede trattamento in 60 giorni.',
    tags: ['Brand strategy', 'Information architecture', 'Editorial design'],
  },
  {
    id: 'case-vela',
    image: caseImage2,
    title: 'Vela Derm Aesthetics',
    subtitle: 'Unificazione messaggi prodotti + percorsi',
    problem: 'Prodotti e trattamenti vivevano come mondi separati.',
    intervention: 'Ponte narrativo con moduli problema, routine e trattamento consigliato.',
    result: '+27% navigazione incrociata tra prodotti e trattamenti.',
    tags: ['Tone of voice', 'Content system', 'UX writing'],
  },
  {
    id: 'case-materia',
    image: caseImage3,
    title: 'Materia Rituals',
    subtitle: 'Visual language premium',
    problem: 'L identita era forte offline ma piatta online.',
    intervention: 'Nuova direzione fotografica, grana editoriale e palette a contrasti morbidi.',
    result: 'Tempo medio pagina +41% su homepage.',
    tags: ['Art direction', 'Visual storytelling', 'Design system'],
  },
  {
    id: 'case-celeste',
    image: caseImage4,
    title: 'Celeste Clinic',
    subtitle: 'Riposizionamento multi-servizio',
    problem: 'Offerta ampia ma senza priorita percepita.',
    intervention: 'Sequenza narrativa per percorsi core, proof block e CTA contestuali.',
    result: '+22% richieste su trattamenti ad alto margine.',
    tags: ['Posizionamento', 'Conversion UX', 'Service framing'],
  },
  {
    id: 'case-lumen',
    image: caseImage5,
    title: 'Lumen Body Atelier',
    subtitle: 'Story-first homepage',
    problem: 'La vecchia home era una lista statica di box promozionali.',
    intervention: 'Struttura magazine a blocchi con micro reveal e sezione pinned orizzontale.',
    result: 'Bounce rate -18% su traffico organico.',
    tags: ['Homepage strategy', 'Interaction design', 'Narrative UI'],
  },
  {
    id: 'case-accordo',
    image: caseImage6,
    title: 'Accordo Beauty House',
    subtitle: 'Coerenza cross-channel',
    problem: 'Differenze forti tra social, sito e materiali in studio.',
    intervention: 'Linee editoriali condivise e componenti replicabili per team interno.',
    result: 'Riduzione del 40% nei tempi di produzione contenuti.',
    tags: ['Governance', 'Template system', 'Brand operations'],
  },
]

const { isReducedMotion } = usePrefersReducedMotion()
const { sectionRef, stickyRef, viewportRef, trackRef, sectionStyle, trackStyle, displayProgress, isPinned, onFallbackScroll } =
  useHorizontalScroll({
    reducedMotion: isReducedMotion,
    mobileBreakpoint: 1024,
  })
void sectionRef
void stickyRef
void viewportRef
void trackRef

const currentSlide = computed(() => {
  const total = caseStudies.length
  return Math.min(total, Math.max(1, Math.round(displayProgress.value * (total - 1)) + 1))
})

function handleViewportScroll() {
  if (!isPinned.value) {
    onFallbackScroll()
  }
}

onMounted(() => {
  window.requestAnimationFrame(() => {
    onFallbackScroll()
  })
})
</script>

<template>
  <section id="case-studies" ref="sectionRef" class="home-horizontal" :style="sectionStyle">
    <div ref="stickyRef" class="home-horizontal__sticky" :class="{ 'is-pinned': isPinned }">
      <div class="home-horizontal__header">
        <SectionTitle
          eyebrow="Case studies"
          title="Scroll verticale, narrazione orizzontale"
          description="Ogni pannello mostra problema, intervento e risultato con un ritmo editoriale continuo."
        />
        <ProgressIndicator :current="currentSlide" :total="caseStudies.length" :progress="displayProgress" />
      </div>

      <div ref="viewportRef" class="home-horizontal__viewport" :class="{ 'is-fallback': !isPinned }" @scroll.passive="handleViewportScroll">
        <div ref="trackRef" class="home-horizontal__track" :style="trackStyle">
          <CaseSlide v-for="(item, index) in caseStudies" :key="item.id" :item="item" :index="index" />
        </div>
      </div>
    </div>
  </section>
</template>
