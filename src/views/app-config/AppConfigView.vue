<script setup lang="ts">
import { Btn, FieldTiptap, cicKitStore, defaultUserPermission, toast, useChangeHeader } from "cic-kit";
import { Form, Field, ErrorMessage } from "vee-validate";
import { toTypedSchema } from "@vee-validate/yup";
import * as yup from "yup";
import { computed } from "vue";
import {
  APP_CONFIG_DEFAULTS,
  APP_CONFIG_ID,
  buildCookieConsentStorageKey,
  hasLegalPlaceholdersInConfig,
  mergeAppConfigWithDefaults,
  normalizeCookieConsentKeyDate,
  type AppConfigFields
} from "../../models/AppConfig";
import { appConfigStore } from "../../stores/appConfigStore";
import { Auth } from "../../main";

const EMPTY_HTML = "<p></p>";

const htmlSectionFields = [
  { key: "cookieBannerTextHtml", label: "Cookie Banner - Testo HTML" },
  { key: "privacyPolicyBodyHtml", label: "Privacy Policy - Corpo HTML" },
  { key: "cookiePolicyBodyHtml", label: "Cookie Policy - Corpo HTML" },
  { key: "termsConditionsBodyHtml", label: "Termini e Condizioni - Corpo HTML" },
  { key: "aiTransparencyBodyHtml", label: "Trasparenza AI - Corpo HTML" },
] as const;

type AppConfigForm = AppConfigFields;
type AppConfigFieldKey = keyof AppConfigFields;
type HtmlSectionField = (typeof htmlSectionFields)[number]["key"];

useChangeHeader("App Config", { name: "home" });

const bgStyle = computed(() => cicKitStore.defaultViews.bgStyle());
const canManage = computed(() => Auth?.user?.hasPermission(defaultUserPermission.SUPERADMIN) ?? false);
const currentConfig = computed(() => appConfigStore.getConfig());
const currentConfigData = computed(() => mergeAppConfigWithDefaults(currentConfig.value?.toData()));
const hasLegalPlaceholders = computed(() => hasLegalPlaceholdersInConfig(currentConfigData.value));
const formKey = computed(() => `${currentConfigData.value.id}:${currentConfig.value?.updatedAt?.seconds ?? 0}`);

const schema = toTypedSchema(
  yup.object({
    brandName: yup.string().trim().required("Campo obbligatorio"),
    legalLastUpdated: yup.string().trim().required("Campo obbligatorio"),
    cookieConsentKeyDate: yup.string().trim().required("Campo obbligatorio"),
    ownerName: yup.string().trim().required("Campo obbligatorio"),
    legalEntity: yup.string().trim().required("Campo obbligatorio"),
    vatOrTaxCode: yup.string().trim().required("Campo obbligatorio"),
    officeAddress: yup.string().trim().required("Campo obbligatorio"),
    privacyEmail: yup.string().trim().email("Email non valida").required("Campo obbligatorio"),
    pec: yup.string().trim().default(""),
    aiModel: yup.string().trim().required("Campo obbligatorio"),
    aiProvider: yup.string().trim().required("Campo obbligatorio"),
    cookieBannerTextHtml: yup.string().required("Campo obbligatorio").default(EMPTY_HTML),
    cookieBannerRejectBtnText: yup.string().trim().required("Campo obbligatorio"),
    cookieBannerAcceptBtnText: yup.string().trim().required("Campo obbligatorio"),
    privacyPolicyBodyHtml: yup.string().required("Campo obbligatorio").default(EMPTY_HTML),
    cookiePolicyBodyHtml: yup.string().required("Campo obbligatorio").default(EMPTY_HTML),
    termsConditionsBodyHtml: yup.string().required("Campo obbligatorio").default(EMPTY_HTML),
    aiTransparencyBodyHtml: yup.string().required("Campo obbligatorio").default(EMPTY_HTML),
  }),
);

