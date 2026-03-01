# Codex Task Preferences

Quando in un task viene nominato `codex.md`, devi seguire questa lista puntata come regola operativa.

- Dai priorita ai componenti gia pronti del pacchetto `cic-kit`.
- Nei componenti preferisco l'uso di `<style scoped lang="scss">`.
- Per lo stile preferisco le classi Bootstrap; CSS custom solo quando serve per esigenze particolari.
- Se ci sono eventi o stati importanti (`error`, `warning`, `info`) da segnalare, usa la funzione di invio notifiche a HubCortex (`hub.*`).
- Nelle notifiche HubCortex si puo passare un `payload`, ma se possibile evita il payload e spiega in modo completo il contesto direttamente nel campo `message`.
- Passa il `payload` solo quando e realmente utile/necessario.

Prompt da applicare:
"Quando ti chiedo un task e nomino `codex.md`, devi applicare tutte le regole della lista puntata in questa pagina."

