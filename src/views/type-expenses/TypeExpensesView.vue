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
  name: string;
  description: string;
  updateBy: string;
};

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const formKey = ref(0);
const isSeedingDefaults = ref(false);

const categories = [
  {
    name: "Unghie",
    description:
      "Include tutte le spese legate ai trattamenti per mani e piedi, come manicure e pedicure. Comprende ad esempio smalti semipermanenti, gel, acrilico, lime, frese, lampade UV/LED, solventi, prodotti per la ricostruzione e strumenti professionali per la cura e la decorazione delle unghie."
  },
  {
    name: "Ciglia e Sopracciglia",
    description:
      "Include tutte le spese relative ai trattamenti per ciglia e sopracciglia, come laminazione, extension, tintura e definizione. Comprende ad esempio prodotti per laminazione, colle per extension, tinture specifiche, patch occhi, primer, remover e strumenti professionali come pinzette e microbrush."
  },
  {
    name: "Trattamenti Speciali",
    description:
      "Include le spese relative a trattamenti specifici non facilmente categorizzabili in altre aree, come trattamenti anti-smagliature, schiarenti o rigeneranti. Ad esempio sieri schiarenti, prodotti anti-macchia, cosmetici professionali per trattamenti intensivi, fanghi, bendaggi e attivi specifici."
  },
  {
    name: "Spese Generali",
    description:
      "Include tutte le spese non direttamente collegate a un trattamento specifico ma necessarie per il funzionamento dell'attivita. Ad esempio affitto del locale, bollette, detergenti, prodotti per la sanificazione, materiale monouso, cancelleria, marketing e manutenzione delle attrezzature."
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
    name: yup.string().required("Campo obbligatorio"),
    description: yup.string().required("Campo obbligatorio"),
    updateBy: yup.string().required("Campo obbligatorio"),
  }),
);

const defaultValues = computed<TypeExpenseForm>(() => ({
  name: "",
  description: "",
  updateBy: defaultUpdateBy.value,
}));

async function onSubmit(values: Record<string, unknown>) {
  const payload: TypeExpenseForm = {
    name: String(values.name ?? ""),
    description: String(values.description ?? ""),
    updateBy: String(values.updateBy ?? ""),
  };

  try {
    await typeExpenseStore.add({
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

</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Questa sezione e riservata ad amministratori e super amministratori.
    </p>

    <Form v-if="canManage" :key="formKey" class="card border-0 shadow-sm p-3 my-3" :validation-schema="schema"
      :initial-values="defaultValues" @submit="onSubmit" v-slot="{ isSubmitting }">
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <label class="form-label">Nome</label>
          <Field name="name" class="form-control" />
          <ErrorMessage name="name" class="text-danger small" />
        </div>
        <div class="col-12 col-md-6">
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
          <strong>{{ item.name }}</strong>
          <small class="text-muted">{{ item.updateBy }}</small>
        </div>
        <p class="mb-0">{{ item.description }}</p>
      </div>

      <p v-if="!typeExpenseStore.itemsActiveArray.length" class="text-muted small mb-0">Nessun tipo di spesa.</p>
    </div>
  </div>
</template>