const initialValues = computed<AppConfigForm>(() => ({
  brandName: currentConfigData.value.brandName,
  legalLastUpdated: currentConfigData.value.legalLastUpdated,
  cookieConsentKeyDate: currentConfigData.value.cookieConsentKeyDate,
  ownerName: currentConfigData.value.ownerName,
  legalEntity: currentConfigData.value.legalEntity,
  vatOrTaxCode: currentConfigData.value.vatOrTaxCode,
  officeAddress: currentConfigData.value.officeAddress,
  privacyEmail: currentConfigData.value.privacyEmail,
  pec: currentConfigData.value.pec,
  aiModel: currentConfigData.value.aiModel,
  aiProvider: currentConfigData.value.aiProvider,
  cookieBannerTextHtml: currentConfigData.value.cookieBannerTextHtml || EMPTY_HTML,
  cookieBannerRejectBtnText: currentConfigData.value.cookieBannerRejectBtnText,
  cookieBannerAcceptBtnText: currentConfigData.value.cookieBannerAcceptBtnText,
  privacyPolicyBodyHtml: currentConfigData.value.privacyPolicyBodyHtml || EMPTY_HTML,
  cookiePolicyBodyHtml: currentConfigData.value.cookiePolicyBodyHtml || EMPTY_HTML,
  termsConditionsBodyHtml: currentConfigData.value.termsConditionsBodyHtml || EMPTY_HTML,
  aiTransparencyBodyHtml: currentConfigData.value.aiTransparencyBodyHtml || EMPTY_HTML,
}));

function normalizeHtml(value: unknown) {
  const normalized = String(value ?? EMPTY_HTML)
  return normalized.trim() ? normalized : EMPTY_HTML
}

async function onSubmit(values: Record<string, unknown>) {
  if (!canManage.value) {
    toast.error("Solo i super admin possono modificare AppConfig");
    return;
  }

  const payload: AppConfigForm = {
    brandName: String(values.brandName ?? "").trim(),
    legalLastUpdated: String(values.legalLastUpdated ?? "").trim(),
    cookieConsentKeyDate: normalizeCookieConsentKeyDate(values.cookieConsentKeyDate),
    ownerName: String(values.ownerName ?? "").trim(),
    legalEntity: String(values.legalEntity ?? "").trim(),
    vatOrTaxCode: String(values.vatOrTaxCode ?? "").trim(),
    officeAddress: String(values.officeAddress ?? "").trim(),
    privacyEmail: String(values.privacyEmail ?? "").trim(),
    pec: String(values.pec ?? "").trim(),
    aiModel: String(values.aiModel ?? "").trim(),
    aiProvider: String(values.aiProvider ?? "").trim(),
    cookieBannerTextHtml: normalizeHtml(values.cookieBannerTextHtml),
    cookieBannerRejectBtnText: String(values.cookieBannerRejectBtnText ?? "").trim(),
    cookieBannerAcceptBtnText: String(values.cookieBannerAcceptBtnText ?? "").trim(),
    privacyPolicyBodyHtml: normalizeHtml(values.privacyPolicyBodyHtml),
    cookiePolicyBodyHtml: normalizeHtml(values.cookiePolicyBodyHtml),
    termsConditionsBodyHtml: normalizeHtml(values.termsConditionsBodyHtml),
    aiTransparencyBodyHtml: normalizeHtml(values.aiTransparencyBodyHtml),
  };

  try {
    if (currentConfig.value) {
      await currentConfig.value.update(payload);
    } else {
      await appConfigStore.add({
        id: APP_CONFIG_ID,
        ...payload,
      });
    }
    toast.success("AppConfig salvata");
  } catch (error) {
    console.error(error);
    toast.error("Errore nel salvataggio di AppConfig");
  }
}

function htmlValue(values: Record<string, unknown>, key: HtmlSectionField) {
  return normalizeHtml(values[key]);
}

