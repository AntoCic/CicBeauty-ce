<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader, useStoreWatch } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, ref } from "vue";
import { typeExpenseStore } from "../../stores/typeExpenseStore";
import { Auth } from "../../main";

useChangeHeader("Tipi di spesa", "/");
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
useStoreWatch(canManage.value ? [{ store: typeExpenseStore, getOpts: { forceLocalSet: true } }] : []);

type TypeExpenseForm = {
  emoji: string;
  name: string;
  description: string;
  updateBy: string;
};

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const formKey = ref(0);
const isSeedingDefaults = ref(false);

const categories = [
  {
    name: "Cerette",
    emoji: "🍯",
    description:
      "Spese legate ai trattamenti di epilazione con cera tradizionale. Include cere a caldo e a freddo, rulli, spatole, strisce TNT, scaldacera, oli post-epilazione, talco, prodotti pre e post trattamento e materiale monouso specifico."
  },
  {
    name: "Laser Epilazione",
    emoji: "🔦",
    description:
      "Spese relative ai trattamenti di epilazione laser o luce pulsata. Include manutenzione macchinari, manipoli, gel conduttori, occhiali protettivi, prodotti pre e post trattamento e materiali di consumo specifici."
  },
  {
    name: "Massaggi",
    emoji: "💆‍♀️",
    description:
      "Spese legate ai trattamenti di massoterapia e relax. Include oli da massaggio, creme, candele, lettini, coprilettini monouso, asciugamani, diffusori di aromi e prodotti per massaggi drenanti, decontratturanti o modellanti."
  },
  {
    name: "Trattamenti Viso",
    emoji: "✨",
    description:
      "Spese per trattamenti estetici viso. Include detergenti professionali, peeling, maschere, sieri, tonici, vaporizzatori, spatole ultrasuoni, prodotti anti-age, anti-acne, idratanti e attivi specifici."
  },
  {
    name: "Trattamenti Corpo",
    emoji: "🧴",
    description:
      "Spese per trattamenti estetici corpo. Include fanghi, bendaggi, creme riducenti, scrub, oli specifici, macchinari corpo e prodotti rassodanti o drenanti."
  },
  {
    name: "Unghie & Pedicure",
    emoji: "💅",
    description:
      "Include tutte le spese legate ai trattamenti per mani e piedi. Smalti semipermanenti, gel, acrilico, lime, frese, punte, lampade UV/LED, solventi, primer, tip, decorazioni e strumenti professionali."
  },
  {
    name: "Ciglia",
    emoji: "👁️",
    description:
      "Spese per extension ciglia, laminazione e trattamenti specifici. Include colle, patch, primer, remover, lash lift kit, pinzette professionali e microbrush."
  },
  {
    name: "Sopracciglia",
    emoji: "🖌️",
    description:
      "Spese per trattamenti sopracciglia. Include tinture, henné, pinzette, cere specifiche, prodotti per laminazione sopracciglia e strumenti di precisione."
  },
  {
    name: "Materiale Monouso",
    emoji: "🧼",
    description:
      "Prodotti e strumenti per la pulizia, guanti, mascherine, lenzuolini, carta, cotton fioc, spatole monouso, slip monouso e tutto il materiale usa e getta."
  },
  {
    name: "Prodotti Rivendita",
    emoji: "🛍️",
    description:
      "Prodotti acquistati per la rivendita al cliente, come creme, sieri, shampoo, integratori, kit skincare e prodotti professionali retail."
  },
  {
    name: "Formazione",
    emoji: "🎓",
    description:
      "Corsi di aggiornamento, masterclass, certificazioni, workshop, trasferte per formazione e materiali didattici."
  },
  {
    name: "Marketing e Pubblicità",
    emoji: "📣",
    description:
      "Spese per sponsorizzazioni social, volantini, sito web, grafica, campagne pubblicitarie, shooting fotografici e branding."
  },
  {
    name: "Affitto",
    emoji: "🏢",
    description:
      "Canone di locazione del locale commerciale."
  },
  {
    name: "Utenze",
    emoji: "💡",
    description:
      "Luce, acqua, gas, internet, telefono e altre utenze necessarie al funzionamento dell'attività. Interventi di manutenzione ordinaria e straordinaria del centro estetico."
  },
  {
    name: "Personale",
    emoji: "👩‍💼",
    description:
      "Stipendi, contributi, consulente del lavoro, assicurazioni dipendenti e collaboratori."
  },
  {
    name: "Assicurazioni e Consulenze",
    emoji: "📑",
    description:
      "Polizze assicurative, commercialista, consulente fiscale e legale."
  }
];

