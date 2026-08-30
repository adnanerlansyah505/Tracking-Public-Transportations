<script setup lang="ts">
definePageMeta({ layout: 'auth' });

const auth = useAuthStore();
const toast = useToast();
const { message } = useApiError();
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
});

function validatePassengerForm() {
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
  ];

  if (requiredFields.some((value) => !String(value).trim())) {
    return 'Please complete all required passenger profile fields.';
  }

  if (form.password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (form.password !== form.confirmPassword) {
    return 'Password confirmation does not match.';
  }

  return '';
}

async function submit() {
  error.value = '';

  const validationError = validatePassengerForm();
  if (validationError) {
    error.value = validationError;
    return;
  }

  submitting.value = true;
  try {
    await auth.registerPassenger({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      city: form.city.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
      birthDate: form.birthDate,
      gender: form.gender,
    });

    toast.add({
      title: 'Registration successful',
      description: 'Your passenger account was created. Check your email to verify your account.',
      color: 'success',
    });
    await navigateTo('/login');
  } catch (cause) {
    error.value = message(cause, 'We could not create your passenger account.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="auth-page auth-register-card">
    <div class="auth-brand">
      <img class="auth-brand__icon" src="@/assets/images/logo-white.png"></img>
      <h1 class="auth-brand__title">AngkotTracker</h1>
      <p class="auth-brand__subtitle">Precision transit management system</p>
    </div>

    <UCard class="auth-card passenger-card">
      <form class="auth-register-form" @submit.prevent="submit">
        <div class="passenger-header auth-field--full">
          <h2>Create passenger account</h2>
          <p>Join AngkotTracker to manage your journeys.</p>
        </div>

        <UFormField label="Full name" class="auth-field"><UInput v-model="form.fullName" class="auth-input w-full" /></UFormField>
        <UFormField label="Username" class="auth-field"><UInput v-model="form.username" class="auth-input w-full" autocomplete="username" /></UFormField>
        <UFormField label="Email" class="auth-field"><UInput v-model="form.email" class="auth-input w-full" type="email" autocomplete="email" /></UFormField>
        <UFormField label="Phone number" class="auth-field"><UInput v-model="form.phone" class="auth-input w-full" placeholder="+62 812 3456 7890" /></UFormField>
        <UFormField label="City" class="auth-field"><UInput v-model="form.city" class="auth-input w-full" /></UFormField>
        <UFormField label="Country" class="auth-field"><UInput v-model="form.country" class="auth-input w-full" /></UFormField>
        <UFormField label="Birth date" class="auth-field"><UInput v-model="form.birthDate" class="auth-input w-full" type="date" /></UFormField>
        <UFormField label="Gender" class="auth-field"><USelect v-model="form.gender" icon="i-lucide-mars" class="auth-input w-full" :items="[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]" placeholder="Select gender" /></UFormField>
        <UFormField label="Password" class="auth-field"><UInput v-model="form.password" class="auth-input w-full" type="password" autocomplete="new-password" /></UFormField>
        <UFormField label="Confirm password" class="auth-field"><UInput v-model="form.confirmPassword" class="auth-input w-full" type="password" autocomplete="new-password" /></UFormField>

        <p v-if="error" class="auth-error auth-field--full">{{ error }}</p>
        <UButton class="auth-submit auth-field--full" type="submit" :loading="submitting">Create passenger account</UButton>
      </form>

      <p class="auth-footer-text">Already registered? <NuxtLink to="/login">Sign in</NuxtLink></p>
    </UCard>
  </section>
</template>
