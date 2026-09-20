<script setup lang="ts">
definePageMeta({ layout: 'dashboard', roles: ['admin', 'driver', 'passenger'] });

const auth = useAuthStore();
const driversStore = useDriversStore();
const toast = useToast();
const { message } = useApiError();

const role = computed(() => auth.user?.role ?? 'passenger');
const profile = computed(() => auth.user?.profile ?? null);
const driverDetails = computed(() => auth.user?.driverDetails ?? null);

const isDriver = computed(() => role.value === 'driver');

const displayName = computed(
  () => profile.value?.fullName || auth.user?.username || auth.user?.email || 'User',
);

const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0)).join('').toUpperCase() || 'U';
});

const roleLabel = computed(() => role.value.charAt(0).toUpperCase() + role.value.slice(1));

const ROLE_BADGE: Record<string, 'primary' | 'secondary' | 'neutral'> = {
  admin: 'primary',
  driver: 'secondary',
  passenger: 'neutral',
};

const ROLE_SUMMARY: Record<string, string> = {
  admin: 'Full access to routes, route requests and driver accounts.',
  driver: 'Vehicle and operation changes are submitted for admin review before they apply.',
  passenger: 'Browse approved routes and track live angkot vehicles across Bandung.',
};

const GENDER_ITEMS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

// --- Personal information --------------------------------------------------

const form = reactive({
  fullName: '',
  city: '',
  country: '',
  phone: '',
  birthDate: '',
  gender: '',
  address: '',
  bio: '',
});

const photoFile = ref<File | null>(null);
const saving = ref(false);
const error = ref('');

function syncForm() {
  const value = profile.value;
  form.fullName = value?.fullName ?? '';
  form.city = value?.city ?? '';
  form.country = value?.country ?? '';
  form.phone = value?.phone ?? '';
  form.birthDate = value?.birthDate ? value.birthDate.slice(0, 10) : '';
  form.gender = value?.gender ?? '';
  form.address = value?.address ?? '';
  form.bio = value?.bio ?? '';
}

// --- Vehicle change request ------------------------------------------------

const vehicleFormOpen = ref(false);
const submittingVehicle = ref(false);
const vehicleError = ref('');

const vehicleDocument = ref<File | null>(null);
const vehiclePermit = ref<File | null>(null);
const vehiclePhoto = ref<File | null>(null);

const vehicleForm = reactive({
  identityCardNumber: '',
  vehiclePlateNumber: '',
  routeCode: '',
  vehicleManufactureYear: '',
  startRoute: '',
  endRoute: '',
  passengerCapacity: '',
});

const pendingRequest = computed(
  () => driversStore.myRequests.find((request) => request.status === 'pending') ?? null,
);

const rejectedRequest = computed(
  () => driversStore.myRequests.find((request) => request.status === 'rejected') ?? null,
);

function syncVehicleForm() {
  const value = driverDetails.value;
  vehicleForm.identityCardNumber = value?.identityCardNumber ?? '';
  vehicleForm.vehiclePlateNumber = value?.vehiclePlateNumber ?? '';
  vehicleForm.routeCode = value?.routeCode ?? '';
  vehicleForm.vehicleManufactureYear = value?.vehicleManufactureYear ? String(value.vehicleManufactureYear) : '';
  vehicleForm.startRoute = value?.startRoute ?? '';
  vehicleForm.endRoute = value?.endRoute ?? '';
  vehicleForm.passengerCapacity = value?.passengerCapacity ? String(value.passengerCapacity) : '';
}

function openVehicleForm() {
  vehicleError.value = '';
  syncVehicleForm();
  vehicleFormOpen.value = true;
}

onMounted(async () => {
  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      // The route middleware owns redirecting expired sessions.
    }
  }

  syncForm();
  syncVehicleForm();

  if (isDriver.value) {
    try {
      await driversStore.fetchMyRequests();
    } catch {
      // A missing history shouldn't block the page.
    }
  }
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

