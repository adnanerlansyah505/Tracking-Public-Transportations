<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import {
  BANDUNG_CENTER,
  buildSimulatedVehicles,
  interpolatePositionAlongPath,
  type TransitRoute,
  type AngkotVehicle,
} from '~/data/transitData';

const props = withDefaults(
  defineProps<{
    selectedVehicleId?: string | null;
    activeRouteId?: string | null;
    isSimulating?: boolean;
    mapHeight?: string;
    routes?: TransitRoute[];
    /** When provided, these positions are rendered as-is instead of simulating. */
    vehicles?: AngkotVehicle[];
  }>(),
  {
    selectedVehicleId: null,
    activeRouteId: null,
    isSimulating: true,
    mapHeight: '560px',
    routes: () => [],
  }
);

const emit = defineEmits<{
  (e: 'select-vehicle', vehicle: AngkotVehicle | null): void;
  (e: 'select-route', route: TransitRoute | null): void;
  (e: 'update:vehicles', vehicles: AngkotVehicle[]): void;
}>();

const config = useRuntimeConfig();
const mapContainer = ref<HTMLDivElement | null>(null);
const mapInstance = shallowRef<mapboxgl.Map | null>(null);
const mapLoaded = ref(false);
const tokenError = ref(false);
const customToken = ref('');
const isTokenModalOpen = ref(false);
const currentStyle = ref('mapbox://styles/mapbox/streets-v12');
const isSimulatingActive = ref(props.isSimulating);
let simulationTimer: ReturnType<typeof setInterval> | null = null;

const vehicles = ref<AngkotVehicle[]>([]);

/** Live mode draws the positions we were handed; otherwise we animate a simulation. */
const hasLiveVehicles = computed(() => props.vehicles !== undefined);

function seedVehicles() {
  if (hasLiveVehicles.value) {
    vehicles.value = props.vehicles ?? [];
    return;
  }

  vehicles.value = buildSimulatedVehicles(props.routes);
  emit('update:vehicles', vehicles.value);
}

const vehicleMarkers = new Map<string, { marker: mapboxgl.Marker; el: HTMLElement }>();
const stopMarkers = new Map<string, mapboxgl.Marker>();

const mapStyles = [
  { label: 'Streets', value: 'mapbox://styles/mapbox/streets-v12' },
  { label: 'Navigation', value: 'mapbox://styles/mapbox/navigation-day-v1' },
  { label: 'Dark Mode', value: 'mapbox://styles/mapbox/navigation-night-v1' },
  { label: 'Satellite', value: 'mapbox://styles/mapbox/satellite-streets-v12' },
];

function getActiveToken(): string {
  if (customToken.value.trim()) return customToken.value.trim();
  return ((config.public.mapboxToken as string) || '').trim();
}

function applyCustomToken() {
  if (!customToken.value.trim()) return;
  isTokenModalOpen.value = false;
  tokenError.value = false;
  initMap();
}

function initMap() {
  if (typeof window === 'undefined' || !mapContainer.value) return;

  const token = getActiveToken();

  // No token means no tiles: show the setup banner instead of a broken map.
  if (!token) {
    tokenError.value = true;
    return;
  }

  mapboxgl.accessToken = token;

  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }

  try {
    const map = new mapboxgl.Map({
      container: mapContainer.value,
      style: currentStyle.value,
      center: BANDUNG_CENTER,
      zoom: 12.6,
      pitch: 30,
      bearing: -8,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      mapLoaded.value = true;
      tokenError.value = false;
      drawRoutes(map);
      renderStopMarkers(map);
      renderVehicleMarkers(map);

      if (props.activeRouteId) {
        const activeRoute = props.routes.find((route) => route.id === props.activeRouteId);
        if (activeRoute) flyToRoute(activeRoute);
      }
    });

    map.on('error', (e) => {
      if (
        e?.error &&
        (e.error.message?.includes('Forbidden') ||
          e.error.message?.includes('Unauthorized') ||
          (e.error as any).status === 401 ||
          (e.error as any).status === 403)
      ) {
        tokenError.value = true;
      }
    });

    mapInstance.value = map;
  } catch (err) {
    console.error('Failed to init Mapbox:', err);
    tokenError.value = true;
  }
}
function switchMapStyle(styleUrl: string) {
  if (!mapInstance.value) return;
  currentStyle.value = styleUrl;
  mapLoaded.value = false;
  mapInstance.value.setStyle(styleUrl);
  mapInstance.value.once('style.load', () => {
    mapLoaded.value = true;
    if (mapInstance.value) {
      drawRoutes(mapInstance.value);
      renderStopMarkers(mapInstance.value);
      renderVehicleMarkers(mapInstance.value);
    }
  });
}

