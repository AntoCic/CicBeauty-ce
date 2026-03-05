# Prompt Operativo - Design Pattern Front-end (Vue + cic-kit)

Usa questo prompt come riferimento per implementare o estendere il progetto mantenendo lo stesso pattern architetturale, UI e UX.  
Il testo e pensato per essere riutilizzabile anche su altri siti vetrina+app (es. wellness, studio professionale, retail locale), cambiando solo dominio e contenuti.

---

## 1) Panoramica del pattern

### Organizzazione generale
- L'app e una SPA Vue 3 con `vue-router`.
- Esistono due macro-aree:
- `Public`: vetrina, catalogo, pagine legali, accesso guest.
- `Auth`: area applicativa interna (dashboard/gestione operativa).
- La route `/` discrimina tra Home guest e Home auth in base allo stato login.

Snippet di routing home:

```vue
<HomeAuthView v-if="isLoggedIn" />
<HomeGuestView v-else />
```

### Filosofia del progetto
- Componentizzazione forte: sezioni UI in componenti piccoli e riusabili.
- Riuso delle convenzioni: naming coerente, layout ripetibili, pattern di fetch/stato uniformi.
- Coerenza UI: tipografia, spacing, form controls, feedback utente, micro-interazioni.
- Motion first: animazioni leggere ma diffuse (`@vueuse/motion`).
- Routing orientato al flusso utente:
- cataloghi pubblici seguono `Categoria -> Lista -> Dettaglio`.
- area auth e area public restano separate, anche visivamente.

---

## 2) Model + Store (concetto e regole d'uso)

### Cosa e un Model nel progetto
- Ogni entita dominio ha un Model in `src/models/*`.
- I Model estendono `FirestoreModel` (da `cic-kit`) e includono:
- struttura dati (`*Data` interface),
- costruttore con normalizzazione,
- `toData()` per serializzazione,
- eventuali helper (es. formatter prezzo).

Pattern tipico:

```ts
export interface ProductData { id: string; title: string; categoryIds?: string[]; ... }

export class Product extends FirestoreModel<ProductData> {
  static collectionName = 'products'
  categoryIds: string[]

  constructor(data: ProductData) {
    super(data)
    this.categoryIds = Array.isArray(data.categoryIds)
      ? data.categoryIds.map((id) => String(id ?? '').trim()).filter(Boolean)
      : []
  }
}
```

Regola: normalizza nel Model, non nei componenti.

### Cosa e uno Store nel progetto
- Non e usato Pinia in modo esplicito.
- Pattern attuale: store reattivi basati su `FirestoreStore` di `cic-kit`:

```ts
class ProductStore extends FirestoreStore<Product, ProductData> {
  constructor() { super(Product) }
}
export const productStore = reactive(new ProductStore())
```

- Ogni store vive in `src/stores/*`.
- Lo stato condiviso e letto da computed nei componenti.

### Uso di `useStoreWatch` (regola fondamentale)
- `useStoreWatch` (da `cic-kit`) e il meccanismo standard per agganciare uno o piu store alla vista.
- Serve a:
- sincronizzare dati quando la vista e attiva,
- centralizzare fetch + refresh store con opzioni uniformi,
- evitare fetch manuali ripetuti in ogni componente.

Pattern tipico:

```ts
useStoreWatch([
  { store: productStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } }, checkLogin: false },
  { store: productCategoryStore, getOpts: { orderBy: { fieldPath: 'updatedAt', directionStr: 'desc' } }, checkLogin: false },
])
```

Pattern con permessi:

```ts
useStoreWatch(canOperate.value ? [{ store: appointmentStore, getOpts: {} }] : [])
```

Best practice `useStoreWatch`:
- dichiararlo in alto nello `<script setup>`.
- passare `checkLogin: false` per dati pubblici.
- usare `getOpts` coerenti (ordinamenti, filtri).
- condizionare la registrazione per ruolo quando serve.
- cleanup lifecycle: gestito internamente dal composable (evitare watcher duplicati manuali per lo stesso scopo).

### Best practice Model/Store
- Evita logica duplicata nei componenti.
- Metti regole di mapping/normalizzazione nel Model.
- Metti accesso e stato condiviso nello Store.
- Usa computed per derived state locale (filtri, mappe per id, contatori).
- Naming consigliato:
- `XData` per tipo raw,
- `X` per model class,
- `xStore` per store singleton reattivo.

---

## 3) UI Kit e preferenze componenti

### Preferenza primaria
- Usare prima i componenti di `cic-kit` (`Btn`, `LoaderCmp`, `ToastCmp`, `ToolbarApp`, `FieldTiptap`, ecc.).
- Bootstrap e disponibile, ma come supporto layout/stile, non come alternativa anarchica.