const defaultUpdateBy = computed(() => {
  const email = Auth.user?.email?.trim();
  if (email) return email;
  const uid = Auth.uid?.trim();
  if (uid) return uid;
  return "admin";
});

const schema = toTypedSchema(
  yup.object({
    emoji: yup.string().default(""),
    name: yup.string().required("Campo obbligatorio"),
    description: yup.string().required("Campo obbligatorio"),
    updateBy: yup.string().required("Campo obbligatorio"),
  }),
);

const defaultValues = computed<TypeExpenseForm>(() => ({
  emoji: "",
  name: "",
  description: "",
  updateBy: defaultUpdateBy.value,
}));

async function onSubmit(values: Record<string, unknown>) {
  const payload: TypeExpenseForm = {
    emoji: String(values.emoji ?? "").trim(),
    name: String(values.name ?? ""),
    description: String(values.description ?? ""),
    updateBy: String(values.updateBy ?? ""),
  };

  try {
    await typeExpenseStore.add({
      emoji: payload.emoji,
      name: payload.name,
      description: payload.description,
      updateBy: payload.updateBy,
    });
    toast.success("Tipo di spesa creato");
    formKey.value += 1;
  } catch (error) {
    console.error(error);
    toast.error("Errore nella creazione del tipo di spesa");
  }
}

async function addDefaultCategories() {
  if (isSeedingDefaults.value || typeExpenseStore.itemsActiveArray.length) return;

  isSeedingDefaults.value = true;
  try {
    for (const category of categories) {
      await typeExpenseStore.add({
        emoji: category.emoji,
        name: category.name,
        description: category.description,
        updateBy: defaultUpdateBy.value,
      });
    }
    toast.success("Categorie base aggiunte");
  } catch (error) {
    console.error(error);
    toast.error("Errore durante l'aggiunta delle categorie base");
  } finally {
    isSeedingDefaults.value = false;
  }
}

function typeExpenseLabel(typeExpense: { emoji?: string; name: string }) {
  const emoji = String(typeExpense.emoji ?? "").trim();
  const name = String(typeExpense.name ?? "").trim();
  return [emoji, name].filter(Boolean).join(" ");
}

</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Questa sezione e riservata ad amministratori e super amministratori.
    </p>

    <Form v-if="canManage" :key="formKey" class="card border-0 shadow-sm p-3 my-3" :validation-schema="schema"
      :initial-values="defaultValues" @submit="onSubmit" v-slot="{ isSubmitting }">
      <div class="row g-3">
        <div class="col-12 col-md-3">
          <label class="form-label">Emoji</label>
          <Field name="emoji" class="form-control" placeholder="💅" />
          <ErrorMessage name="emoji" class="text-danger small" />
        </div>
        <div class="col-12 col-md-5">
          <label class="form-label">Nome</label>
          <Field name="name" class="form-control" />
          <ErrorMessage name="name" class="text-danger small" />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Descrizione</label>
          <Field name="description" as="textarea" class="form-control" rows="3" />
          <ErrorMessage name="description" class="text-danger small" />
        </div>
      </div>
      <Btn class="mt-3" type="submit" color="dark" icon="add" :loading="isSubmitting">Aggiungi tipo di spesa</Btn>
    </Form>

    <div class="mb-3" v-if="canManage && !typeExpenseStore.itemsActiveArray.length">
      <Btn color="secondary" icon="dataset" :loading="isSeedingDefaults" @click="addDefaultCategories">
        Aggiungi categorie base
      </Btn>
    </div>

    <div v-if="canManage" class="vstack gap-2">
      <div v-for="item in typeExpenseStore.itemsActiveArray" :key="item.id" class="card border-0 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong>{{ typeExpenseLabel(item) }}</strong>
          <small class="text-muted">{{ item.updateBy }}</small>
        </div>
        <p class="mb-0">{{ item.description }}</p>
      </div>

      <p v-if="!typeExpenseStore.itemsActiveArray.length" class="text-muted small mb-0">Nessun tipo di spesa.</p>
    </div>
  </div>
</template>