function drawRoutes(map: mapboxgl.Map) {
  props.routes.forEach((route) => {
    const sourceId = `route-source-${route.id}`;
    const casingLayerId = `route-casing-${route.id}`;
    const lineLayerId = `route-line-${route.id}`;

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { id: route.id, name: route.name, color: route.color },
        geometry: { type: 'LineString', coordinates: route.path },
      });
      return;
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: { id: route.id, name: route.name, color: route.color },
        geometry: { type: 'LineString', coordinates: route.path },
      },
    });

    map.addLayer({
      id: casingLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#0f172a',
        'line-width': 7,
        'line-opacity': props.activeRouteId ? (props.activeRouteId === route.id ? 0.9 : 0.15) : 0.35,
      },
    });

    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': route.color,
        'line-width': props.activeRouteId === route.id ? 6 : 4,
        'line-opacity': props.activeRouteId ? (props.activeRouteId === route.id ? 1 : 0.25) : 0.9,
      },
    });

    map.on('click', lineLayerId, () => {
      emit('select-route', route);
    });
    map.on('mouseenter', lineLayerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', lineLayerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });
}

function updateRouteStyles() {
  const map = mapInstance.value;
  if (!map || !mapLoaded.value) return;

  props.routes.forEach((route) => {
    const casingLayerId = `route-casing-${route.id}`;
    const lineLayerId = `route-line-${route.id}`;

    if (map.getLayer(casingLayerId)) {
      const isSelected = !props.activeRouteId || props.activeRouteId === route.id;
      map.setPaintProperty(casingLayerId, 'line-opacity', isSelected ? 0.6 : 0.1);
    }
    if (map.getLayer(lineLayerId)) {
      const isSelected = !props.activeRouteId || props.activeRouteId === route.id;
      map.setPaintProperty(lineLayerId, 'line-opacity', isSelected ? 1 : 0.2);
      map.setPaintProperty(lineLayerId, 'line-width', props.activeRouteId === route.id ? 6 : 4);
    }
  });
}

function renderStopMarkers(map: mapboxgl.Map) {
  stopMarkers.forEach((marker) => marker.remove());
  stopMarkers.clear();

  props.routes.forEach((route) => {
    if (props.activeRouteId && props.activeRouteId !== route.id) return;

    route.stops.forEach((stop, idx) => {
      const isTerminal = idx === 0 || idx === route.stops.length - 1;
      const el = document.createElement('div');
      el.className = 'transit-stop-marker';
      el.style.backgroundColor = isTerminal ? route.color : '#ffffff';
      el.style.borderColor = route.color;

      const inner = document.createElement('div');
      inner.className = isTerminal ? 'stop-terminal-inner' : 'stop-regular-inner';
      el.appendChild(inner);

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div style="padding: 4px 6px; font-family: sans-serif; font-size: 11px;">
          <strong style="color: #0f172a; display: block;">${stop.name}</strong>
          <span style="color: #64748b;">${route.name} (${route.code})</span>
          <span style="display: block; color: #94a3b8; font-size: 10px;">${stop.zone}</span>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(stop.coordinates)
        .setPopup(popup)
        .addTo(map);

      stopMarkers.set(`${route.id}-${stop.id}`, marker);
    });
  });
}

function createVehicleElement(vehicle: AngkotVehicle): HTMLElement {
  const route = props.routes.find((r) => r.id === vehicle.routeId)
    ?? props.routes.find((r) => r.code === vehicle.angkotCode);
  const color = route?.color || '#123d8d';

  const wrapper = document.createElement('div');
  wrapper.className = `angkot-marker-wrap ${props.selectedVehicleId === vehicle.id ? 'is-selected' : ''}`;
  wrapper.setAttribute('data-vehicle-id', vehicle.id);

  wrapper.innerHTML = `
    <div class="angkot-pulse" style="background-color: ${color};"></div>
    <div class="angkot-icon-box" style="background: linear-gradient(135deg, ${color}, #0f172a);">
      <span class="angkot-code">${vehicle.angkotCode}</span>
    </div>
    <div class="angkot-label">${vehicle.plateNumber}</div>
  `;

  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    emit('select-vehicle', vehicle);
    flyToVehicle(vehicle);
  });

  return wrapper;
}

function renderVehicleMarkers(map: mapboxgl.Map) {
  vehicles.value.forEach((v) => {
    if (props.activeRouteId && props.activeRouteId !== v.routeId) {
      if (vehicleMarkers.has(v.id)) {
        vehicleMarkers.get(v.id)!.marker.remove();
        vehicleMarkers.delete(v.id);
      }
      return;
    }

    if (vehicleMarkers.has(v.id)) {
      const entry = vehicleMarkers.get(v.id)!;
      entry.marker.setLngLat(v.currentCoordinates);
      updateMarkerSelectionClass(entry.el, v.id);
    } else {
      const el = createVehicleElement(v);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(v.currentCoordinates)
        .addTo(map);
      vehicleMarkers.set(v.id, { marker, el });
    }
  });
}

