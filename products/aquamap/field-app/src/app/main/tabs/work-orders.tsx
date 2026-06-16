import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, Button, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { useLocation } from '@/hooks/useLocation';
import Signature from 'react-native-signature-canvas';
import { queueChange } from '@/services/sync/sync-service';
import { useAuthStore } from '@/stores/authStore';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  asset_id: string;
  clock_in: string | null;
  clock_out: string | null;
  parts_used: string;
  photos_before: string;
  photos_after: string;
  notes: string | null;
  signature: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
}

const STATUS_FLOW = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'];

export default function WorkOrdersScreen() {
  const db = useSQLiteContext();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [active, setActive] = useState<WorkOrder | null>(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [parts, setParts] = useState('');
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const { getCurrentPosition } = useLocation();

  const loadOrders = useCallback(async () => {
    const rows = await db.getAllAsync<WorkOrder>(
      `SELECT * FROM work_orders WHERE assigned_to = ? ORDER BY 
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC`,
      [user?.id || '']
    );
    setOrders(rows);
  }, [db, user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openOrder = (wo: WorkOrder) => {
    setActive(wo);
    setStatus(wo.status);
    setNotes(wo.notes || '');
    setParts(wo.parts_used ? JSON.parse(wo.parts_used).join(', ') : '');
    setPhotosBefore(wo.photos_before ? JSON.parse(wo.photos_before) : []);
    setPhotosAfter(wo.photos_after ? JSON.parse(wo.photos_after) : []);
    setSignature(wo.signature);
  };

  const takePhoto = async (setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      setState((prev) => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const clockIn = async () => {
    if (!active) return;
    const loc = await getCurrentPosition();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE work_orders SET clock_in = ?, gps_lat = ?, gps_lon = ?, status = ? WHERE id = ?', [
      now, loc?.latitude || null, loc?.longitude || null, 'in_progress', active.id,
    ]);
    await queueChange(db, 'work_orders', active.id, 'UPDATE', {
      id: active.id, clock_in: now, gps_lat: loc?.latitude, gps_lon: loc?.longitude, status: 'in_progress',
    });
    setActive({ ...active, clock_in: now, status: 'in_progress' });
    loadOrders();
  };

  const clockOut = async () => {
    if (!active) return;
    const loc = await getCurrentPosition();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE work_orders SET clock_out = ?, gps_lat = ?, gps_lon = ? WHERE id = ?', [
      now, loc?.latitude || null, loc?.longitude || null, active.id,
    ]);
    await queueChange(db, 'work_orders', active.id, 'UPDATE', {
      id: active.id, clock_out: now, gps_lat: loc?.latitude, gps_lon: loc?.longitude,
    });
    setActive({ ...active, clock_out: now });
    loadOrders();
  };

  const saveWorkOrder = async () => {
    if (!active) return;
    const partsArray = parts.split(',').map((s) => s.trim()).filter(Boolean);
    await db.runAsync(
      'UPDATE work_orders SET status = ?, notes = ?, parts_used = ?, photos_before = ?, photos_after = ?, signature = ? WHERE id = ?',
      [status, notes, JSON.stringify(partsArray), JSON.stringify(photosBefore), JSON.stringify(photosAfter), signature, active.id]
    );
    await queueChange(db, 'work_orders', active.id, 'UPDATE', {
      id: active.id, status, notes, parts_used: partsArray, photos_before: photosBefore, photos_after: photosAfter, signature,
    });
    setActive(null);
    loadOrders();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openOrder(item)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={[styles.badge, item.priority === 'high' && styles.badgeHigh]}>{item.priority}</Text>
            </View>
            <Text style={styles.cardSub}>{item.description}</Text>
            <Text style={styles.cardSub}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!active} animationType="slide">
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.modalTitle}>{active?.title}</Text>
          <Text style={styles.label}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {STATUS_FLOW.map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, status === s && styles.chipActive]} onPress={() => setStatus(s)}>
                <Text style={status === s ? styles.chipTextActive : styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRow}>
            {!active?.clock_in && <Button title="Clock In" onPress={clockIn} />}
            {active?.clock_in && !active?.clock_out && <Button title="Clock Out" onPress={clockOut} />}
          </View>

          <Text style={styles.label}>Parts Used (comma separated)</Text>
          <TextInput style={styles.input} value={parts} onChangeText={setParts} />

          <Text style={styles.label}>Photos Before ({photosBefore.length})</Text>
          <Button title="Add Before Photo" onPress={() => takePhoto(setPhotosBefore)} />

          <Text style={styles.label}>Photos After ({photosAfter.length})</Text>
          <Button title="Add After Photo" onPress={() => takePhoto(setPhotosAfter)} />

          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Notes"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={styles.label}>Signature</Text>
          {signature ? (
            <TouchableOpacity onPress={() => setShowSignature(true)}>
              <Text style={{ color: 'green' }}>Signature captured. Tap to redo.</Text>
            </TouchableOpacity>
          ) : (
            <Button title="Add Signature" onPress={() => setShowSignature(true)} />
          )}

          <View style={styles.btnRow}>
            <Button title="Save" onPress={saveWorkOrder} />
            <Button title="Close" onPress={() => setActive(null)} color="red" />
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={showSignature} transparent animationType="slide">
        <View style={styles.signatureContainer}>
          <Signature
            onOK={(img) => {
              setSignature(img);
              setShowSignature(false);
            }}
            onEmpty={() => setShowSignature(false)}
            descriptionText="Sign"
            clearText="Clear"
            confirmText="Save"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { color: '#6b7280', marginTop: 2 },
  badge: { fontSize: 12, fontWeight: 'bold', color: '#374151', backgroundColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeHigh: { backgroundColor: '#fecaca', color: '#991b1b' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 },
  signatureContainer: { flex: 1, backgroundColor: 'white' },
});
