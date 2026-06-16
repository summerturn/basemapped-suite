import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getDatabase } from '../../../services/database/connection';
import { RepositoryFactory, type SearchResult } from '../../../services/database/repositories';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<SearchResult['entityType'][]>(['grave', 'person', 'plot']);

  const performSearch = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const db = getDatabase();
      const repos = RepositoryFactory.getInstance(db);
      const hits = repos.search.search(text, { limit: 50, types: selectedTypes });
      setResults(hits);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes]);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const toggleType = useCallback((type: SearchResult['entityType']) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleResultPress = useCallback((item: SearchResult) => {
    if (item.entityType === 'person') {
      router.push({ pathname: '/graves/person', params: { id: item.entityId } });
    } else if (item.entityType === 'grave') {
      router.push({ pathname: '/graves/detail', params: { id: item.entityId } });
    } else if (item.entityType === 'plot') {
      router.push({ pathname: '/graves/plot', params: { id: item.entityId } });
    }
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => {
    const icon =
      item.entityType === 'person'
        ? '👤'
        : item.entityType === 'grave'
        ? '⚰️'
        : '📐';

    return (
      <Animated.View entering={FadeInUp.delay(index * 20).duration(250)}>
        <TouchableOpacity
          style={[styles.row, isDark && styles.rowDark]}
          onPress={() => handleResultPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.rowText}>
            <Text style={[styles.title, isDark && styles.textDark]}>{item.title}</Text>
            <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>{item.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [isDark, handleResultPress]);

  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.entityType]) acc[item.entityType] = [];
    acc[item.entityType].push(item);
    return acc;
  }, {} as Record<SearchResult['entityType'], SearchResult[]>);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>Search</Text>
      </View>

      <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          placeholder="Search graves, people, plots..."
          placeholderTextColor={isDark ? '#888' : '#999'}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.typeFilters}>
        {(['person', 'grave', 'plot'] as const).map(type => {
          const active = selectedTypes.includes(type);
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, active && styles.typeChipActive]}
              onPress={() => toggleType(type)}
            >
              <Text style={[styles.typeText, active && styles.typeTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && query.trim().length >= 2 && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
        </View>
      )}

      {results.length === 0 && query.trim().length >= 2 && !loading && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
            No results found for “{query}”
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.separator, isDark && styles.separatorDark]} />}
        keyboardShouldPersistTaps="handled"
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
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
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
  typeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
  },
  typeChipActive: {
    backgroundColor: '#2196F3',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  typeTextActive: {
    color: '#fff',
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  rowDark: {
    backgroundColor: '#1c1c1e',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  subtitle: {
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
});