function updateMarkerSelectionClass(el: HTMLElement, vehicleId: string) {
  if (props.selectedVehicleId === vehicleId) {
    el.classList.add('is-selected');
  } else {
    el.classList.remove('is-selected');
  }
}

function updateVehicleSimulation() {
  vehicles.value = vehicles.value.map((vehicle) => {
    const route = props.routes.find((r) => r.id === vehicle.routeId);
    if (!route || route.path.length < 2) return vehicle;

    const step = 0.015 * (vehicle.speedKmH / 30);
    let nextProgress = vehicle.progressPercent + step * vehicle.direction;
    let nextDirection = vehicle.direction;

    if (nextProgress >= 1) {
      nextProgress = 1;
      nextDirection = -1;
    } else if (nextProgress <= 0) {
      nextProgress = 0;
      nextDirection = 1;
    }

    const { coordinates, heading } = interpolatePositionAlongPath(route.path, nextProgress);

    return {
      ...vehicle,
      progressPercent: nextProgress,
      direction: nextDirection,
      currentCoordinates: coordinates,
      currentHeading: heading,
    };
  });

  if (mapInstance.value && mapLoaded.value) {
    vehicles.value.forEach((v) => {
      const entry = vehicleMarkers.get(v.id);
      if (entry) {
        entry.marker.setLngLat(v.currentCoordinates);
      }
    });
  }

  emit('update:vehicles', vehicles.value);
}

function startSimulation() {
  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = setInterval(updateVehicleSimulation, 1000);
  isSimulatingActive.value = true;
}

function stopSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
  isSimulatingActive.value = false;
}

