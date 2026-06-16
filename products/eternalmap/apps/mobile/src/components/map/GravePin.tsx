import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export interface GravePinData {
  id: string;
  name: string;
  dates?: string;
  status: string;
  coordinate: { latitude: number; longitude: number };
}

interface GravePinProps {
  grave: GravePinData;
  isSelected?: boolean;
  onPress?: (grave: GravePinData) => void;
}

export function GravePin({ grave, isSelected = false, onPress }: GravePinProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showTooltip, setShowTooltip] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 2 }, () => {
      scale.value = withSpring(1);
    });
    setShowTooltip(true);
    onPress?.(grave);
  }, [grave, onPress, scale]);

  const pinColor = isSelected ? '#2196F3' : '#607D8B';

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Animated.View
          style={[
            styles.pinContainer,
            isSelected && styles.selectedContainer,
            animatedStyle,
          ]}
        >
          <View style={[styles.pinHead, { backgroundColor: pinColor }]}>
            <Text style={styles.pinInitial}>{grave.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={[styles.pinTail, { borderTopColor: pinColor }]} />
          {isSelected && <View style={styles.pulseRing} />}
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable style={styles.tooltipOverlay} onPress={() => setShowTooltip(false)}>
          <View style={[styles.tooltip, isDark && styles.tooltipDark]}>
            <Text style={[styles.tooltipName, isDark && styles.textDark]}>{grave.name}</Text>
            {grave.dates && (
              <Text style={[styles.tooltipDates, isDark && styles.textMutedDark]}>{grave.dates}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(grave.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(grave.status) }]}>
                {grave.status}
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'occupied':
      return '#F44336';
    case 'available':
      return '#4CAF50';
    case 'reserved':
      return '#FFC107';
    default:
      return '#9E9E9E';
  }
}

const styles = StyleSheet.create({
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 44,
  },
  selectedContainer: {
    zIndex: 10,
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
  },
  pinInitial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  pinTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -4,
    zIndex: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(33,150,243,0.4)',
    zIndex: 0,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tooltipDark: {
    backgroundColor: '#2c2c2e',
  },
  tooltipName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  tooltipDates: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  textDark: {
    color: '#eee',
  },
  textMutedDark: {
    color: '#888',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
