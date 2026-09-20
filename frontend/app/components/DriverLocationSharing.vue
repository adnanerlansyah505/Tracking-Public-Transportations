<script setup lang="ts">
const auth = useAuthStore();
const { enabled, sharing, busy, error, enable, disable } = useLocationSharing();

const promptOpen = ref(false);

const isDriver = computed(() => auth.user?.role === 'driver');

onMounted(() => {
  // Ask on the driver's first visit unless they already opted in.
  if (isDriver.value && !enabled.value) {
    promptOpen.value = true;
  }
});

function activate() {
  promptOpen.value = false;
  enable();
}
</script>

<template>
  <template v-if="isDriver">
    <button
      type="button"
      class="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
      :class="sharing
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'"
      :title="sharing ? 'Berhenti membagikan lokasi' : 'Mulai membagikan lokasi'"
      @click="sharing ? disable() : enable()"
    >
      <span
        class="h-1.5 w-1.5 rounded-full"
        :class="sharing ? 'bg-emerald-500' : 'bg-slate-400'"
      />
      <span class="hidden sm:inline">{{ sharing ? 'Lokasi aktif' : 'Lokasi mati' }}</span>
      <UIcon
        :name="sharing ? 'i-lucide-radio-tower' : 'i-lucide-radio'"
        class="h-3.5 w-3.5"
      />
    </button>

    <UModal
      v-model:open="promptOpen"
      title="Bagikan lokasi Anda?"
      description="Penumpang hanya dapat melacak angkot yang membagikan lokasi."
      :ui="{ content: 'max-w-md bg-white!', header: 'bg-white!', body: 'bg-white!', footer: 'bg-white!', title: 'text-slate-900', description: 'mt-2 text-slate-500', close: 'text-black hover:bg-black hover:text-white' }"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Aktifkan berbagi lokasi agar penumpang dapat melihat posisi angkot Anda di peta, dan agar Anda
          menerima notifikasi penumpang yang mencari angkot di sekitar Anda.
        </p>
        <p class="mt-2 text-xs text-slate-500">
          Lokasi hanya dikirim selama Anda masuk dan dapat Anda hentikan kapan saja.
        </p>

        <p
          v-if="error"
          class="mt-3 text-xs text-rose-600"
        >
          {{ error }}
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="promptOpen = false"
          >
            Nanti
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-map-pin"
            :loading="busy"
            @click="activate"
          >
            Aktifkan
          </UButton>
        </div>
      </template>
    </UModal>
  </template>
</template>
