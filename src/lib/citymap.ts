import { supabase, type CityMapEntry } from './supabase';

export interface StateGroup {
  state: string;
  cities: CityMapEntry[];
}

/**
 * Fetch all active city_map entries (excluding internal, service, and retired)
 * grouped by state for navigation
 */
export async function getCityMapForNav(): Promise<StateGroup[]> {
  const { data, error } = await supabase
    .from('city_map')
    .select('*')
    .eq('is_retired', false)
    .eq('is_service', false)
    .eq('is_internal', false)
    .order('state')
    .order('city');

  if (error) {
    console.error('Error fetching city_map:', error);
    return [];
  }

  // Group by state
  const grouped = new Map<string, CityMapEntry[]>();

  for (const entry of data || []) {
    const state = entry.state || 'other';
    if (!grouped.has(state)) {
      grouped.set(state, []);
    }
    grouped.get(state)!.push(entry);
  }

  // Convert to array and sort states alphabetically
  const result: StateGroup[] = [];
  const sortedStates = [...grouped.keys()].sort();

  for (const state of sortedStates) {
    // Skip empty state entries
    if (state && state !== 'other') {
      result.push({
        state,
        cities: grouped.get(state)!,
      });
    }
  }

  return result;
}

/**
 * Get unique states from city_map
 */
export async function getActiveStates(): Promise<string[]> {
  const groups = await getCityMapForNav();
  return groups.map(g => g.state);
}
