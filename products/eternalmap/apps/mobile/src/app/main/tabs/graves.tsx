import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getDatabase } from '../../../services/database/connection';
import { RepositoryFactory, type Grave } from '../../../services/database/repositories';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface GraveListItem extends Grave {
  personName?: string;
  sectionName?: string;
  plotNumber?: string;
}

export default function GravesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [graves, setGraves] = useState<GraveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'plot'>('name');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const db = getDatabase();
      const repos = RepositoryFactory.getInstance(db);

      let data: GraveListItem[] = [];
      if (searchQuery.trim().length > 0) {
        data = repos.graves.search(searchQuery) as GraveListItem[];
      } else {
        data = repos.graves.findByCemetery('default') as GraveListItem[];
      }

      // Enrich with person names
      for (const g of data) {
        const persons = repos.persons.findByGrave(g.id);
        if (persons.length > 0) {
          g.personName = `${persons[0].firstName} ${persons[0].lastName}`;
        }
      }

      // Filter by status
      if (filterStatus !== 'all') {
        data = data.filter(g => g.status === filterStatus);
      }

      // Sort
      data.sort((a, b) => {
        if (sortBy === 'name') {
          return (a.personName ?? a.graveNumber ?? '').localeCompare(b.personName ?? b.graveNumber ?? '');
        }
        if (sortBy === 'date') {
          return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        }
        return (a.graveNumber ?? '').localeCompare(b.graveNumber ?? '');
      });

      setGraves(data);
    } catch (err) {
      // offline or empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, sortBy, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleNavigateToMap = useCallback((grave: GraveListItem) => {
    router.push({
      pathname: '/map',
      params: { lat: grave.gpsLat, lng: grave.gpsLng, graveId: grave.id },
    });
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: GraveListItem; index: number }) => {
    const statusColor =
      item.status === 'occupied'
        ? '#F44336'
        : item.status === 'available'
        ? '#4CAF50'
        : item.status === 'reserved'
        ? '#FFC107'
        : '#9E9E9E';

    return (
      <Animated.View entering={FadeInUp.delay(index * 30).duration(300)}>
        <TouchableOpacity
          style={[styles.row, isDark && styles.rowDark]}
          onPress={() => handleNavigateToMap(item)}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <View style={styles.rowText}>
              <Text style={[styles.name, isDark && styles.textDark]}>
                {item.personName || `Grave ${item.graveNumber || item.id}`}
              </Text>
              <Text style={[styles.meta, isDark && styles.textMutedDark]}>
                {item.status} · Plot {item.plotNumber ?? '—'} · {item.sectionName ?? '—'}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [isDark, handleNavigateToMap]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
        No graves found.
      </Text>
    </View>
  ), [isDark]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Graves</Text>
      </View>

      <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder="Search by deceased name..."
          placeholderTextColor={isDark ? '#888' : '#999'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.toolbar}>
        <View style={styles.sortGroup}>
          {(['name', 'date', 'plot'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus !== 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus(prev => prev === 'all' ? 'occupied' : prev === 'occupied' ? 'available' : 'all')}
        >
          <Text style={[styles.filterText, filterStatus !== 'all' && styles.filterTextActive]}>
            {filterStatus === 'all' ? 'All' : filterStatus}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={graves}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.separator, isDark && styles.separatorDark]} />}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  textDark: {
    color: '#eee',
  },
  textMutedDark: {
    color: '#888',
  },
  searchBar: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBarDark: {
    backgroundColor: '#2c2c2e',
  },
  searchInput: {
    fontSize: 15,
    color: '#111',
  },
  searchInputDark: {
    color: '#eee',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#e5e5ea',
  },
  sortChipActive: {
    backgroundColor: '#2196F3',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  sortTextActive: {
    color: '#fff',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#e5e5ea',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  rowDark: {
    backgroundColor: '#1c1c1e',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 12,
  },
  separatorDark: {
    backgroundColor: '#2c2c2e',
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});
