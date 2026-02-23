export interface DefaultCategorySeed {
  title: string
  subtitle: string
}

export const treatmentCategoryDefaults: DefaultCategorySeed[] = [
  { title: 'Laser', subtitle: 'Tecnologie laser e luce pulsata' },
  { title: 'Trattamenti viso', subtitle: 'Pulizia, idratazione e anti-age viso' },
  { title: 'Trattamenti corpo', subtitle: 'Percorsi corpo drenanti e rassodanti' },
  { title: 'Massaggi', subtitle: 'Benessere e riequilibrio muscolare' },
  { title: 'Ceretta', subtitle: 'Epilazione professionale' },
  { title: 'Manicure e Pedicure', subtitle: 'Cura estetica di mani e piedi' },
  { title: 'Laminazione ciglia e sopracciglia', subtitle: 'Definizione e styling dello sguardo' },
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
