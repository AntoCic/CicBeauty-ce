import type { OffcanvasTab } from "cic-kit";

export const toolbarOffcanvasTabs: OffcanvasTab[] = [
  {
    name: 'Prodotti',
    icon: 'shopping_bag',
    to: { name: 'ProductCategoriesView' },
  },
  {
    name: 'Trattamenti',
    icon: 'bolt',
    to: { name: 'TreatmentCategoriesView' },
  },
  {
    name: 'Cat. Prodotti',
    icon: 'edit_note',
    to: { name: 'ProductCategoriesManageView' },
  },
  {
    name: 'Cat. Trattamenti',
    icon: 'edit_note',
    to: { name: 'TreatmentCategoriesManageView' },
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
