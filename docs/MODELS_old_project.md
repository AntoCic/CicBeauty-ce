# Modelli Dati del Progetto

Questa guida descrive i model principali usati nel progetto (`functions/function.js` lato backend MongoDB e `src/models/*` lato frontend), con campi e relazioni.

## Panoramica Relazioni

- `Client (User)` `1 -> N` `Appointment` tramite `Appointment.user_id`
- `Appointment` `N <-> N` `Treatment` tramite `Appointment.treatment_ids[]`
- `TypeExpense` `1 -> N` `Treatment` tramite `Treatment.type_expense_id`
- `TypeExpense` `1 -> N` `Expense` tramite `Expense.type_expense_id`
- `Operator (User autenticato)` `1 -> N` su `Appointment`, `Treatment`, `Expense` tramite `operator_id`
- `Appointment` `0/1 -> 1` `CalendarEvent` (evento Google Calendar) tramite `Appointment.calendarEvent`

## 1) Client (collection Mongo: `User`, endpoint: `client`)

Nota: nel frontend si chiama `Client`, ma lato Mongo la collection/model e` `User` con `role: 1` per i clienti.

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `_id` | `String` | Si | - | ID cliente (tipicamente UID Firebase), univoco |
| `name` | `String` | Si | - | Nome |
| `surname` | `String` | Si | - | Cognome |
| `phone_number` | `String` | Si | - | Numero telefono |
| `birthdate` | `Date` | No | - | Data di nascita |
| `gender` | `String` | No | - | Genere |
| `email` | `String` | No | - | Email, univoca se presente |
| `role` | `Number` | No | `1` | Ruolo utente (`1` = cliente) |
| `appointment_id` | `Object` | No | - | Campo legacy/non usato come relazione primaria |
| `createdAt` | `Date` | Auto | - | Gestito da `timestamps: true` |
| `updatedAt` | `Date` | Auto | - | Gestito da `timestamps: true` |

Relazioni utili:
- Un cliente ha molti appuntamenti: `Appointment.user_id === Client._id`

## 2) Appointment (collection Mongo: `Appointment`, endpoint: `appointment`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `date_time` | `Date` | Si | - | Data/ora inizio appuntamento |
| `user_id` | `String` | Si | - | FK logica verso `Client._id` |
| `treatment_ids` | `Array<String>` | Si | - | Lista FK logiche verso `Treatment._id` |
| `discount` | `Number` | No | - | Sconto totale |
| `extra` | `Number` | No | - | Extra totale |
| `fix_duration` | `Number` | No | - | Minuti extra fissi |
| `status` | `String` | Si | - | Stato appuntamento |
| `notes` | `String` | No | - | Note |
| `reminded` | `Boolean` | No | `false` | Promemoria inviato |
| `calendarEvent` | `Object` | No | - | Dati evento Google Calendar associato |
| `operator_id` | `String` | Si | - | Operatore proprietario del record |

Note:
- Non ha `timestamps` nello schema backend (quindi niente `createdAt`/`updatedAt` automatici).
- Prezzo e durata finali sono calcolati lato frontend:
  - Prezzo: somma prezzi trattamenti + `extra` - `discount`
  - Durata: somma durate trattamenti + `fix_duration`

## 3) Treatment (collection Mongo: `Treatment`, endpoint: `treatment`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `name` | `String` | Si | - | Nome trattamento |
| `icon` | `String` | Si | - | Icona |
| `color` | `String` | Si | - | Colore |
| `type_expense_id` | `String` | Si | - | FK logica verso `TypeExpense._id` |
| `duration` | `Number` | Si | - | Durata in minuti |
| `price` | `Number` | Si | - | Prezzo |
| `operator_id` | `String` | Si | - | Operatore proprietario del record |
| `createdAt` | `Date` | Auto | - | Gestito da `timestamps: true` |
| `updatedAt` | `Date` | Auto | - | Gestito da `timestamps: true` |

Relazioni utili:
- Un trattamento puo` comparire in molti appuntamenti (`Appointment.treatment_ids[]`).

## 4) TypeExpense (collection Mongo: `TypeExpense`, endpoint: `typeExpense`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `name` | `String` | Si | - | Nome categoria spesa |
| `icon` | `String` | Si | - | Icona categoria |
| `description` | `String` | No | - | Descrizione |
| `example_expense` | `String` | No | - | Esempio spesa |

Relazioni utili:
- `TypeExpense._id` e` referenziato da:
  - `Treatment.type_expense_id`
  - `Expense.type_expense_id`

## 5) Expense (collection Mongo: `Expense`, endpoint: `expense`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `name` | `String` | Si | - | Nome spesa |
| `type_expense_id` | `String` | Si | - | FK logica verso `TypeExpense._id` |
| `price` | `Number` | Si | - | Importo |
| `notes` | `String` | No | - | Note |
| `operator_id` | `String` | Si | - | Operatore proprietario del record |
| `recurrence` | `String` | No | - | Ricorrenza (`none`, `daily`, `weekly`, ecc.) |
| `status` | `String` | Si | - | Stato pagamento |
| `paidAt` | `Date` | Si | - | Data pagamento |
| `dueAt` | `Date` | No | - | Scadenza pagamento |
| `receipt` | `Boolean` | No | `false` | Presenza ricevuta |
| `createdAt` | `Date` | Auto | - | Gestito da `timestamps: true` |
| `updatedAt` | `Date` | Auto | - | Gestito da `timestamps: true` |

## 6) Settings (collection Mongo: `Settings`, endpoint: `settings`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `name` | `String` | Si | - | Chiave setting (es. `dayStart`, `breakStart`) |
| `value` | `String` | No | - | Valore setting |
| `createdAt` | `Date` | Auto | - | Gestito da `timestamps: true` |
| `updatedAt` | `Date` | Auto | - | Gestito da `timestamps: true` |

Setting usati esplicitamente nel codice:
- `dayStart`
- `breakStart`
- `breakEnd`
- `dayEnd`
- `appointmentDelay`

## 7) SyncUpdates (collection Mongo: `SyncUpdates`, endpoint: `syncUpdates`)

| Campo | Tipo | Obbligatorio | Default | Note |
|---|---|---|---|---|
| `tableName` | `String` | Si | - | Nome tabella da sincronizzare |
| `lastUpdate` | `Date` | Si | - | Ultimo aggiornamento server |

Uso:
- Confronto tra timestamp locale e server per decidere `get` remoto o `getLocal`.

## 8) CalendarEvent (model frontend per Google Calendar)

Questo model non e` una collection Mongo dedicata nel backend applicativo; e` usato per eventi calendario esterni (`personalAppointment`, `appCalendar`).

Campi usati dal frontend:

| Campo | Tipo | Origine/Note |
|---|---|---|
| `_id` | `String` | ID evento Google Calendar (quando presente) |
| `summary` | `String` | Titolo evento |
| `description` | `String` | Descrizione evento |
| `start` | `Date` | Inizio evento |
| `end` | `Date` | Fine evento |
| `date_time` | `Date` | Alias di `start` nel model frontend |
| `shortSummary` | `String` | Derivato lato frontend da `summary` |

## Note sulle Relazioni

- Le relazioni sono logiche (tramite ID stringa), non ci sono `ref` mongoose con join automatici.
- Cancellazioni non applicano cascata automatica a livello DB:
  - se elimini un `Client`, gli `Appointment` collegati non vengono rimossi automaticamente dal codice mostrato;
  - se elimini un `Treatment`, eventuali `Appointment.treatment_ids` possono restare orfani.
- Conviene gestire validazioni/integrita` a livello applicativo nelle operazioni CRUD.