function toggleSimulation() {
  if (isSimulatingActive.value) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

function flyToVehicle(vehicle: AngkotVehicle) {
  if (!mapInstance.value) return;
  mapInstance.value.flyTo({
    center: vehicle.currentCoordinates,
    zoom: 14.5,
    pitch: 45,
    bearing: vehicle.currentHeading,
    essential: true,
    duration: 1600,
  });
}

function flyToRoute(route: TransitRoute) {
  if (!mapInstance.value || route.path.length === 0) return;
  const bounds = new mapboxgl.LngLatBounds();
  route.path.forEach((pt) => bounds.extend(pt));
  mapInstance.value.fitBounds(bounds, {
    padding: { top: 70, bottom: 70, left: 60, right: 60 },
    duration: 1500,
  });
}

function resetMapCenter() {
  if (!mapInstance.value) return;
  emit('select-vehicle', null);
  emit('select-route', null);
  mapInstance.value.flyTo({
    center: BANDUNG_CENTER,
    zoom: 12.6,
    pitch: 30,
    bearing: -8,
    duration: 1400,
  });
}

watch(
  () => props.routes,
  () => {
    seedVehicles();

    const map = mapInstance.value;
    if (!map || !mapLoaded.value) return;
    drawRoutes(map);
    renderStopMarkers(map);
    renderVehicleMarkers(map);
  }
);

watch(
  () => props.vehicles,
  () => {
    seedVehicles();

    const map = mapInstance.value;
    if (map && mapLoaded.value) renderVehicleMarkers(map);
  }
);

watch(
  () => props.activeRouteId,
  (newRouteId) => {
    updateRouteStyles();
    if (mapInstance.value && mapLoaded.value) {
      renderStopMarkers(mapInstance.value);
      renderVehicleMarkers(mapInstance.value);
      if (newRouteId) {
        const route = props.routes.find((r) => r.id === newRouteId);
        if (route) flyToRoute(route);
      }
    }
  }
);

watch(
  () => props.selectedVehicleId,
  (newVehicleId) => {
    vehicleMarkers.forEach(({ el }, id) => updateMarkerSelectionClass(el, id));
    if (newVehicleId) {
      const v = vehicles.value.find((item) => item.id === newVehicleId);
      if (v) flyToVehicle(v);
    }
  }
);

onMounted(() => {
  initMap();
  seedVehicles();
  if (props.isSimulating && !hasLiveVehicles.value) {
    startSimulation();
  }
});

onUnmounted(() => {
  stopSimulation();
  vehicleMarkers.forEach(({ marker }) => marker.remove());
  vehicleMarkers.clear();
  stopMarkers.forEach((marker) => marker.remove());
  stopMarkers.clear();
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
});

defineExpose({
  resetMapCenter,
  flyToVehicle,
  flyToRoute,
  toggleSimulation,
  vehicles,
});
</script>
<template>
  <div class="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl" :style="{ height: mapHeight }">
    <!-- Map Container -->
    <div ref="mapContainer" class="h-full w-full" />

    <!-- Top Overlay Controls Bar -->
    <div class="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
      <!-- Live Indicator -->
      <div class="flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white shadow-md backdrop-blur">
        <span class="relative flex h-2.5 w-2.5">
          <span v-if="isSimulatingActive || hasLiveVehicles" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :class="isSimulatingActive || hasLiveVehicles ? 'bg-emerald-500' : 'bg-slate-400'"></span>
        </span>
        <span>{{ hasLiveVehicles ? 'Posisi Langsung' : (isSimulatingActive ? 'Live Telemetry' : 'Simulation Paused') }}</span>
      </div>

      <!-- Simulation Play/Pause -->
      <button
        v-if="!hasLiveVehicles"
        type="button"
        @click="toggleSimulation"
        class="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white backdrop-blur transition cursor-pointer"
        :title="isSimulatingActive ? 'Pause simulation' : 'Start simulation'"
      >
        <span>{{ isSimulatingActive ? '⏸ Pause' : '▶ Simulate' }}</span>
      </button>

      <!-- Center Reset -->
      <button
        type="button"
        @click="resetMapCenter"
        class="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white backdrop-blur transition cursor-pointer"
        title="Reset view to Bandung center"
      >
        <span>🎯 Reset View</span>
      </button>

      <!-- Style selector -->
      <select
        :value="currentStyle"
        @change="switchMapStyle(($event.target as HTMLSelectElement).value)"
        class="rounded-lg border-0 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow backdrop-blur transition outline-none cursor-pointer"
      >
        <option v-for="st in mapStyles" :key="st.value" :value="st.value">
          {{ st.label }}
        </option>
      </select>
    </div>

    <!-- Active Route Badge / Info pill -->
    <div
      v-if="props.activeRouteId"
      class="absolute top-14 left-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur"
    >
      <span
        class="h-2.5 w-2.5 rounded-full"
        :style="{ backgroundColor: props.routes.find(r => r.id === props.activeRouteId)?.color || '#123d8d' }"
      ></span>
      <span class="text-slate-800">
        Filtered: {{ props.routes.find(r => r.id === props.activeRouteId)?.name }}
      </span>
      <button
        type="button"
        @click="emit('select-route', null)"
        class="ml-1 text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
        title="Clear filter"
      >
        ✕
      </button>
    </div>

    <!-- Token configuration banner if error -->
    <div
      v-if="tokenError"
      class="absolute inset-x-4 top-16 z-20 mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xl"
    >
      <div class="flex items-start gap-3">
        <div class="text-xl">⚠️</div>
        <div class="flex-1 text-xs text-amber-900">
          <p class="font-bold text-sm">Mapbox Token Configuration</p>
          <p class="mt-1">
            To view high-resolution tiles, please add your Mapbox public token in <code class="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> as <code class="font-mono bg-amber-100 px-1 py-0.5 rounded">NUXT_PUBLIC_MAPBOX_TOKEN</code> or set it directly below:
          </p>
          <div class="mt-2 flex gap-2">
            <input
              v-model="customToken"
              type="text"
              placeholder="pk.eyJ1..."
              class="flex-1 rounded border border-amber-300 bg-white px-2 py-1 font-mono text-xs outline-none"
            />
            <button
              type="button"
              @click="applyCustomToken"
              class="rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800 cursor-pointer"
            >
              Apply Token
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Custom Mapbox Stop Marker */
.transit-stop-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.transit-stop-marker:hover {
  transform: scale(1.4);
  z-index: 10;
}

.stop-terminal-inner {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #ffffff;
}

.stop-regular-inner {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: inherit;
}

/* Custom Angkot Vehicle Marker */
.angkot-marker-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.angkot-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 38px;
  height: 38px;
  margin-top: -19px;
  margin-left: -19px;
  border-radius: 50%;
  opacity: 0.45;
  animation: marker-pulse 2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  pointer-events: none;
}

@keyframes marker-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.angkot-icon-box {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: -0.02em;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.angkot-marker-wrap:hover .angkot-icon-box {
  transform: scale(1.2);
}

.angkot-marker-wrap.is-selected .angkot-icon-box {
  transform: scale(1.3);
  border-color: #facc15;
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.5), 0 6px 14px rgba(0, 0, 0, 0.4);
}

.angkot-label {
  position: relative;
  z-index: 2;
  margin-top: 2px;
  padding: 1px 5px;
  background: rgba(15, 23, 42, 0.88);
  border-radius: 4px;
  color: #ffffff;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Mapbox UI Tweaks */
.mapboxgl-popup-content {
  border-radius: 10px !important;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15) !important;
  padding: 8px 12px !important;
}

.mapboxgl-ctrl-group {
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
}
</style>

