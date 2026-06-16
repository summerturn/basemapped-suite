import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocation } from '@/hooks/useLocation';

type AssetType = 'valve' | 'hydrant' | 'manhole' | 'meter' | 'all';

interface Asset {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  properties: string;
}

export default function MapScreen() {
  const db = useSQLiteContext();
  const { location, getCurrentPosition } = useLocation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filterType, setFilterType] = useState<AssetType>('all');
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const loadAssets = useCallback(async () => {
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params: any[] = [];
    if (filterType !== 'all') {
      query += ' AND type = ?';
      params.push(filterType);
    }
    if (search.trim()) {
      query += ' AND (id LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (location) {
      query += ' AND ABS(latitude - ?) < 0.1 AND ABS(longitude - ?) < 0.1';
      params.push(location.latitude, location.longitude);
    }
    const rows = await db.getAllAsync<Asset>(query, params);
    setAssets(rows);
  }, [db, filterType, search, location]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    getCurrentPosition().then((loc) => {
      if (loc) setRegion((r) => ({ ...r, latitude: loc.latitude, longitude: loc.longitude }));
    });
  }, [getCurrentPosition]);

  const handleAddAsset = async () => {
    const loc = await getCurrentPosition();
    if (!loc) {
      Alert.alert('Location Required', 'Could not get current GPS location.');
      return;
    }
    Alert.alert('Add Asset', `Create new asset at ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => {} },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search nearby..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filters}>
          {(['all', 'valve', 'hydrant', 'manhole', 'meter'] as AssetType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.filterBtn, filterType === t && styles.filterBtnActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={filterType === t ? styles.filterTextActive : styles.filterText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <MapView style={styles.map} region={region} onRegionChangeComplete={setRegion} showsUserLocation>
        {assets.map((asset) => (
          <Marker
            key={asset.id}
            coordinate={{ latitude: asset.latitude, longitude: asset.longitude }}
            pinColor={asset.type === 'hydrant' ? 'red' : asset.type === 'valve' ? 'blue' : 'green'}
            onPress={() => setSelectedAsset(asset)}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.addBtn} onPress={handleAddAsset}>
        <Text style={styles.addBtnText}>+ Add Asset</Text>
      </TouchableOpacity>

      <Modal visible={!!selectedAsset} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedAsset?.type?.toUpperCase()} - {selectedAsset?.id}</Text>
            <Text>Address: {selectedAsset?.address}</Text>
            <Text>Status: {selectedAsset?.status}</Text>
            <Text>Coords: {selectedAsset?.latitude}, {selectedAsset?.longitude}</Text>
            <TouchableOpacity onPress={() => setSelectedAsset(null)} style={styles.closeBtn}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: { height: 40, borderColor: '#ddd', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8 },
  filters: { flexDirection: 'row', marginTop: 8, gap: 6 },
  filterBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, backgroundColor: '#f3f4f6' },
  filterBtnActive: { backgroundColor: '#2563eb' },
  filterText: { color: '#374151', fontSize: 12 },
  filterTextActive: { color: '#fff', fontSize: 12 },
  addBtn: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  closeBtn: { marginTop: 12, alignSelf: 'flex-end', padding: 8 },
});
