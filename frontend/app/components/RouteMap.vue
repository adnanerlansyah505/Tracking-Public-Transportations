<script setup lang="ts">
import mapboxgl from 'mapbox-gl';

interface Point {
  latitude: number;
  longitude: number;
}

/**
 * A map that draws the driving route from one point to another. Both the driver
 * (to the passenger) and the passenger (to the angkot) views are this component
 * with different labels and colours.
 */
const props = withDefaults(defineProps<{
  from: Point | null;
  to: Point | null;
  fromLabel: string;
  fromGlyph: string;
  fromColor: string;
  toLabel: string;
  toGlyph: string;
  toColor: string;
  lineColor: string;
  /** Small print after the legend, e.g. the distance and compass direction. */
  meta?: string;
  loadingLabel?: string;
  fallbackLabel?: string;
}>(), {
  meta: '',
  loadingLabel: 'Menyusun rute…',
  fallbackLabel: 'Rute jalan tidak tersedia, menampilkan arah langsung.',
});

const emit = defineEmits<{ summary: [value: { distanceKm: number; durationMin: number } | null] }>();

const config = useRuntimeConfig();

const container = ref<HTMLDivElement | null>(null);
const mapInstance = shallowRef<mapboxgl.Map | null>(null);
const loaded = ref(false);
const routeLoading = ref(false);
const routeError = ref('');

const ROUTE_SOURCE = 'route-source';
const ROUTE_CASING = 'route-casing';
const ROUTE_LINE = 'route-line';

const token = computed(() => ((config.public.mapboxToken as string) || '').trim());

let fromMarker: mapboxgl.Marker | null = null;
let toMarker: mapboxgl.Marker | null = null;
let requestId = 0;
// Where the view was last framed. Live positions arrive every few seconds, and
// re-framing on each one would fight whoever is panning the map.
let lastFit: Point | null = null;

function buildMarker(color: string, glyph: string, caption: string) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;';

  const bubble = document.createElement('div');
  bubble.style.cssText = `width:28px;height:28px;border-radius:9999px;border:3px solid #ffffff;background:${color};
    box-shadow:0 4px 10px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;
    color:#ffffff;font-weight:800;font-size:11px;font-family:inherit;`;
  bubble.textContent = glyph;

  const label = document.createElement('span');
  label.style.cssText = `background:rgba(15,23,42,0.85);color:#fff;border-radius:4px;padding:1px 5px;
    font-size:9px;font-weight:600;white-space:nowrap;font-family:inherit;`;
  label.textContent = caption;

  el.append(bubble, label);
  return el;
}

function init() {
  if (typeof window === 'undefined' || !container.value || mapInstance.value || !token.value) return;

  mapboxgl.accessToken = token.value;

  const center = props.from ?? props.to ?? { latitude: -6.9039, longitude: 107.6191 };

  const map = new mapboxgl.Map({
    container: container.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [center.longitude, center.latitude],
    zoom: 14,
    attributionControl: true,
  });

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.on('load', () => {
    loaded.value = true;
    refresh();
  });

  mapInstance.value = map;
}