### Composizione pagina consigliata
- Header/toolbar (interno o pubblico).
- Sezioni/card coerenti.
- Form controls standardizzati.
- Stati vuoti, errori, loading.
- CTA esplicite.

### Regole pratiche
- Tipografia: una gerarchia chiara (h1 unico per pagina principale pubblica).
- Spacing: usare scale coerenti (`clamp`, gap uniformi, griglie responsive).
- Responsive: progettare mobile-first, evitare overflow orizzontale.
- Accessibilita base:
- `alt` immagini,
- `aria-label` controlli icon-only,
- focus visibile,
- semantica (`nav`, `header`, `main`, `section`, `article`).

---

## 4) Hub file (integrazione esterna + notifiche)

### Modulo hub centrale
- File attuale: `src/call/hub.ts`.
- Responsabilita:
- esporre API semplici (`hub.info`, `hub.warning`, `hub.error`, `hub.deploy`),
- normalizzare payload e validazione minima,
- delegare al layer callable (`callProjectMessageRelay` / `publishProjectMessage`).

### Pattern richiesto
- L'hub deve essere il punto di ingresso per integrare servizi esterni di messaggistica/notifica progetto.
- Componenti e viste non chiamano endpoint esterni “a mano” se esiste gia funzione hub.

### Errori e stati
- Gestire errori via utility centrali (`src/call/_utilityApi.ts`, es. `defaultCatch`).
- Evitare `toast` sparsi senza criterio:
- per API/errori usare utility comuni,
- per success path usare messaggi consistenti per dominio.

Regola: notifiche sempre centralizzate e standardizzate (stesso tono, stesso punto tecnico).

---

## 5) Motion & Transizioni

### Libreria
- Usare `@vueuse/motion` in modo massivo (ingressi pagina, reveal, hover/tap, liste).
- Installazione plugin in `main.ts` con preset custom.

Snippet:

```ts
app.use(MotionPlugin, {
  directives: createMotionPresets(reduceMotionEnabled),
})
```

### Preset consigliati
- `fadeUp`, `fadeIn`, `slideLeft`, `scaleIn`, `staggerChildren`, `hoverLift`, `tapScale`, `softSpring`.
- Definirli in libreria dedicata (es. `src/motion/presets.ts`) e riusarli.

### Reveal on scroll e liste
- Usare direttive motion su sezioni/cards (`v-motion-*`).
- Per liste/card usare delay progressivo (`index * step`) e transizioni `transform/opacity`.

### Page transitions
- Wrappare `RouterView` con `Transition` (`mode="out-in"`).
- Pattern:
- fade+translate per pagine standard,
- slide forward/backward su drill-down (es. categoria -> dettaglio).
- Gestire `prefers-reduced-motion` con durata minima o animazioni disattivate.

---

## 6) Emoji e tono UI

### Uso consigliato
- Emoji controllate per aggiungere calore e orientamento:
- badge categoria,
- titoli sezione brevi,
- empty state,
- messaggi notifica non critici.

### Evitare emoji in
- pagine legali,
- testi formali/compliance,
- errori critici o contesti amministrativi sensibili.

Regola: emoji utili alla chiarezza, mai decorative in eccesso o infantili.

---

## 7) Bootstrap app: `main.ts` e `App.vue`

### `main.ts` deve fare
- bootstrap consenso cookie prima analytics,
- setup Firebase + Auth,
- init store/config globale `cic-kit`,
- mount app con router + motion plugin.

Ordine logico consigliato:

```ts
bootstrapConsentBeforeFirebase(...)
setupFirebase(...)
applyConsentToAnalytics(...)
initAuth(...)
initCicKitStore(...)
createApp(App).use(MotionPlugin).use(router).mount('#app')
```

### `App.vue` deve fare
- layout root globale,
- `RouterView` + `Transition`,
- componenti globali (`LoaderCmp`, `ToastCmp`, `ToolbarApp`, `CookieConsentBanner`, SW register),
- gestione menu toolbar auth in base a route/login/permessi.

---

## 8) Gestione viste: Home Public, Home Auth, Home “app”

### Home pubblica (vetrina)
- Obiettivo: branding, trust, CTA e percorso guidato verso cataloghi.
- Pattern pubblico consigliato:
- Hero -> quick access -> proof -> sezioni narrative -> contatti -> footer.

### Area auth (dashboard/app)
- Obiettivo: operativita interna.
- Home auth stile app:
- quick actions icone in alto/griglia,
- moduli per funzioni core,
- accesso rapido a tool in base a ruolo.

### Permessi utente
- Permessi letti da `Auth.user.hasPermission(...)` + utility (`hasOperatorAccess`).
- Mostra/nascondi voci via `computed`, mai hardcode nel template senza guard.
- Centralizzare regole in config map (es. `permissionRule`).

