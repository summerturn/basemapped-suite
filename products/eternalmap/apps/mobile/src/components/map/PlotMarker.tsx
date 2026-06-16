import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export interface PlotMarkerData {
  id: string;
  plotNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'unavailable';
  sectionName?: string;
  areaSqft?: number;
  maxOccupancy?: number;
  price?: number;
  notes?: string;
}

interface PlotMarkerProps {
  plot: PlotMarkerData;
  onPress?: (plot: PlotMarkerData) => void;
  onLongPress?: (plot: PlotMarkerData) => void;
  onSave?: (plot: PlotMarkerData) => void;
  isSelected?: boolean;
}

const STATUS_COLORS = {
  available: '#4CAF50',
  occupied: '#F44336',
  reserved: '#FFC107',
  maintenance: '#9E9E9E',
  unavailable: '#424242',
};

const STATUS_LABELS = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Maintenance',
  unavailable: 'Unavailable',
};

export function PlotMarker({ plot, onPress, onLongPress, onSave, isSelected = false }: PlotMarkerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showSheet, setShowSheet] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedNotes, setEditedNotes] = useState(plot.notes ?? '');

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 2 }, () => {
      scale.value = withSpring(1);
    });
    setShowSheet(true);
    onPress?.(plot);
  }, [plot, onPress, scale]);

  const handleLongPress = useCallback(() => {
    setEditMode(true);
    setShowSheet(true);
    onLongPress?.(plot);
  }, [plot, onLongPress]);

  const handleSave = useCallback(() => {
    onSave?.({ ...plot, notes: editedNotes });
    setEditMode(false);
  }, [editedNotes, onSave, plot]);

  const statusColor = STATUS_COLORS[plot.status];

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        accessibilityLabel={`Plot ${plot.plotNumber}, ${STATUS_LABELS[plot.status]}`}
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.marker,
            { borderColor: statusColor, backgroundColor: isDark ? '#1c1c1e' : '#fff' },
            isSelected && { borderWidth: 3, shadowColor: statusColor },
            animatedStyle,
          ]}
        >
          <Text style={[styles.label, { color: statusColor }]}>{plot.plotNumber}</Text>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSheet(false);
          setEditMode(false);
        }}
      >
        <Pressable style={styles.overlay} onPress={() => { setShowSheet(false); setEditMode(false); }}>
          <View
            style={[styles.sheet, isDark && styles.sheetDark]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.header}>
              <Text style={[styles.title, isDark && styles.textDark]}>Plot {plot.plotNumber}</Text>
              <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABELS[plot.status]}</Text>
              </View>
            </View>

            <View style={styles.details}>
              {plot.sectionName && (
                <Text style={[styles.detailText, isDark && styles.textDark]}>
                  Section: {plot.sectionName}
                </Text>
              )}
              {plot.areaSqft && (
                <Text style={[styles.detailText, isDark && styles.textDark]}>
                  Area: {plot.areaSqft.toLocaleString()} sq ft
                </Text>
              )}
              {plot.maxOccupancy && (
                <Text style={[styles.detailText, isDark && styles.textDark]}>
                  Max Occupancy: {plot.maxOccupancy}
                </Text>
              )}
              {plot.price && (
                <Text style={[styles.detailText, isDark && styles.textDark]}>
                  Price: ${plot.price.toLocaleString()}
                </Text>
              )}
            </View>

            {editMode ? (
              <View style={styles.editSection}>
                <Text style={[styles.labelText, isDark && styles.textDark]}>Notes</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Add notes..."
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              plot.notes && (
                <View style={styles.notesSection}>
                  <Text style={[styles.labelText, isDark && styles.textDark]}>Notes</Text>
                  <Text style={[styles.notesText, isDark && styles.textDark]}>{plot.notes}</Text>
                </View>
              )
            )}

            {!editMode && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditMode(true)}
              >
                <Text style={styles.editButtonText}>Edit Plot</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    maxHeight: '70%',
  },
  sheetDark: {
    backgroundColor: '#1c1c1e',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  textDark: {
    color: '#eee',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  notesSection: {
    marginBottom: 16,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  editSection: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fafafa',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  inputDark: {
    borderColor: '#444',
    color: '#eee',
    backgroundColor: '#2c2c2e',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  editButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 15,
  },
});
