export interface DefaultCategorySeed {
  title: string
  subtitle: string
  emoji?: string
}

export const treatmentCategoryDefaults: DefaultCategorySeed[] = [
  { title: 'Laser', subtitle: 'Tecnologie laser e luce pulsata', emoji: '⚡' },
  { title: 'Trattamenti viso', subtitle: 'Pulizia, idratazione e anti-age viso', emoji: '✨' },
  { title: 'Trattamenti corpo', subtitle: 'Percorsi corpo drenanti e rassodanti', emoji: '🧴' },
  { title: 'Massaggi', subtitle: 'Benessere e riequilibrio muscolare', emoji: '💆' },
  { title: 'Ceretta', subtitle: 'Epilazione professionale', emoji: '🪒' },
  { title: 'Manicure e Pedicure', subtitle: 'Cura estetica di mani e piedi', emoji: '💅' },
  { title: 'Laminazione ciglia e sopracciglia', subtitle: 'Definizione e styling dello sguardo', emoji: '👁️' },
]

export const productCategoryDefaults: DefaultCategorySeed[] = [
  { title: 'Pelle Secca', subtitle: 'Prodotti nutrienti e riparatori' },
  { title: 'Pelle Acneica', subtitle: 'Routine purificanti e sebo-regolatrici' },
  { title: 'Pelle Grassa', subtitle: 'Texture leggere e riequilibranti' },
  { title: 'Pelle Sensibile', subtitle: 'Formule delicate e lenitive' },
  { title: 'Pelle Spenta', subtitle: 'Glow, luminosita e uniformita' },
  { title: 'Pelle Matura', subtitle: 'Soluzioni elasticizzanti e anti-age' },
  { title: 'Corpo', subtitle: 'Detersione e trattamenti corpo' },
]
