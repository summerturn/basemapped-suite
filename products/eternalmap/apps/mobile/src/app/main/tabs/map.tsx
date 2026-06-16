import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CemeteryMap } from '../../../components/map/CemeteryMap';
import type { Region, LatLng } from 'react-native-maps';
import { useLocation } from '../../../hooks/useLocation';
import { RepositoryFactory } from '../../../services/database/repositories';
import { getDatabase } from '../../../services/database/connection';

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { position } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'occupied' | 'available'>('all');
  const [loading, setLoading] = useState(true);
  const [plots, setPlots] = useState<any[]>([]);
  const [graves, setGraves] = useState<any[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  useEffect(() => {
    if (position) {
      setRegion(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
    }
  }, [position]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const db = getDatabase();
      const repos = RepositoryFactory.getInstance(db);

      const allPlots = repos.plots.findAll ? [] : repos.plots.findByStatus('available');
      // Workaround: PlotRepository does not expose findAll, so fetch by cemetery if needed.
      // For demo purposes, we load all plots via a raw query or by status combinations.
      // Instead, use findByStatus for the filter:
      let plotData: any[] = [];
      if (filter === 'available') {
        plotData = repos.plots.findAvailable();
      } else if (filter === 'occupied') {
        plotData = repos.plots.findByStatus('occupied');
      } else {
        plotData = [
          ...repos.plots.findByStatus('available'),
          ...repos.plots.findByStatus('occupied'),
          ...repos.plots.findByStatus('reserved'),
          ...repos.plots.findByStatus('maintenance'),
        ];
      }

      // Convert to map polygons if coordinates exist
      const mappedPlots = plotData
        .filter(p => p.boundaryGeojson)
        .map(p => ({
          id: p.id,
          coordinates: JSON.parse(p.boundaryGeojson as string) as LatLng[],
          status: p.status,
          plotNumber: p.plotNumber,
          sectionName: '',
        }));

      setPlots(mappedPlots);

      // Load graves
      const allGraves = repos.graves.findAll ? [] : [];
      // GraveRepository does not expose findAll; use search for now
      const graveData = searchQuery.trim().length > 0
        ? repos.graves.search(searchQuery)
        : repos.graves.findByCemetery(plotData[0]?.cemeteryId ?? 'default');

      const mappedGraves = graveData.map(g => ({
        id: g.id,
        coordinate: { latitude: g.gpsLat ?? region.latitude, longitude: g.gpsLng ?? region.longitude },
        title: g.graveNumber ?? 'Unknown',
        status: g.status,
      }));

      setGraves(mappedGraves);
    } catch (err) {
      // offline / empty DB is okay
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, region.latitude, region.longitude]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    // Debounce could be added here
  }, []);

  const handleAddGrave = useCallback(() => {
    router.push('/graves/new');
  }, [router]);

  const handlePlotPress = useCallback((plot: any) => {
    // Navigate to plot detail or show bottom sheet
    router.push({ pathname: '/graves/plot', params: { id: plot.id } });
  }, [router]);

  const handleGravePress = useCallback((grave: any) => {
    router.push({ pathname: '/graves/detail', params: { id: grave.id } });
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      {/* Search Bar */}
      <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder="Search graves by name..."
          placeholderTextColor={isDark ? '#888' : '#999'}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {(['all', 'occupied', 'available'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
          </View>
        ) : (
          <CemeteryMap
            initialRegion={region}
            plots={plots}
            graves={graves}
            onPlotPress={handlePlotPress}
            onGravePress={handleGravePress}
            onRegionChangeComplete={setRegion}
          />
        )}
      </View>

      {/* Add Grave FAB */}
      <TouchableOpacity
        style={[styles.fab, isDark && styles.fabDark]}
        onPress={handleAddGrave}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
  },
  searchBarDark: {
    backgroundColor: '#2c2c2e',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
  },
  searchInputDark: {
    color: '#eee',
  },
  clearButton: {
    padding: 6,
  },
  clearText: {
    fontSize: 14,
    color: '#888',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  filterTextActive: {
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  fabDark: {
    backgroundColor: '#42A5F5',
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 30,
  },
});
