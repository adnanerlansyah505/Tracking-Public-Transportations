import { defineStore } from 'pinia';

export interface VehicleRequestPayload {
  identityCardNumber: string;
  vehiclePlateNumber: string;
  routeCode: string;
  vehicleManufactureYear: number;
  startRoute: string;
  endRoute: string;
  passengerCapacity: number;
}

export interface VehicleRequestFiles {
  registrationDocument?: File | null;
  operationPermit?: File | null;
  vehiclePhoto?: File | null;
}

export type DriverRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DriverVehicleRequest {
  id: string;
  driverId: string;
  payload: VehicleRequestPayload & {
    registrationDocument?: string | null;
    operationPermit?: string | null;
    vehiclePhoto?: string | null;
  };
  status: DriverRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverRequestListItem {
  request: DriverVehicleRequest;
  driver: { id: string; email: string; username?: string | null; status?: string } | null;
  profile: { fullName?: string | null; phone?: string | null; city?: string | null; photo?: string | null } | null;
}

interface ApiResponse<T> {
  status: boolean;
  data: T;
  message?: string;
}

export const useDriversStore = defineStore('drivers', () => {
  const myRequests = ref<DriverVehicleRequest[]>([]);
  const requests = ref<DriverRequestListItem[]>([]);
  const loading = ref(false);

  async function submitVehicleRequest(
    payload: VehicleRequestPayload,
    files?: VehicleRequestFiles,
  ) {
    const { $api } = useNuxtApp();
    const form = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    }

    if (files?.registrationDocument) form.append('registrationDocument', files.registrationDocument);
    if (files?.operationPermit) form.append('operationPermit', files.operationPermit);
    if (files?.vehiclePhoto) form.append('vehiclePhoto', files.vehiclePhoto);

    const response = await $api<ApiResponse<DriverVehicleRequest>>('/drivers/me/requests', {
      method: 'POST',
      body: form,
    });

    myRequests.value = [response.data, ...myRequests.value];
    return response.data;
  }

  async function fetchMyRequests() {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<DriverVehicleRequest[]>>('/drivers/me/requests');
    myRequests.value = Array.isArray(response.data) ? response.data : [];
    return myRequests.value;
  }

  async function fetchRequests(status: DriverRequestStatus = 'pending') {
    const { $api } = useNuxtApp();
    loading.value = true;
    try {
      const response = await $api<ApiResponse<DriverRequestListItem[]>>('/drivers/requests', {
        query: { status },
      });
      requests.value = Array.isArray(response.data) ? response.data : [];
      return requests.value;
    } finally {
      loading.value = false;
    }
  }

  async function approveRequest(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<DriverVehicleRequest>>(`/drivers/requests/${id}/approve`, {
      method: 'PATCH',
    });
    requests.value = requests.value.filter((item) => item.request.id !== id);
    return response.data;
  }

  async function rejectRequest(id: string, reason: string) {
    const { $api } = useNuxtApp();
    const response = await $api<ApiResponse<DriverVehicleRequest>>(`/drivers/requests/${id}/reject`, {
      method: 'PATCH',
      body: { reason },
    });
    requests.value = requests.value.filter((item) => item.request.id !== id);
    return response.data;
  }

  return {
    myRequests,
    requests,
    loading,
    submitVehicleRequest,
    fetchMyRequests,
    fetchRequests,
    approveRequest,
    rejectRequest,
  };
});
