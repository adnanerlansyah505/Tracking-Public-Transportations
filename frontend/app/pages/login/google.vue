<script setup lang="ts">
const route = useRoute();
const auth = useAuthStore();
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    await auth.refreshSession();
    await navigateTo('/dashboard');
  } catch {
    auth.clearSession();
    error.value = 'Unable to validate the Google sign-in session.';
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <p v-if="!error" class="text-slate-600">Completing Google sign-in…</p>
    <div v-else class="space-y-4 text-center">
      <p class="text-red-600">{{ error }}</p>
      <UButton to="/">Return to sign in</UButton>
    </div>
  </div>
</template>
