# MODELS (Nuova Versione)

Schema pensato per la migrazione dal progetto legacy e per la gestione multi-operatore.

## Relazioni principali

- `Client 1 -> N Appointment` tramite `Appointment.client_id` (fallback legacy `user_id`).
- `Appointment N <-> N Treatment` tramite `Appointment.treatment_ids[]`.
- `Appointment N <-> N Operator` tramite `Appointment.operator_ids[]` + `operator_id` primario.
- `Appointment personale` tramite `Appointment.personalOwnerId` + `Appointment.isPublic`.
- `Appointment N -> 1 Coupon` tramite `Appointment.coupon_id`.
- `TypeExpense 1 -> N Treatment` tramite `Treatment.type_expense_id`.
- `TypeExpense 1 -> N Product` tramite `Product.type_expense_id`.
- `TypeExpense 1 -> N Expense` tramite `Expense.type_expense_id`.
- `Expense N -> 1 Client` tramite `Expense.client_id` (opzionale).
- `Expense N -> 1 Coupon` tramite `Expense.coupon_id` (opzionale).
- `Coupon 1 -> N Appointment` tramite `Appointment.coupon_id`.

## Campi migrazione

- `Treatment.old_id` (visibile in beta features).
- `TypeExpense.old_id` (visibile in beta features).
- `Client.old_id` e `Appointment.old_id` per supporto import JSON.

## AppConfig operativo

`appConfig/main` include:

- Orari: `dayStart`, `breakStart`, `breakEnd`, `dayEnd`, `workingDays`.
- Slot: `appointmentSlotMinutes`, `defaultAppointmentDurationMinutes`, `personalAppointmentDurationMinutes`.
- Performance calendario: `calendarPrefetchMonths`.
- Disponibilita: `availabilitySearchDays`, `availabilityMinNoticeMinutes`.
- Sync Google Calendar: `googleCalendarSyncEnabled`, `googleCalendarId`, `googleCalendarAccessRole`, `googleCalendarAllowedEmailsCsv`.

## Note sicurezza/permessi

- Le viste operative (calendario, clienti, spese, statistiche) richiedono `OPERATORE` (o `ADMIN`/`SUPERADMIN`).
- L’agente disponibilita richiede `AI` + `OPERATORE`.
- Le funzioni di import/migrazione sono visibili solo con `BETA_FEATURES`.