Pattern:

```ts
const visibleApps = computed(() => AUTH_HOME_APPS.filter(canOpenApp))
```

### `toolbarMenu` (solo area auth)
- File: `src/toolbarMenu.ts`.
- Deve essere usato solo in area autenticata.
- Contiene mappa voci + flag permessi (`requiresOperator`, `requiresAdmin`, `requiresSuperAdmin`, `requiresBetaFeatures`).
- `App.vue` applica i tab tramite `getToolbarOffcanvasTabs(...)`.

Esempio ruolo-based:
- `StatsView` visibile solo operatori.
- `AppConfigView` e backup solo super admin.
- demo/tools solo beta features.

---

## 9) File & cartelle (convenzione)

Struttura consigliata:
- `src/views/`: pagine route-level.
- `src/components/`: componenti riusabili.
- `src/components/public/`: blocchi vetrina (hero, faq, gallery, ecc.).
- `src/stores/`: stato dominio (uno store per entita).
- `src/models/`: model class + data interfaces + normalizzazione.
- `src/composables/`: logica cross-view (`usePublicSeo`, ecc.).
- `src/call/` (equivale a `hub/services`): API client, wrapper callable, hub centralizzato.
- `src/legal/`: logica consenso cookie e legale runtime.
- `src/motion/`: preset motion e helper animazioni.
- `src/assets/`: risorse statiche di stile/media.
- `docs/`: documentazione operativa e prompt.

Regole naming:
- un componente = una responsabilita.
- evitare cartelle “misc”.
- evitare componenti monolitici con logica dominio pesante.
- separare chiaramente UI, stato, dominio, integrazione API.

---

## Sezione legale obbligatoria (cookie, termini, privacy, AI) con `AppConfig`

### Principio
- Tutto il contenuto legale e governato da `AppConfig` (DB) con fallback su `APP_CONFIG_DEFAULTS`.
- Non hardcodare testi legali direttamente nelle viste, salvo fallback tecnico.

### Campi legali principali in `AppConfig`
- `legalLastUpdated`
- `cookieConsentKeyDate`
- `cookieBannerTextHtml`
- `cookieBannerRejectBtnText`
- `cookieBannerAcceptBtnText`
- `privacyPolicyBodyHtml`
- `cookiePolicyBodyHtml`
- `termsConditionsBodyHtml`
- `aiTransparencyBodyHtml`
- dati titolare/contatti (`ownerName`, `legalEntity`, `privacyEmail`, ecc.)

### Cookie consent pattern
- `cookieConsentKeyDate` genera storage key versione consenso.
- Quando cambia, si forza nuova raccolta consenso.
- Bootstrap consenso prima di attivare analytics:
- leggere consenso da storage,
- impostare flag `ga-disable-*`,
- abilitare/disabilitare analytics runtime.

File chiave:
- `src/legal/cookieConsent.ts`
- `src/components/CookieConsentBanner.vue`

### Pagine legali
- Viste legali leggono da `appConfigStore.getConfig()` + merge defaults.
- Se dati incompleti, mostrare warning editoriale (es. placeholder legali).
- Link legali sempre disponibili in footer/banner.

### Governance operativa
- `AppConfigView` e la sola UI di gestione contenuti legali/config avanzata (ruolo super admin).
- Qualsiasi nuovo requisito legale deve essere modellato in `AppConfig` e non disperso nelle viste.

---

## Checklist rapida per nuove feature

- Nuovo dominio dati -> crea `Model` + `Store`.
- Vista che usa dati store -> usa `useStoreWatch`.
- API esterna -> passa da `call/*` o `hub`, non chiamare endpoint inline.
- Feedback utente -> usa notifica centralizzata (`toast` via utility condivisa).
- Nuova pagina -> rispetta layout root + motion + SEO base.
- Se area auth -> integra permessi e `toolbarMenu` se serve navigazione interna.
- Se area pubblica -> preserva flusso categoria -> dettaglio.
- Se impatta policy/consenso -> aggiorna `AppConfig` + flusso cookie/legal.

---

## Nota di compatibilita per riuso su altro sito

Per riapplicare questo pattern a un'altra attivita:
- mantieni struttura tecnica (views/components/models/stores/call/legal/motion/docs),
- sostituisci contenuti business (categorie, copy, CTA, policy),
- verifica dipendenze presenti (`cic-kit`, `@vueuse/motion`, Firebase callable),
- se una dipendenza non e disponibile nel nuovo progetto: **verificare nel progetto** e replicare il pattern equivalente (store reattivo, hub API centrale, motion presets, config legale centralizzata).