/** Mapbox driving route between the two points. */
async function fetchRoute(from: Point, to: Point) {
  const straight: [number, number][] = [
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ];

  routeLoading.value = true;
  routeError.value = '';

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
      + `?geometries=geojson&overview=full&access_token=${token.value}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('directions failed');

    const data = await response.json();
    const route = data?.routes?.[0];
    const coordinates = route?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error('no route');

    emit('summary', {
      distanceKm: Number(route.distance) / 1000,
      durationMin: Math.max(1, Math.round(Number(route.duration) / 60)),
    });

    return coordinates as [number, number][];
  } catch {
    // Offline or no directions quota — a straight line still shows the way.
    routeError.value = props.fallbackLabel;
    emit('summary', null);
    return straight;
  } finally {
    routeLoading.value = false;
  }
}

function setLine(map: mapboxgl.Map, coordinates: [number, number][]) {
  const source = map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined;

  if (source) {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    });
    return;
  }

  map.addSource(ROUTE_SOURCE, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    },
  });

  map.addLayer({
    id: ROUTE_CASING,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#0f172a', 'line-width': 7, 'line-opacity': 0.35 },
  });

  map.addLayer({
    id: ROUTE_LINE,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': props.lineColor, 'line-width': 4 },
  });
}

function renderMarkers() {
  fromMarker?.remove();
  toMarker?.remove();
  fromMarker = null;
  toMarker = null;

  const map = mapInstance.value;
  if (!map) return;

  if (props.from) {
    fromMarker = new mapboxgl.Marker({
      element: buildMarker(props.fromColor, props.fromGlyph, props.fromLabel),
      anchor: 'bottom',
    })
      .setLngLat([props.from.longitude, props.from.latitude])
      .addTo(map);
  }

  if (props.to) {
    toMarker = new mapboxgl.Marker({
      element: buildMarker(props.toColor, props.toGlyph, props.toLabel),
      anchor: 'bottom',
    })
      .setLngLat([props.to.longitude, props.to.latitude])
      .addTo(map);
  }
}

function fitBounds(map: mapboxgl.Map) {
  const points: [number, number][] = [];

  if (props.from) points.push([props.from.longitude, props.from.latitude]);
  if (props.to) points.push([props.to.longitude, props.to.latitude]);

  if (points.length < 2) {
    const only = points[0];
    if (only) map.easeTo({ center: only, zoom: 15 });
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  points.forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, duration: 700 });
  lastFit = props.to ? { ...props.to } : null;
}

/** Frame the pair again only once the destination has genuinely moved. */
function destinationMoved() {
  if (!lastFit || !props.to) return true;

  // Roughly 250 m at these latitudes — enough to ignore GPS jitter.
  return Math.abs(lastFit.latitude - props.to.latitude) > 0.0025
    || Math.abs(lastFit.longitude - props.to.longitude) > 0.0025;
}

async function refresh() {
  const map = mapInstance.value;
  if (!map || !loaded.value) return;

  const current = ++requestId;

  renderMarkers();

  if (!props.from || !props.to) return;

  const coordinates = await fetchRoute(props.from, props.to);

  // A newer refresh already started; drop this result.
  if (current !== requestId || !mapInstance.value) return;

  setLine(mapInstance.value, coordinates);

  if (destinationMoved()) fitBounds(mapInstance.value);
}

onMounted(() => {
  init();
});

onUnmounted(() => {
  fromMarker?.remove();
  toMarker?.remove();
  mapInstance.value?.remove();
  mapInstance.value = null;
});

watch([() => props.from, () => props.to], () => {
  refresh();
});
</script>

<template>
  <div class="relative mt-3 h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 sm:h-[340px]">
    <div
      ref="container"
      class="h-full w-full"
    />

    <div
      v-if="!token"
      class="absolute inset-0 z-10 flex items-center justify-center p-6 text-center"
    >
      <p class="rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
        Peta belum aktif — isi <code class="font-mono">NUXT_PUBLIC_MAPBOX_TOKEN</code> pada berkas
        <code class="font-mono">.env</code>.
      </p>
    </div>

    <div
      v-if="routeLoading"
      class="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow backdrop-blur"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="h-3.5 w-3.5 animate-spin text-[#123d8d]"
      />
      {{ loadingLabel }}
    </div>
  </div>

  <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
    <p class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
      <span
        class="inline-flex h-2.5 w-2.5 rounded-full"
        :style="{ backgroundColor: fromColor }"
      /> {{ fromLabel }}
      <span
        class="ml-2 inline-flex h-2.5 w-2.5 rounded-full"
        :style="{ backgroundColor: toColor }"
      /> {{ toLabel }}
      <span
        v-if="meta"
        class="ml-2 text-slate-400"
      >
        {{ meta }}
      </span>
    </p>

    <p
      v-if="routeError"
      class="text-[11px] text-amber-700"
    >
      {{ routeError }}
    </p>
  </div>
</template>
