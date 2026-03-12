<script setup lang="ts">
import { Btn, FieldPhoneNumber, _Auth, isPhoneNumberValid, toast, type PhoneNumber } from 'cic-kit'
import { computed, reactive, ref, watch } from 'vue'
import {
  DEFAULT_USER_COLOR,
  DEFAULT_PUBLIC_USER_KEYS,
  USER_COLOR_PALETTE,
  normalizePublicUserKeys,
  normalizeUserColor,
} from '../../constants/userProfile'

type ProfileForm = {
  name: string
  surname: string
  email: string
  phoneNumber: PhoneNumber
  color: string
}

const userColorPalette = [...USER_COLOR_PALETTE]
const publicUserKeysForSave = [...DEFAULT_PUBLIC_USER_KEYS]

const isSaving = ref(false)
const initialSnapshot = ref('')

const form = reactive<ProfileForm>({
  name: '',
  surname: '',
  email: '',
  phoneNumber: ['+39', ''],
  color: userColorPalette[0] ?? DEFAULT_USER_COLOR,
})

const errors = reactive({
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
  color: '',
})

function clearErrors() {
  errors.name = ''
  errors.surname = ''
  errors.email = ''
  errors.phoneNumber = ''
  errors.color = ''
}

function normalizePhoneNumber(phoneNumber?: PhoneNumber | null): PhoneNumber {
  const prefix = String(phoneNumber?.[0] ?? '+39').trim()
  const number = String(phoneNumber?.[1] ?? '').trim()
  return [prefix || '+39', number]
}

function currentSnapshot() {
  return JSON.stringify({
    name: form.name.trim(),
    surname: form.surname.trim(),
    email: form.email.trim().toLowerCase(),
    phoneNumber: [form.phoneNumber[0].trim(), form.phoneNumber[1].trim()],
    color: normalizeUserColor(form.color),
  })
}

function resetFromUser() {
  const user = _Auth?.user as { [key: string]: unknown } | undefined
  form.name = String(user?.name ?? '')
  form.surname = String(user?.surname ?? '')
  form.email = String(user?.email ?? '')
  form.phoneNumber = normalizePhoneNumber(user?.phoneNumber as PhoneNumber | undefined)
  form.color = normalizeUserColor(user?.color)
  initialSnapshot.value = currentSnapshot()
  clearErrors()
}

const nameTrimmed = computed(() => form.name.trim())
const surnameTrimmed = computed(() => form.surname.trim())
const emailTrimmed = computed(() => form.email.trim())
const phonePrefixTrimmed = computed(() => form.phoneNumber[0].trim())
const phoneNumberTrimmed = computed(() => form.phoneNumber[1].trim())
const hasPhoneValue = computed(() => phoneNumberTrimmed.value.length > 0)
const selectedColor = computed(() => normalizeUserColor(form.color))
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isAllowedColor(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return userColorPalette.some((color) => color.toLowerCase() === normalized)
}

const canSubmit = computed(() => {
  const phoneCandidate: PhoneNumber = [phonePrefixTrimmed.value || '+39', phoneNumberTrimmed.value]
  const phoneValid = hasPhoneValue.value ? isPhoneNumberValid(phoneCandidate) : true

  return (
    Boolean(nameTrimmed.value) &&
    Boolean(surnameTrimmed.value) &&
    emailRegex.test(emailTrimmed.value) &&
    phoneValid &&
    isAllowedColor(selectedColor.value) &&
    !isSaving.value &&
    currentSnapshot() !== initialSnapshot.value
  )
})

function validate() {
  clearErrors()
  let isValid = true

  if (!nameTrimmed.value) {
    errors.name = 'Nome obbligatorio'
    isValid = false
  }

  if (!surnameTrimmed.value) {
    errors.surname = 'Cognome obbligatorio'
    isValid = false
  }

  if (!emailRegex.test(emailTrimmed.value)) {
    errors.email = 'Email non valida'
    isValid = false
  }

  if (hasPhoneValue.value) {
    const phoneCandidate: PhoneNumber = [phonePrefixTrimmed.value || '+39', phoneNumberTrimmed.value]
    if (!isPhoneNumberValid(phoneCandidate)) {
      errors.phoneNumber = 'Numero di telefono non valido'
      isValid = false
    }
  }

  if (!isAllowedColor(selectedColor.value)) {
    errors.color = 'Seleziona un colore valido'
    isValid = false
  }

  return isValid
}

