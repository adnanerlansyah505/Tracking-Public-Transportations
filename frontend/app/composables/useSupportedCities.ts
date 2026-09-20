/**
 * Cities the backend can detect. Offering exactly this list keeps published
 * routes inside the cities the map is able to switch to.
 */
export function useSupportedCities() {
  const { $api } = useNuxtApp();
  const cities = useState<string[]>('supported-cities', () => []);

  async function ensure() {
    if (cities.value.length > 0) return cities.value;

    try {
      const response = await $api<{ data: { cities: string[] } }>('/location/cities');
      cities.value = Array.isArray(response.data?.cities) ? response.data.cities : [];
    } catch {
      // Fall back to the default network below.
    }

    if (cities.value.length === 0) cities.value = ['Bandung'];

    return cities.value;
  }

  const items = computed(() => cities.value.map((name) => ({ label: name, value: name })));

  return { cities, items, ensure };
}
