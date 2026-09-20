<script setup lang="ts">
import type { DriverRequestListItem } from '~/stores/drivers';

definePageMeta({ layout: 'dashboard', roles: ['admin'] });

const driversStore = useDriversStore();
const { message } = useApiError();
const toast = useToast();

const loading = ref(true);
const error = ref('');
const actingId = ref<string | null>(null);

const requests = computed(() => driversStore.requests);

async function load() {
  loading.value = true;
  error.value = '';

  try {
    await driversStore.fetchRequests('pending');
  } catch (cause) {
    error.value = message(cause, 'We could not load driver requests.');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function whatsappLink(phone?: string | null, name?: string | null) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;

  const text = encodeURIComponent(
    `Hello${name ? ` ${name}` : ''}, this is AngkotTracker about your vehicle information update.`,
  );

  return `https://wa.me/${digits}?text=${text}`;
}

async function approve(item: DriverRequestListItem) {
  actingId.value = item.request.id;

  try {
    await driversStore.approveRequest(item.request.id);
    toast.add({
      title: 'Request approved',
      description: 'The driver’s vehicle information was updated.',
      color: 'success',
    });
  } catch (cause) {
    toast.add({
      title: 'Approval failed',
      description: message(cause, 'We could not approve this request.'),
      color: 'error',
    });
  } finally {
    actingId.value = null;
  }
}

const rejectOpen = ref(false);
const rejectTarget = ref<DriverRequestListItem | null>(null);
const rejectReason = ref('');

function openReject(item: DriverRequestListItem) {
  rejectTarget.value = item;
  rejectReason.value = '';
  rejectOpen.value = true;
}

async function reject() {
  const item = rejectTarget.value;
  if (!item) return;

  if (!rejectReason.value.trim()) {
    toast.add({ title: 'Add a reason', description: 'Explain why the request is rejected.', color: 'warning' });
    return;
  }

  actingId.value = item.request.id;

  try {
    await driversStore.rejectRequest(item.request.id, rejectReason.value.trim());
    toast.add({
      title: 'Request rejected',
      description: 'The driver can submit a corrected update.',
      color: 'success',
    });
    rejectOpen.value = false;
  } catch (cause) {
    toast.add({
      title: 'Rejection failed',
      description: message(cause, 'We could not reject this request.'),
      color: 'error',
    });
  } finally {
    actingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-medium text-[#123d8d]">Review</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Driver requests
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Vehicle and operation updates submitted by drivers. Approving applies the change to their profile.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <div
      v-if="loading"
      class="flex items-center gap-2 text-sm text-slate-500"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-4 w-4 animate-spin"
      />
      Loading requests…
    </div>

    <template v-else>
      <p
        v-if="requests.length === 0"
        class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm"
      >
        No pending driver requests. Vehicle updates will appear here for review.
      </p>

      <article
        v-for="item in requests"
        :key="item.request.id"
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold text-slate-900">
                {{ item.profile?.fullName || item.driver?.username || 'Driver' }}
              </h2>
              <RouteStatusBadge :status="item.request.status" />
            </div>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ item.driver?.email || '—' }}
              <span class="text-slate-300"> · </span>
              {{ item.profile?.phone || 'No phone on file' }}
            </p>
          </div>

          <p class="text-xs text-slate-400">
            Submitted {{ formatDate(item.request.createdAt) }}
          </p>
        </div>

        <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Proposed plate number
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.vehiclePlateNumber }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Identity card number
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.identityCardNumber }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Route code
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.routeCode || '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Corridor
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.startRoute }} → {{ item.request.payload.endRoute }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Passenger capacity
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.passengerCapacity }} passengers
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-slate-500">
              Manufacture year
            </dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800">
              {{ item.request.payload.vehicleManufactureYear }}
            </dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <UButton
            v-if="item.profile?.phone"
            :to="whatsappLink(item.profile?.phone, item.profile?.fullName) || undefined"
            target="_blank"
            rel="noopener"
            color="success"
            variant="soft"
            icon="i-lucide-message-circle"
          >
            WhatsApp
          </UButton>

          <UButton
            color="success"
            icon="i-lucide-check"
            :loading="actingId === item.request.id"
            @click="approve(item)"
          >
            Approve
          </UButton>

          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-x"
            :disabled="actingId === item.request.id"
            @click="openReject(item)"
          >
            Reject
          </UButton>
        </div>
      </article>
    </template>

    <UModal
      v-model:open="rejectOpen"
      title="Reject vehicle request"
    >
      <template #body>
        <p class="text-sm text-slate-600">
          Rejecting the update from
          <strong>{{ rejectTarget?.profile?.fullName || rejectTarget?.driver?.email || 'this driver' }}</strong>.
          The driver will see your reason and can submit a corrected version.
        </p>
        <UTextarea
          v-model="rejectReason"
          class="mt-3 w-full"
          :rows="3"
          placeholder="e.g. The plate number does not match the attached registration."
        />
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="rejectOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="actingId === rejectTarget?.request.id"
            @click="reject"
          >
            Reject request
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
