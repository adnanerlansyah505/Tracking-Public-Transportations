<script setup lang="ts">
import { useApiError } from '~/composables/useApiError';

const location = useLocationStore();
const { sharing, busy, enable } = useLocationSharing();
const { message } = useApiError();

const error = ref('');
let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  error.value = '';

  try {
    await location.fetchPassengers();
  } catch (cause) {
    error.value = message(cause, 'Tidak dapat mencari penumpang saat ini.');
  }
}

// Distances can only be computed from the driver's own position, so the button
// turns into the opt-in rather than silently returning nothing.
function findPassengers() {
  if (!sharing.value) {
    enable();
    return;
  }

  refresh();
}

// Distances only exist once the driver is online, so re-ask when sharing starts
// instead of waiting for the next interval tick.
watch(sharing, (isSharing) => {
  if (isSharing) refresh();
});

onMounted(() => {
  refresh();

  // Passengers come and go, so keep the list warm while the card is visible.
  refreshTimer = setInterval(() => {
    location.fetchPassengers().catch(() => undefined);
  }, 30000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});

function requestedAgo(timestamp: number) {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} menit lalu`;

  return `${Math.round(minutes / 60)} jam lalu`;
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">
          Penumpang terdekat
        </h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Penumpang yang sedang mencari angkot di sekitar Anda (radius {{ location.passengersRadiusKm }} km).
        </p>
      </div>

      <UButton
        color="primary"
        :icon="sharing ? 'i-lucide-users' : 'i-lucide-map-pin'"
        :loading="location.loadingPassengers || busy"
        @click="findPassengers"
      >
        {{ sharing ? 'Cari penumpang' : 'Aktifkan lokasi' }}
      </UButton>
    </div>

    <p
      v-if="error"
      class="mt-3 text-xs text-rose-600"
    >
      {{ error }}
    </p>

    <p
      v-else-if="location.loadingPassengers && location.passengers.length === 0"
      class="mt-3 flex items-center gap-1.5 text-xs text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-3.5 w-3.5 animate-spin"
      />
      Mencari penumpang di sekitar…
    </p>

    <!-- The driver must be sharing before distances can be computed. -->
    <p
      v-else-if="!location.passengersSharing"
      class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
    >
      Tekan <strong>Aktifkan lokasi</strong> agar sistem dapat menghitung jarak penumpang yang sedang
      mencari angkot di sekitar Anda.
    </p>

    <p
      v-else-if="location.passengers.length === 0"
      class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
    >
      Belum ada penumpang yang mencari angkot dalam radius {{ location.passengersRadiusKm }} km.
      Anda akan menerima notifikasi begitu ada yang mencari di sekitar.
    </p>

    <ul
      v-else
      class="mt-3 divide-y divide-slate-100"
    >
      <li
        v-for="(passenger, index) in location.passengers"
        :key="`${passenger.requestedAt}-${index}`"
      >
        <!-- Selecting a row retargets the route map to that passenger. -->
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition"
          :class="location.targetPassenger?.requestedAt === passenger.requestedAt
            ? 'bg-amber-50 ring-1 ring-amber-200'
            : 'hover:bg-slate-50'"
          @click="location.selectPassenger(passenger.requestedAt)"
        >
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <span class="truncate">
                {{ index === 0 ? 'Penumpang terdekat' : `Penumpang ${index + 1}` }}
              </span>
              <!-- Visitors who search without signing in are still pick-up-able. -->
              <span
                v-if="passenger.anonymous"
                class="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
              >
                Tamu
              </span>
              <span
                v-if="location.targetPassenger?.requestedAt === passenger.requestedAt"
                class="shrink-0 text-[10px] font-normal text-amber-700"
              >
                · tujuan rute
              </span>
            </p>
            <p class="text-[11px] text-slate-500">
              Mulai mencari {{ requestedAgo(passenger.requestedAt) }}
            </p>
          </div>

          <DirectionPointer
            size="sm"
            :bearing="passenger.bearingDegrees"
            :distance-km="passenger.distanceKm"
          />
        </button>
      </li>
    </ul>
  </section>
</template>