async function save() {
  error.value = '';

  if (!form.fullName.trim()) {
    error.value = 'Full name is required.';
    return;
  }

  if (!form.city.trim()) {
    error.value = 'City is required.';
    return;
  }

  saving.value = true;

  try {
    await auth.updateProfile(
      {
        fullName: form.fullName.trim(),
        city: form.city.trim(),
        ...(form.country.trim() ? { country: form.country.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.birthDate ? { birthDate: form.birthDate } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
      },
      photoFile.value,
    );

    photoFile.value = null;
    toast.add({ title: 'Profile updated', description: 'Your changes have been saved.', color: 'success' });
  } catch (cause) {
    error.value = message(cause, 'We could not save your profile.');
  } finally {
    saving.value = false;
  }
}

async function submitVehicle() {
  vehicleError.value = '';

  const required: Array<[string | number, string]> = [
    [vehicleForm.identityCardNumber, 'Identity card number'],
    [vehicleForm.vehiclePlateNumber, 'Vehicle plate number'],
    [vehicleForm.startRoute, 'Start route'],
    [vehicleForm.endRoute, 'End route'],
  ];

  for (const [value, label] of required) {
    if (!String(value).trim()) {
      vehicleError.value = `${label} is required.`;
      return;
    }
  }

  const year = Number(vehicleForm.vehicleManufactureYear);
  const maximumYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1900 || year > maximumYear) {
    vehicleError.value = `Year of manufacture must be a whole number between 1900 and ${maximumYear}.`;
    return;
  }

  const capacity = Number(vehicleForm.passengerCapacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    vehicleError.value = 'Passenger capacity must be a whole number between 1 and 500.';
    return;
  }

  submittingVehicle.value = true;

  try {
    await driversStore.submitVehicleRequest(
      {
        identityCardNumber: vehicleForm.identityCardNumber.trim(),
        vehiclePlateNumber: vehicleForm.vehiclePlateNumber.trim(),
        routeCode: vehicleForm.routeCode.trim(),
        vehicleManufactureYear: year,
        startRoute: vehicleForm.startRoute.trim(),
        endRoute: vehicleForm.endRoute.trim(),
        passengerCapacity: capacity,
      },
      {
        registrationDocument: vehicleDocument.value,
        operationPermit: vehiclePermit.value,
        vehiclePhoto: vehiclePhoto.value,
      },
    );

    vehicleDocument.value = null;
    vehiclePermit.value = null;
    vehiclePhoto.value = null;
    vehicleFormOpen.value = false;

    toast.add({
      title: 'Update submitted',
      description: 'An administrator will review your vehicle information.',
      color: 'success',
    });
  } catch (cause) {
    vehicleError.value = message(cause, 'We could not submit your vehicle update.');
  } finally {
    submittingVehicle.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <p class="text-sm font-medium text-[#123d8d]">Account</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Profile
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Manage your personal details and review your account information.
      </p>
    </div>

    <!-- Identity -->
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <img
            v-if="profile?.photo"
            :src="profile.photo"
            :alt="displayName"
            class="h-full w-full object-cover"
          >
          <span
            v-else
            class="text-lg font-semibold text-slate-500"
          >
            {{ initials }}
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900">
              {{ displayName }}
            </h2>
            <UBadge
              :color="ROLE_BADGE[role] ?? 'neutral'"
              variant="subtle"
            >
              {{ roleLabel }}
            </UBadge>
          </div>

          <p class="mt-0.5 truncate text-sm text-slate-500">
            {{ auth.user?.email }}
          </p>

          <p class="mt-2 text-xs text-slate-500">
            {{ ROLE_SUMMARY[role] }}
          </p>
        </div>
      </div>
    </section>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="error"
    />

    <div class="grid gap-5 lg:grid-cols-3">
      <!-- Personal information -->
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 class="text-sm font-semibold text-slate-900">
          Personal information
        </h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Fields left blank keep their current value.
        </p>

        <form
          class="mt-4 space-y-4"
          @submit.prevent="save"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="Full name"
              class="sm:col-span-2"
            >
              <UInput
                v-model="form.fullName"
                class="w-full"
                placeholder="e.g. Ahmad Suherman"
              />
            </UFormField>

            <UFormField label="Birth date">
              <UInput
                v-model="form.birthDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Gender">
              <USelect
                v-model="form.gender"
                :items="GENDER_ITEMS"
                placeholder="Select gender"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Phone number">
              <UInput
                v-model="form.phone"
                type="tel"
                class="w-full"
                placeholder="+62 812 3456 7890"
              />
            </UFormField>

            <UFormField label="City">
              <UInput
                v-model="form.city"
                class="w-full"
                placeholder="Bandung"
              />
            </UFormField>

            <UFormField
              label="Country"
              class="sm:col-span-2"
            >
              <UInput
                v-model="form.country"
                class="w-full"
                placeholder="Indonesia"
              />
            </UFormField>

            <UFormField
              label="Address"
              class="sm:col-span-2"
            >
              <UInput
                v-model="form.address"
                class="w-full"
                placeholder="Street, district, postal code"
              />
            </UFormField>

            <UFormField
              label="Bio"
              class="sm:col-span-2"
            >
              <UTextarea
                v-model="form.bio"
                :rows="3"
                class="w-full"
                placeholder="A short note about you"
              />
            </UFormField>

            <UFormField
              label="Profile photo"
              class="sm:col-span-2"
            >
              <UFileUpload
                v-model="photoFile"
                :max-files="1"
                accept="image/png,image/jpeg,image/webp"
                icon="i-lucide-camera"
                label="Drop a photo here"
                description="PNG, JPG or WEBP (max. 5 MB)"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex justify-end">
            <UButton
              type="submit"
              color="primary"
              icon="i-lucide-check"
              :loading="saving"
            >
              Save changes
            </UButton>
          </div>
        </form>
      </section>

      <!-- Right column: account + role sections -->
      <div class="space-y-5">
        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-sm font-semibold text-slate-900">
            Account
          </h2>

          <dl class="mt-4 space-y-3">
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Email
              </dt>
              <dd class="mt-0.5 break-all text-sm font-medium text-slate-800">
                {{ auth.user?.email || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Username
              </dt>
              <dd class="mt-0.5 text-sm font-medium text-slate-800">
                {{ auth.user?.username || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Role
              </dt>
              <dd class="mt-0.5 text-sm font-medium text-slate-800">
                {{ roleLabel }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Status
              </dt>
              <dd class="mt-0.5 text-sm font-medium capitalize text-slate-800">
                {{ auth.user?.status || '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Email verified
              </dt>
              <dd class="mt-0.5 text-sm font-medium text-slate-800">
                {{ auth.user?.emailVerifiedAt ? formatDate(auth.user.emailVerifiedAt) : 'Not verified' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500">
                Member since
              </dt>
              <dd class="mt-0.5 text-sm font-medium text-slate-800">
                {{ formatDate(auth.user?.createdAt) }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Passenger: quick link -->
        <section
          v-if="role === 'passenger'"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 class="text-sm font-semibold text-slate-900">
            Traveler
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            Find an angkot, check the fare, and follow it live on the map.
          </p>
          <UButton
            to="/dashboard/routes"
            color="primary"
            variant="soft"
            icon="i-lucide-map"
            class="mt-3"
          >
            Browse routes
          </UButton>
        </section>

        <!-- Admin: privileges -->
        <section
          v-else-if="role === 'admin'"
          class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 class="text-sm font-semibold text-slate-900">
            Administrator
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            You can publish routes, review driver requests, and manage accounts across the network.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UButton
              to="/dashboard/routes"
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-map"
            >
              Routes
            </UButton>
            <UButton
              to="/dashboard/driver-requests"
              color="neutral"
              variant="soft"
              size="xs"
              icon="i-lucide-steering-wheel"
            >
              Driver requests
            </UButton>
          </div>
        </section>
      </div>
    </div>

    <!-- Driver: vehicle & operation (full width) -->
    <section
      v-if="isDriver"
      class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">
            Vehicle &amp; operation
          </h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Changes are reviewed by an administrator before they take effect.
          </p>
        </div>

        <UButton
          v-if="!vehicleFormOpen && !pendingRequest"
          color="primary"
          variant="soft"
          icon="i-lucide-pencil"
          @click="openVehicleForm"
        >
          {{ driverDetails ? 'Request an update' : 'Add vehicle information' }}
        </UButton>
      </div>

      <UAlert
        v-if="!driverDetails"
        class="mt-4"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Vehicle information required"
        description="Add your vehicle and operation details so passengers and administrators can see them."
      />

      <UAlert
        v-if="pendingRequest"
        class="mt-4"
        color="info"
        variant="subtle"
        icon="i-lucide-clock"
        title="Update awaiting review"
        :description="`Submitted ${formatDate(pendingRequest.createdAt)}. An administrator will review it shortly.`"
      />

      <UAlert
        v-else-if="rejectedRequest"
        class="mt-4"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-x"
        title="Last update was rejected"
        :description="rejectedRequest.rejectionReason || 'No reason was provided.'"
      />

      <!-- Current details -->
      <dl
        v-if="driverDetails"
        class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Vehicle plate number
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.vehiclePlateNumber }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Identity card number
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.identityCardNumber }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Assigned route code
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.routeCode || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Corridor
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.startRoute }} → {{ driverDetails.endRoute }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Passenger capacity
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.passengerCapacity }} passengers
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-slate-500">
            Manufacture year
          </dt>
          <dd class="mt-0.5 text-sm font-medium text-slate-800">
            {{ driverDetails.vehicleManufactureYear }}
          </dd>
        </div>
      </dl>

      <!-- Request form -->
      <form
        v-if="vehicleFormOpen"
        class="mt-5 space-y-4 border-t border-slate-100 pt-5"
        @submit.prevent="submitVehicle"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Vehicle plate number">
            <UInput
              v-model="vehicleForm.vehiclePlateNumber"
              class="w-full"
              placeholder="e.g. D 1234 ABC"
            />
          </UFormField>

          <UFormField label="Identity card number">
            <UInput
              v-model="vehicleForm.identityCardNumber"
              class="w-full"
              placeholder="e.g. 3273010101920001"
            />
          </UFormField>

          <UFormField label="Route code">
            <UInput
              v-model="vehicleForm.routeCode"
              class="w-full"
              placeholder="e.g. 05, 08"
            />
          </UFormField>

          <UFormField label="Manufacture year">
            <UInput
              v-model="vehicleForm.vehicleManufactureYear"
              type="number"
              min="1900"
              class="w-full"
              placeholder="e.g. 2018"
            />
          </UFormField>

          <UFormField label="Start route">
            <UInput
              v-model="vehicleForm.startRoute"
              class="w-full"
              placeholder="e.g. Terminal Cicaheum"
            />
          </UFormField>

          <UFormField label="End route">
            <UInput
              v-model="vehicleForm.endRoute"
              class="w-full"
              placeholder="e.g. Terminal Ledeng"
            />
          </UFormField>

          <UFormField label="Passenger capacity">
            <UInput
              v-model="vehicleForm.passengerCapacity"
              type="number"
              min="1"
              class="w-full"
              placeholder="e.g. 12"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="Registration (STNK)">
            <UFileUpload
              v-model="vehicleDocument"
              :max-files="1"
              accept="image/png,image/jpeg,image/webp,.pdf"
              icon="i-lucide-file-text"
              label="Upload STNK"
              description="PDF, PNG, JPG or WEBP"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Operational permit">
            <UFileUpload
              v-model="vehiclePermit"
              :max-files="1"
              accept="image/png,image/jpeg,image/webp,.pdf"
              icon="i-lucide-file-text"
              label="Upload permit"
              description="PDF, PNG, JPG or WEBP"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Vehicle photo">
            <UFileUpload
              v-model="vehiclePhoto"
              :max-files="1"
              accept="image/png,image/jpeg,image/webp"
              icon="i-lucide-camera"
              label="Upload photo"
              description="PNG, JPG or WEBP"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="vehicleError"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="vehicleError"
        />

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            @click="vehicleFormOpen = false"
            :ui="{
              base: 'text-black'
            }"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-send"
            :loading="submittingVehicle"
          >
            Submit for review
          </UButton>
        </div>
      </form>
    </section>
  </div>
</template>
