<script setup lang="ts">
import { Btn, FieldPhoneNumber, _Auth, isPhoneNumberValid, toast, type PhoneNumber } from 'cic-kit'
import { computed, reactive, ref, watch } from 'vue'

type ProfileForm = {
  name: string
  surname: string
  email: string
  phoneNumber: PhoneNumber
}

const isSaving = ref(false)
const initialSnapshot = ref('')

const form = reactive<ProfileForm>({
  name: '',
  surname: '',
  email: '',
  phoneNumber: ['+39', ''],
})

const errors = reactive({
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
})

function clearErrors() {
  errors.name = ''
  errors.surname = ''
  errors.email = ''
  errors.phoneNumber = ''
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
  })
}

function resetFromUser() {
  const user = _Auth?.user
  form.name = user?.name ?? ''
  form.surname = user?.surname ?? ''
  form.email = user?.email ?? ''
  form.phoneNumber = normalizePhoneNumber(user?.phoneNumber)
  initialSnapshot.value = currentSnapshot()
  clearErrors()
}

const nameTrimmed = computed(() => form.name.trim())
const surnameTrimmed = computed(() => form.surname.trim())
const emailTrimmed = computed(() => form.email.trim())
const phonePrefixTrimmed = computed(() => form.phoneNumber[0].trim())
const phoneNumberTrimmed = computed(() => form.phoneNumber[1].trim())
const hasPhoneValue = computed(() => phoneNumberTrimmed.value.length > 0)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const canSubmit = computed(() => {
  const phoneCandidate: PhoneNumber = [phonePrefixTrimmed.value || '+39', phoneNumberTrimmed.value]
  const phoneValid = hasPhoneValue.value ? isPhoneNumberValid(phoneCandidate) : true

  return (
    Boolean(nameTrimmed.value) &&
    Boolean(surnameTrimmed.value) &&
    emailRegex.test(emailTrimmed.value) &&
    phoneValid &&
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
    phoneNumber?: PhoneNumber
  } = {
    name: nameTrimmed.value,
    surname: surnameTrimmed.value,
    email: emailTrimmed.value,
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
</style>