async function onSubmit() {
  if (!_Auth?.isLoggedIn || !_Auth.user) {
    toast.error('Devi essere loggato per modificare il profilo')
    return
  }

  if (!validate()) {
    return
  }

  const payload: {
    name: string
    surname: string
    email: string
    color: string
    publicKeys: string[]
    phoneNumber?: PhoneNumber
  } = {
    name: nameTrimmed.value,
    surname: surnameTrimmed.value,
    email: emailTrimmed.value,
    color: selectedColor.value,
    publicKeys: normalizePublicUserKeys(publicUserKeysForSave),
  }

  if (hasPhoneValue.value) {
    payload.phoneNumber = [phonePrefixTrimmed.value || '+39', phoneNumberTrimmed.value]
  }

  isSaving.value = true
  try {
    await _Auth.user.update(payload)
    initialSnapshot.value = currentSnapshot()
    toast.success('Profilo aggiornato')
  } catch (error) {
    console.error(error)
    toast.error('Errore durante l\'aggiornamento profilo')
  } finally {
    isSaving.value = false
  }
}

watch(
  () => _Auth?.user,
  () => {
    resetFromUser()
  },
  { immediate: true },
)
</script>

<template>
  <form class="custom-profile-form" @submit.prevent="onSubmit">
    <div class="row g-3">
      <div class="col-12 col-md-6">
        <label for="profile-name" class="form-label">Nome *</label>
        <input id="profile-name" v-model="form.name" type="text" class="form-control" autocomplete="given-name" />
        <small v-if="errors.name" class="text-danger d-block mt-1">{{ errors.name }}</small>
      </div>

      <div class="col-12 col-md-6">
        <label for="profile-surname" class="form-label">Cognome *</label>
        <input id="profile-surname" v-model="form.surname" type="text" class="form-control" autocomplete="family-name" />
        <small v-if="errors.surname" class="text-danger d-block mt-1">{{ errors.surname }}</small>
      </div>

      <div class="col-12">
        <label for="profile-email" class="form-label">Email *</label>
        <input id="profile-email" v-model="form.email" type="email" class="form-control" autocomplete="email" />
        <small v-if="errors.email" class="text-danger d-block mt-1">{{ errors.email }}</small>
      </div>

      <div class="col-12">
        <FieldPhoneNumber
          v-model="form.phoneNumber"
          name="profile-phone-number"
          label="Numero di telefono"
          placeholder-prefix="+39"
          placeholder="3331234567"
        />
        <small v-if="errors.phoneNumber" class="text-danger d-block mt-1">{{ errors.phoneNumber }}</small>
      </div>

      <div class="col-12">
        <label class="form-label d-block mb-2">Colore agenda operatore</label>
        <div class="profile-color-grid" role="radiogroup" aria-label="Colori agenda operatore">
          <button
            v-for="color in userColorPalette"
            :key="color"
            type="button"
            class="profile-color-chip"
            :class="{ 'profile-color-chip--active': selectedColor === color }"
            :aria-label="`Seleziona colore ${color}`"
            :aria-pressed="selectedColor === color"
            :style="{ '--chip-color': color }"
            @click="form.color = color"
          />
        </div>
        <small class="text-muted d-block mt-1">
          Il colore viene usato sugli appuntamenti in cui sei operatore principale.
        </small>
        <small v-if="errors.color" class="text-danger d-block mt-1">{{ errors.color }}</small>
      </div>

      <div class="col-12 d-flex justify-content-end">
        <Btn type="submit" color="primary" icon="save" :loading="isSaving" :disabled="!canSubmit">
          Salva modifiche
        </Btn>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.custom-profile-form :deep(.ck-phone) {
  margin-bottom: 0;
}

.custom-profile-form :deep(.ck-phone__label) {
  font-weight: 600;
}

.profile-color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.profile-color-chip {
  --chip-color: #e8b3be;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(61, 35, 44, 0.28);
  background: var(--chip-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
}

.profile-color-chip--active {
  transform: scale(1.04);
  box-shadow:
    0 0 0 2px rgba(61, 35, 44, 0.56),
    inset 0 0 0 1px rgba(255, 255, 255, 0.48);
}
</style>
