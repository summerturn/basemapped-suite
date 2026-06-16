import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, RefreshControl, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocation } from '@/hooks/useLocation';

interface Asset {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  properties: string;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AssetsScreen() {
  const db = useSQLiteContext();
  const { location } = useLocation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const loadAssets = useCallback(async () => {
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params: any[] = [];
    if (search.trim()) {
      query += ' AND (id LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    const rows = await db.getAllAsync<Asset>(query, params);
    if (location) {
      rows.sort((a, b) => {
        const da = haversine(location.latitude, location.longitude, a.latitude, a.longitude);
        const db_ = haversine(location.latitude, location.longitude, b.latitude, b.longitude);
        return da - db_;
      });
    }
    setAssets(rows);
  }, [db, search, location]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssets();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const renderItem = ({ item }: { item: Asset }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedAsset(item)}>
      <Text style={styles.cardTitle}>{item.type.toUpperCase()} - {item.id}</Text>
      <Text style={styles.cardSub}>{item.address}</Text>
      <Text style={styles.cardSub}>Status: {item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by ID or address"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
      />

      <Modal visible={!!selectedAsset} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{selectedAsset?.type.toUpperCase()} - {selectedAsset?.id}</Text>
              <Text style={styles.modalRow}>Address: {selectedAsset?.address}</Text>
              <Text style={styles.modalRow}>Status: {selectedAsset?.status}</Text>
              <Text style={styles.modalRow}>Latitude: {selectedAsset?.latitude}</Text>
              <Text style={styles.modalRow}>Longitude: {selectedAsset?.longitude}</Text>
              <Text style={styles.modalRow}>Properties: {selectedAsset?.properties}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setSelectedAsset(null)} style={styles.closeBtn}>
              <Text style={{ color: '#2563eb', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  input: { margin: 16, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { color: '#6b7280' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { width: '85%', maxHeight: '70%', backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalRow: { fontSize: 14, marginBottom: 8, color: '#374151' },
  closeBtn: { marginTop: 12, alignSelf: 'flex-end', padding: 8 },
});
