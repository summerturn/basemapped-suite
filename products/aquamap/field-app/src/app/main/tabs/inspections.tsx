import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, Button, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { useLocation } from '@/hooks/useLocation';
import Signature from 'react-native-signature-canvas';
import { queueChange } from '@/services/sync/sync-service';

interface Inspection {
  id: string;
  asset_id: string;
  type: string;
  status: string;
  due_date: string;
  form_data: string;
  photos: string;
  signature: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  notes: string | null;
}

const FORM_TEMPLATES: Record<string, any[]> = {
  valve: [
    { name: 'pressure', label: 'Pressure (psi)', type: 'number' },
    { name: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Fair', 'Poor'] },
    { name: 'leaking', label: 'Leaking', type: 'boolean' },
  ],
  hydrant: [
    { name: 'flow_rate', label: 'Flow Rate (GPM)', type: 'number' },
    { name: 'paint', label: 'Paint Condition', type: 'select', options: ['Good', 'Faded', 'Chipped'] },
  ],
  default: [
    { name: 'general_condition', label: 'General Condition', type: 'select', options: ['Good', 'Fair', 'Poor'] },
    { name: 'comments', label: 'Comments', type: 'text' },
  ],
};

export default function InspectionsScreen() {
  const db = useSQLiteContext();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const { getCurrentPosition } = useLocation();

  const loadInspections = useCallback(async () => {
    const rows = await db.getAllAsync<Inspection>('SELECT * FROM inspections ORDER BY due_date ASC');
    setInspections(rows);
  }, [db]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const today = new Date().toISOString().split('T')[0];
  const dueToday = inspections.filter((i) => i.due_date === today && i.status !== 'completed');
  const overdue = inspections.filter((i) => i.due_date < today && i.status !== 'completed');
  const upcoming = inspections.filter((i) => i.due_date > today && i.status !== 'completed');

  const openInspection = (inspection: Inspection) => {
    setActiveInspection(inspection);
    const existing = inspection.form_data ? JSON.parse(inspection.form_data) : {};
    setFormValues(existing);
    setNotes(inspection.notes || '');
    setPhotos(inspection.photos ? JSON.parse(inspection.photos) : []);
    setSignature(inspection.signature);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0].base64) {
      setPhotos((prev) => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const saveDraft = async () => {
    if (!activeInspection) return;
    const formDataStr = JSON.stringify(formValues);
    await db.runAsync(
      'UPDATE inspections SET form_data = ?, photos = ?, notes = ?, signature = ?, status = ? WHERE id = ?',
      [formDataStr, JSON.stringify(photos), notes, signature, 'draft', activeInspection.id]
    );
    setActiveInspection(null);
    loadInspections();
  };

  const submitInspection = async () => {
    if (!activeInspection) return;
    const loc = await getCurrentPosition();
    const formDataStr = JSON.stringify(formValues);
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE inspections SET form_data = ?, photos = ?, notes = ?, signature = ?, gps_lat = ?, gps_lon = ?, status = ?, completed_at = ? WHERE id = ?',
      [formDataStr, JSON.stringify(photos), notes, signature, loc?.latitude || null, loc?.longitude || null, 'completed', now, activeInspection.id]
    );
    await queueChange(db, 'inspections', activeInspection.id, 'UPDATE', {
      id: activeInspection.id,
      form_data: formValues,
      photos,
      notes,
      signature,
      gps_lat: loc?.latitude,
      gps_lon: loc?.longitude,
      status: 'completed',
      completed_at: now,
    });
    setActiveInspection(null);
    loadInspections();
  };

  const renderField = (field: any) => {
    if (field.type === 'number') {
      return (
        <TextInput
          key={field.name}
          style={styles.input}
          placeholder={field.label}
          keyboardType="numeric"
          value={String(formValues[field.name] || '')}
          onChangeText={(text) => setFormValues((prev) => ({ ...prev, [field.name]: text }))}
        />
      );
    }
    if (field.type === 'text') {
      return (
        <TextInput
          key={field.name}
          style={styles.input}
          placeholder={field.label}
          value={String(formValues[field.name] || '')}
          onChangeText={(text) => setFormValues((prev) => ({ ...prev, [field.name]: text }))}
        />
      );
    }
    if (field.type === 'select') {
      return (
        <View key={field.name} style={styles.selectRow}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {field.options.map((opt: string) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, formValues[field.name] === opt && styles.chipActive]}
                onPress={() => setFormValues((prev) => ({ ...prev, [field.name]: opt }))}
              >
                <Text style={formValues[field.name] === opt ? styles.chipTextActive : styles.chipText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    if (field.type === 'boolean') {
      return (
        <View key={field.name} style={styles.selectRow}>
          <Text style={styles.label}>{field.label}</Text>
          <TouchableOpacity
            style={[styles.chip, formValues[field.name] === true && styles.chipActive]}
            onPress={() => setFormValues((prev) => ({ ...prev, [field.name]: !prev[field.name] }))}
          >
            <Text style={formValues[field.name] === true ? styles.chipTextActive : styles.chipText}>
              {formValues[field.name] ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderSection = (title: string, data: Inspection[]) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
      {data.map((item) => (
        <TouchableOpacity key={item.id} style={styles.card} onPress={() => openInspection(item)}>
          <Text style={styles.cardTitle}>{item.type.toUpperCase()} - {item.id}</Text>
          <Text style={styles.cardSub}>Due: {item.due_date}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const fields = FORM_TEMPLATES[activeInspection?.type || ''] || FORM_TEMPLATES.default;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {renderSection('Overdue', overdue)}
        {renderSection('Due Today', dueToday)}
        {renderSection('Upcoming', upcoming)}
      </ScrollView>

      <Modal visible={!!activeInspection} animationType="slide">
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.modalTitle}>Inspection: {activeInspection?.id}</Text>
          {fields.map(renderField)}
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Notes"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          <Text style={styles.label}>Photos ({photos.length})</Text>
          <Button title="Take Photo" onPress={takePhoto} />
          <Text style={styles.label}>Signature</Text>
          {signature ? (
            <TouchableOpacity onPress={() => setShowSignature(true)}>
              <Text style={{ color: 'green' }}>Signature captured. Tap to redo.</Text>
            </TouchableOpacity>
          ) : (
            <Button title="Add Signature" onPress={() => setShowSignature(true)} />
          )}
          <View style={styles.btnRow}>
            <Button title="Save Draft" onPress={saveDraft} />
            <Button title="Submit" onPress={submitInspection} />
          </View>
          <Button title="Close" onPress={() => setActiveInspection(null)} color="red" />
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSub: { color: '#6b7280' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#fff' },
  label: { fontWeight: '600', marginBottom: 6, marginTop: 8 },
  selectRow: { marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 6, marginBottom: 6 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  signatureContainer: { flex: 1, backgroundColor: 'white' },
});
