<script setup lang="ts">
import { Btn, cicKitStore, toast, useChangeHeader } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed, onMounted, ref } from "vue";
import { announcementStore } from "../../stores/announcementStore";
import { Auth } from "../../main";

type AnnouncementForm = {
  type: string;
  text: string;
  updateBy: string;
};

useChangeHeader("Avvisi", "/");
onMounted(() => {
  void announcementStore.get({ orderBy: { fieldPath: "updatedAt", directionStr: "desc" } });
});

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const formKey = ref(0);
const canManage = computed(() => Auth.isAdmin || Auth.isSuperAdmin);
const defaultUpdateBy = computed(() => {
  const email = Auth.user?.email?.trim();
  if (email) return email;
  const uid = Auth.uid?.trim();
  if (uid) return uid;
  return "admin";
});

const schema = toTypedSchema(
  yup.object({
    type: yup.string().required("Campo obbligatorio"),
    text: yup.string().required("Campo obbligatorio"),
    updateBy: yup.string().required("Campo obbligatorio"),
  }),
);

const defaultValues = computed<AnnouncementForm>(() => ({
  type: "info",
  text: "",
  updateBy: defaultUpdateBy.value,
}));

async function onSubmit(values: Record<string, unknown>) {
  const payload: AnnouncementForm = {
    type: String(values.type ?? ""),
    text: String(values.text ?? ""),
    updateBy: String(values.updateBy ?? ""),
  };

  try {
    await announcementStore.add({
      type: payload.type,
      text: payload.text,
      updateBy: payload.updateBy,
    });
    toast.success("Avviso creato");
    formKey.value += 1;
  } catch (error) {
    console.error(error);
    toast.error("Errore nella creazione dell'avviso");
  }
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Avvisi</h1>
    </div>

    <Form
      v-if="canManage"
      :key="formKey"
      class="card border-0 shadow-sm p-3 mb-3"
      :validation-schema="schema"
      :initial-values="defaultValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting }"
    >
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="form-label">Tipo</label>
          <Field name="type" class="form-control" />
          <ErrorMessage name="type" class="text-danger small" />
        </div>
        <div class="col-12 col-md-8">
          <label class="form-label">Aggiornato da</label>
          <Field name="updateBy" class="form-control" />
          <ErrorMessage name="updateBy" class="text-danger small" />
        </div>
        <div class="col-12">
          <label class="form-label">Testo</label>
          <Field name="text" as="textarea" class="form-control" rows="3" />
          <ErrorMessage name="text" class="text-danger small" />
        </div>
      </div>
      <Btn class="mt-3" type="submit" color="dark" icon="add" :loading="isSubmitting">Aggiungi avviso</Btn>
    </Form>

    <p v-if="!canManage" class="text-muted small">
      Stai visualizzando gli avvisi pubblici.
    </p>

    <div class="vstack gap-2">
      <div
        v-for="item in announcementStore.itemsActiveArray"
        :key="item.id"
        class="card border-0 shadow-sm p-3"
      >
        <div class="d-flex justify-content-between align-items-center mb-1">
          <strong>{{ item.type }}</strong>
          <small class="text-muted">{{ item.updateBy }}</small>
        </div>
        <p class="mb-0">{{ item.text }}</p>
      </div>

      <p v-if="!announcementStore.itemsActiveArray.length" class="text-muted small mb-0">Nessun avviso disponibile.</p>
    </div>
  </div>
</template>
