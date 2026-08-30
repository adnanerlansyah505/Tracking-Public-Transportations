```vue
<script setup lang="ts">
definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const toast = useToast();
const { message } = useApiError();

const step = ref(1);
const submitting = ref(false);
const error = ref('');

const form = reactive({
  fullName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  city: '',
  country: '',
  phone: '',
  birthDate: '',
  gender: '',
  identityCardNumber: '',
  vehiclePlateNumber: '',
  routeCode: '',
  vehicleManufactureYear: '',
  startRoute: '',
  endRoute: '',
  passengerCapacity: '',
});

const registrationDocument = ref<File | null>(null);
const operationPermit = ref<File | null>(null);
const vehiclePhoto = ref<File | null>(null);

function getUploadedFile(file: File | null | undefined): File | null {
  return file ?? null;
}

/**
 * Check whether all required personal information fields are filled.
 */
const isPersonalDetailsComplete = computed(() => {
  const requiredFields = [
    form.fullName,
    form.email,
    form.username,
    form.password,
    form.confirmPassword,
    form.city,
    form.country,
    form.phone,
    form.birthDate,
    form.gender,
    form.identityCardNumber,
  ];

  return requiredFields.every((value) => String(value).trim() !== '');
});

/**
 * Check whether personal information is actually valid.
 *
 * This uses the same business rules as validatePersonalDetails()
 * so the Continue button and the actual validation stay consistent.
 */
const isPersonalDetailsValid = computed(() => {
  if (!isPersonalDetailsComplete.value) {
    return false;
  }

  if (form.password.length < 8) {
    return false;
  }

  if (form.password !== form.confirmPassword) {
    return false;
  }

  return true;
});

/**
 * Step 2 is only available after Step 1 is completely valid.
 */
const canAccessVehicleStep = computed(() => {
  return isPersonalDetailsValid.value;
});

function validatePersonalDetails() {
  const requiredFields = [
    form.fullName,
    form.email,
    form.username,
    form.password,
    form.confirmPassword,
    form.city,
    form.country,
    form.phone,
    form.birthDate,
    form.gender,
    form.identityCardNumber,
  ];

  if (requiredFields.some((value) => !String(value).trim())) {
    return 'Please complete your personal information before continuing.';
  }

  if (form.password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (form.password !== form.confirmPassword) {
    return 'Password confirmation does not match.';
  }

  return '';
}

/**
 * Move from Step 1 to Step 2.
 */
function goToVehicleStep() {
  error.value = '';

  const validationError = validatePersonalDetails();

  if (validationError) {
    error.value = validationError;
    return;
  }

  step.value = 2;
}

/**
 * Navigate directly to a step.
 *
 * Step 2 cannot be accessed until Step 1 is valid.
 */
function goToStep(targetStep: number) {
  error.value = '';

  if (targetStep === 2 && !canAccessVehicleStep.value) {
    return;
  }

  step.value = targetStep;
}

function buildDriverPayload() {
  const payload = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    // UInput with type="number" can emit a number instead of a string.
    // Those fields are appended explicitly below after numeric validation.
    if (
      key === 'vehicleManufactureYear' ||
      key === 'passengerCapacity'
    ) {
      return;
    }

    if (typeof value !== 'string') {
      return;
    }

    const trimmed = value.trim();

    if (key === 'routeCode' && !trimmed) {
      return;
    }

    if (!trimmed) {
      return;
    }

    payload.append(key, trimmed);
  });

  payload.append(
    'vehicleManufactureYear',
    String(Number(form.vehicleManufactureYear)),
  );

  payload.append(
    'passengerCapacity',
    String(Number(form.passengerCapacity)),
  );

  const registrationDocFile = getUploadedFile(registrationDocument.value);
  const operationPermitFile = getUploadedFile(operationPermit.value);
  const vehiclePhotoFile = getUploadedFile(vehiclePhoto.value);

  if (
    !registrationDocFile ||
    !operationPermitFile ||
    !vehiclePhotoFile
  ) {
    throw new Error(
      'Please upload the vehicle registration, operational permit, and vehicle photo.',
    );
  }

  payload.append('registrationDocument', registrationDocFile);
  payload.append('operationPermit', operationPermitFile);
  payload.append('vehiclePhoto', vehiclePhotoFile);

  return payload;
}

async function submit() {
  error.value = '';
  submitting.value = true;

  const vehicleFields = [
    form.vehiclePlateNumber,
    form.vehicleManufactureYear,
    form.startRoute,
    form.endRoute,
    form.passengerCapacity,
  ];

  if (vehicleFields.some((value) => !String(value).trim())) {
    error.value = 'Please complete all required vehicle details.';
    submitting.value = false;
    return;
  }

  const manufactureYear = Number(form.vehicleManufactureYear);
  const passengerCapacity = Number(form.passengerCapacity);

  const maximumManufactureYear =
    new Date().getFullYear() + 1;

  if (
    !Number.isInteger(manufactureYear) ||
    manufactureYear < 1900 ||
    manufactureYear > maximumManufactureYear
  ) {
    error.value =
      `Year of manufacture must be a whole number between 1900 and ${maximumManufactureYear}.`;

    submitting.value = false;
    return;
  }

  if (
    !Number.isInteger(passengerCapacity) ||
    passengerCapacity < 1 ||
    passengerCapacity > 500
  ) {
    error.value =
      'Passenger capacity must be a whole number between 1 and 500.';

    submitting.value = false;
    return;
  }

  if (
    !getUploadedFile(registrationDocument.value) ||
    !getUploadedFile(operationPermit.value) ||
    !getUploadedFile(vehiclePhoto.value)
  ) {
    error.value =
      'Please upload the vehicle registration, operational permit, and vehicle photo.';

    submitting.value = false;
    return;
  }

  try {
    const payload = buildDriverPayload();

    await auth.registerDriver(payload);

    toast.add({
      title: 'Driver registration submitted',
      description:
        'Your account will be reviewed by an administrator before you can log in.',
      color: 'success',
    });

    await navigateTo('/login?driver-pending=1');
  } catch (cause) {
    error.value = message(
      cause,
      'We could not submit your driver registration.',
    );
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-page driver-page">
    <NuxtLink
      to="/login"
      class="driver-back-link"
    >
      ← Back to Login
    </NuxtLink>

    <UCard class="auth-card driver-card">
      <!-- ============================= -->
      <!-- STEP INDICATOR -->
      <!-- ============================= -->
      <div
        class="driver-stepper"
        aria-label="Driver registration steps"
      >
        <!-- STEP 1 -->
        <button
          class="driver-step"
          :class="step === 1 ? 'active' : ''"
          type="button"
          @click="goToStep(1)"
        >
          <span class="driver-step-number">
            1
          </span>

          <span class="driver-step-label">
            Personal
          </span>
        </button>

        <!-- STEP 2 -->
        <button
          class="driver-step"
          :class="step === 2 ? 'active' : ''"
          type="button"
          :disabled="!canAccessVehicleStep"
          :aria-disabled="!canAccessVehicleStep"
          @click="goToStep(2)"
        >
          <span class="driver-step-number">
            2
          </span>

          <span class="driver-step-label">
            Vehicle
          </span>
        </button>
      </div>

      <!-- ============================= -->
      <!-- STEP 1: PERSONAL INFORMATION -->
      <!-- ============================= -->
      <form
        v-if="step === 1"
        class="driver-form"
        @submit.prevent="goToVehicleStep"
      >
        <div class="driver-section-header">
          <h2>Personal Information</h2>

          <p>
            Use the details shown on your legal identification.
          </p>
        </div>

        <div class="driver-grid">
          <UFormField
            label="Full name"
            class="driver-field"
          >
            <UInput
              v-model="form.fullName"
              class="auth-input w-full"
              placeholder="e.g. Ahmad Suherman"
            />
          </UFormField>

          <UFormField
            label="Identity card number"
            class="driver-field"
          >
            <UInput
              v-model="form.identityCardNumber"
              class="auth-input w-full"
              placeholder="e.g. 1234567890"
            />
          </UFormField>

          <UFormField
            label="Email"
            class="driver-field"
          >
            <UInput
              v-model="form.email"
              class="auth-input w-full"
              type="email"
              placeholder="your@email.com"
              autocomplete="email"
            />
          </UFormField>

          <UFormField
            label="Username"
            class="driver-field"
          >
            <UInput
              v-model="form.username"
              class="auth-input w-full"
              placeholder="your username"
              autocomplete="username"
            />
          </UFormField>

          <UFormField
            label="Phone number"
            class="driver-field"
          >
            <UInput
              v-model="form.phone"
              class="auth-input w-full"
              type="tel"
              placeholder="+62 812 3456 7890"
            />
          </UFormField>

          <UFormField
            label="Birth date"
            class="driver-field"
          >
            <UInput
              v-model="form.birthDate"
              class="auth-input w-full"
              type="date"
            />
          </UFormField>

          <UFormField
            label="City"
            class="driver-field"
          >
            <UInput
              v-model="form.city"
              class="auth-input w-full"
              placeholder="Jakarta"
            />
          </UFormField>

          <UFormField
            label="Country"
            class="driver-field"
          >
            <UInput
              v-model="form.country"
              class="auth-input w-full"
              placeholder="Indonesia"
            />
          </UFormField>

          <UFormField
            label="Gender"
            class="driver-field"
          >
            <USelect
              v-model="form.gender"
              class="auth-input w-full"
              icon="i-lucide-mars"
              :items="[
                {
                  label: 'Male',
                  value: 'male',
                },
                {
                  label: 'Female',
                  value: 'female',
                },
              ]"
              placeholder="Select gender"
            />
          </UFormField>

          <UFormField
            label="Password"
            class="driver-field"
          >
            <UInput
              v-model="form.password"
              class="auth-input w-full"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
            />
          </UFormField>

          <UFormField
            label="Confirm password"
            class="driver-field driver-field--full"
          >
            <UInput
              v-model="form.confirmPassword"
              class="auth-input w-full"
              type="password"
              placeholder="Confirm password"
              autocomplete="new-password"
            />
          </UFormField>
        </div>

        <p
          v-if="error"
          class="auth-error"
        >
          {{ error }}
        </p>

        <!-- Continue -->
        <UButton
          class="driver-submit flex items-center justify-center"
          type="submit"
          :disabled="!isPersonalDetailsValid"
        >
          Continue to vehicle details →
        </UButton>
      </form>

      <!-- ============================= -->
      <!-- STEP 2: VEHICLE INFORMATION -->
      <!-- ============================= -->
      <form
        v-else
        class="driver-form"
        @submit.prevent="submit"
      >
        <div class="driver-section-header">
          <h2>Vehicle Information</h2>

          <p>
            Register the angkot you will be operating.
          </p>
        </div>

        <div class="driver-grid">
          <UFormField
            label="Vehicle plate number"
            class="driver-field"
          >
            <UInput
              v-model="form.vehiclePlateNumber"
              class="auth-input w-full"
              placeholder="E.G. D 1234 ABC"
            />
          </UFormField>

          <UFormField
            label="Angkot route code"
            class="driver-field"
          >
            <UInput
              v-model="form.routeCode"
              class="auth-input w-full"
              placeholder="e.g. 05, 08"
            />
          </UFormField>

          <UFormField
            label="Start route"
            class="driver-field"
          >
            <UInput
              v-model="form.startRoute"
              class="auth-input w-full"
              placeholder="Start route"
            />
          </UFormField>

          <UFormField
            label="End route"
            class="driver-field"
          >
            <UInput
              v-model="form.endRoute"
              class="auth-input w-full"
              placeholder="End route"
            />
          </UFormField>

          <UFormField
            label="Year of manufacture"
            class="driver-field"
          >
            <UInput
              v-model="form.vehicleManufactureYear"
              class="auth-input w-full"
              type="number"
              min="1900"
              placeholder="e.g. 2018"
            />
          </UFormField>

          <UFormField
            label="Passenger capacity"
            class="driver-field"
          >
            <UInput
              v-model="form.passengerCapacity"
              class="auth-input w-full"
              type="number"
              min="1"
              placeholder="e.g. 12"
            />
          </UFormField>

          <div class="driver-upload-boxes driver-field--full">
            <div class="driver-upload-box">
              <label>Vehicle Registration (STNK)</label>

              <UFileUpload
                v-model="registrationDocument"
                :max-files="1"
                accept="image/jpeg,image/png,image/webp,.pdf"
                icon="i-lucide-image"
                label="Drop your image here"
                description="PNG, JPG, PDF or GIF (max. 5mb)"
                class="driver-file-upload"
                :ui="{
                  base: 'bg-white text-black',
                }"
              />
            </div>

            <div class="driver-upload-box">
              <label>Operational Permit</label>

              <UFileUpload
                v-model="operationPermit"
                :max-files="1"
                accept="image/jpeg,image/png,image/webp,.pdf"
                icon="i-lucide-file-text"
                label="Drop your permit here"
                description="PNG, JPG, PDF or GIF (max. 5mb)"
                class="driver-file-upload"
                :ui="{
                  base: 'bg-white text-black',
                }"
              />
            </div>
          </div>

          <div class="driver-field driver-field--full">
            <label>Vehicle Photo</label>

            <UFileUpload
              v-model="vehiclePhoto"
              :max-files="1"
              accept="image/jpeg,image/png,image/webp"
              icon="i-lucide-camera"
              label="Upload vehicle photo"
              description="PNG, JPG or WEBP"
              class="driver-file-upload driver-file-upload--full"
              :ui="{
                base: 'bg-white text-black',
              }"
            />
          </div>
        </div>

        <p
          v-if="error"
          class="auth-error"
        >
          {{ error }}
        </p>

        <div class="driver-actions">
          <button
            class="driver-back-button"
            type="button"
            @click="goToStep(1)"
          >
            Back
          </button>

          <button
            class="driver-submit small"
            type="submit"
            :disabled="submitting"
          >
            {{ submitting ? 'Submitting...' : 'Complete Registration' }}
          </button>
        </div>
      </form>
    </UCard>
  </section>
</template>
```