function formatTodayLegalDateLabel() {
  return new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function formatTodayCookieKeyDate() {
  return new Date().toISOString().slice(0, 10);
}

function fillLegalDateWithToday(setFieldValue: (field: string, value: unknown) => void) {
  setFieldValue("legalLastUpdated", formatTodayLegalDateLabel());
}

function confirmAndUpdateCookieConsentKeyDate(setFieldValue: (field: string, value: unknown) => void) {
  const confirmed = typeof window === "undefined"
    ? true
    : window.confirm("Sei sicuro? Aggiornando questa data tutti gli utenti dovranno accettare nuovamente i cookie.");
  if (!confirmed) return;
  setFieldValue("cookieConsentKeyDate", formatTodayCookieKeyDate());
}

function cookieConsentStorageKeyPreview(cookieConsentKeyDate: unknown) {
  return buildCookieConsentStorageKey(cookieConsentKeyDate);
}

function hasDefaultForField(field: AppConfigFieldKey) {
  return Object.prototype.hasOwnProperty.call(APP_CONFIG_DEFAULTS, field);
}

function resetFieldToDefault(field: AppConfigFieldKey, setFieldValue: (field: string, value: unknown) => void) {
  if (!hasDefaultForField(field)) return;
  setFieldValue(field, APP_CONFIG_DEFAULTS[field]);
}
</script>

<template>
  <div class="container-fluid pb-t overflow-auto h-100" :style="bgStyle">
    <p v-if="!canManage" class="text-muted small mt-3">
      Solo i super admin possono modificare AppConfig.
    </p>
    <p v-if="hasLegalPlaceholders" class="legal-warning mt-3">
      Sono presenti campi legali incompleti (valori DA_COMPLETARE o vuoti).
    </p>

    <Form
      :key="formKey"
      class="card border-0 shadow-sm p-3 my-3"
      :validation-schema="schema"
      :initial-values="initialValues"
      @submit="onSubmit"
      v-slot="{ isSubmitting, values, setFieldValue }"
    >
      <section class="config-section">
        <h2 class="h6 mb-3">Generale</h2>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Brand name</label>
              <Btn
                v-if="hasDefaultForField('brandName')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('brandName', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="brandName" class="form-control" />
            <ErrorMessage name="brandName" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Ultimo aggiornamento legale</label>
              <Btn
                v-if="hasDefaultForField('legalLastUpdated')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('legalLastUpdated', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <div class="d-flex gap-2 align-items-start">
              <Field name="legalLastUpdated" class="form-control" />
              <Btn type="button" color="secondary" class="flex-shrink-0" @click="fillLegalDateWithToday(setFieldValue)">
                Oggi
              </Btn>
            </div>
            <ErrorMessage name="legalLastUpdated" class="text-danger small" />
          </div>
        </div>
      </section>

      <section class="config-section">
        <h2 class="h6 mb-3">Titolare e Contatti Privacy</h2>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Nome titolare</label>
              <Btn
                v-if="hasDefaultForField('ownerName')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('ownerName', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="ownerName" class="form-control" />
            <ErrorMessage name="ownerName" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Ragione sociale</label>
              <Btn
                v-if="hasDefaultForField('legalEntity')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('legalEntity', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="legalEntity" class="form-control" />
            <ErrorMessage name="legalEntity" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">P.IVA/C.F.</label>
              <Btn
                v-if="hasDefaultForField('vatOrTaxCode')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('vatOrTaxCode', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="vatOrTaxCode" class="form-control" />
            <ErrorMessage name="vatOrTaxCode" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Indirizzo sede</label>
              <Btn
                v-if="hasDefaultForField('officeAddress')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('officeAddress', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="officeAddress" class="form-control" />
            <ErrorMessage name="officeAddress" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Email privacy</label>
              <Btn
                v-if="hasDefaultForField('privacyEmail')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('privacyEmail', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="privacyEmail" class="form-control" />
            <ErrorMessage name="privacyEmail" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">PEC (opzionale)</label>
              <Btn
                v-if="hasDefaultForField('pec')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('pec', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="pec" class="form-control" />
            <ErrorMessage name="pec" class="text-danger small" />
          </div>
        </div>
      </section>

      <section class="config-section">
        <h2 class="h6 mb-3">AI e Banner Cookie</h2>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">AI Provider</label>
              <Btn
                v-if="hasDefaultForField('aiProvider')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('aiProvider', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="aiProvider" class="form-control" />
            <ErrorMessage name="aiProvider" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">AI Model</label>
              <Btn
                v-if="hasDefaultForField('aiModel')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('aiModel', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="aiModel" class="form-control" />
            <ErrorMessage name="aiModel" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Testo pulsante rifiuta</label>
              <Btn
                v-if="hasDefaultForField('cookieBannerRejectBtnText')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('cookieBannerRejectBtnText', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="cookieBannerRejectBtnText" class="form-control" />
            <ErrorMessage name="cookieBannerRejectBtnText" class="text-danger small" />
          </div>
          <div class="col-12 col-md-6">
            <div class="field-title-row">
              <label class="form-label mb-0">Testo pulsante accetta</label>
              <Btn
                v-if="hasDefaultForField('cookieBannerAcceptBtnText')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('cookieBannerAcceptBtnText', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <Field name="cookieBannerAcceptBtnText" class="form-control" />
            <ErrorMessage name="cookieBannerAcceptBtnText" class="text-danger small" />
          </div>
          <div class="col-12">
            <div class="field-title-row">
              <label class="form-label mb-0">Cookie consent key date</label>
              <Btn
                v-if="hasDefaultForField('cookieConsentKeyDate')"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault('cookieConsentKeyDate', setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <div class="d-flex flex-wrap gap-2 align-items-start">
              <Field name="cookieConsentKeyDate" class="form-control app-config-key-input" />
              <Btn
                type="button"
                color="warning"
                icon="warning"
                @click="confirmAndUpdateCookieConsentKeyDate(setFieldValue)"
              >
                Aggiorna data chiave cookie
              </Btn>
            </div>
            <small class="text-muted d-block mt-1">
              Chiave effettiva: {{ cookieConsentStorageKeyPreview(values.cookieConsentKeyDate) }}
            </small>
            <ErrorMessage name="cookieConsentKeyDate" class="text-danger small" />
          </div>
        </div>
      </section>

      <section class="config-section">
        <h2 class="h6 mb-3">Contenuti HTML</h2>
        <p class="text-muted small mb-3">
          I campi sotto usano FieldTiptap e salvano HTML completo.
        </p>

        <div class="vstack gap-4">
          <div v-for="section in htmlSectionFields" :key="section.key" class="html-section">
            <div class="field-title-row mb-2">
              <label class="form-label mb-0">{{ section.label }}</label>
              <Btn
                v-if="hasDefaultForField(section.key)"
                type="button"
                color="secondary"
                class="btn-sm"
                @click="resetFieldToDefault(section.key, setFieldValue)"
              >
                Default
              </Btn>
            </div>
            <FieldTiptap
              :name="section.key"
              :label="false"
              :required="true"
              :toolbar-sticky-on="'top'"
              :model-value="htmlValue(values, section.key)"
              @update:model-value="(value) => setFieldValue(section.key, value)"
            />
            <ErrorMessage :name="section.key" class="text-danger small" />

            <div class="mt-2">
              <h3 class="h6 mb-2">Preview</h3>
              <div class="compiled-preview" v-html="htmlValue(values, section.key)" />
            </div>
          </div>
        </div>
      </section>

      <Btn class="mt-3" type="submit" color="dark" icon="save" :loading="isSubmitting" :disabled="!canManage">
        Salva AppConfig
      </Btn>
    </Form>
  </div>
</template>

<style scoped>
.config-section {
  border-bottom: 1px solid #ececec;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.config-section:last-of-type {
  border-bottom: 0;
  margin-bottom: 0;
  padding-bottom: 0;
}

.html-section {
  padding: 0.75rem;
  border: 1px solid #ececec;
  border-radius: 0.5rem;
  background: #fff;
}

.field-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.app-config-key-input {
  min-width: 220px;
  flex: 1 1 220px;
}

.compiled-preview {
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  min-height: 5rem;
  padding: 0.75rem;
}

.legal-warning {
  margin: 0;
  padding: 0.55rem;
  border: 1px solid rgba(183, 111, 30, 0.42);
  border-radius: 2px;
  background: rgba(255, 245, 231, 0.8);
  color: #71420c;
  font-size: 0.8rem;
}
</style>
