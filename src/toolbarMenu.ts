import type { OffcanvasTab } from "cic-kit";

export const toolbarOffcanvasTabs: OffcanvasTab[] = [
  {
    name: 'Prodotti',
    icon: 'shopping_bag',
    to: { name: 'ProductsView' },
  },
  {
    name: 'Trattamenti',
    icon: 'bolt',
    to: { name: 'TreatmentsView' },
  },
  {
    name: 'Tipi di spesa',
    icon: 'payments',
    to: { name: 'TypeExpensesView' },
  },
  {
    name: 'Avvisi',
    icon: 'notifications',
    to: { name: 'AnnouncementsView' },
  },
];
