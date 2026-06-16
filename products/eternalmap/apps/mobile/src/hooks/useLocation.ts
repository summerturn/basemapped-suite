import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { AppState, type AppStateStatus } from 'react-native';

export interface LocationState {
  position: Location.LocationObject | null;
  error: string | null;
  permissionGranted: boolean;
  isWatching: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    position: null,
    error: null,
    permissionGranted: false,
    isWatching: false,
  });

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setState(prev => ({ ...prev, permissionGranted: granted }));
      return granted;
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message, permissionGranted: false }));
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<Location.LocationObject> => {
    const granted = await requestPermission();
    if (!granted) {
      throw new Error('Location permission not granted');
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    setState(prev => ({ ...prev, position: pos, error: null }));
    return pos;
  }, [requestPermission]);

  const centerOnMe = useCallback(async (): Promise<{ latitude: number; longitude: number }> => {
    const pos = await getCurrentPosition();
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }, [getCurrentPosition]);

  const startWatching = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    watchSubscription.current?.remove();
    watchSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (pos) => {
        setState(prev => ({ ...prev, position: pos, error: null }));
      }
    );

    setState(prev => ({ ...prev, isWatching: true }));
  }, [requestPermission]);

  const stopWatching = useCallback(() => {
    watchSubscription.current?.remove();
    watchSubscription.current = null;
    setState(prev => ({ ...prev, isWatching: false }));
  }, []);

  // Background location handling (start/stop with app state)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Optionally stop watching to save battery, or keep for background tracking
        // stopWatching();
      } else if (nextAppState === 'active') {
        // startWatching();
      }
    });

    return () => {
      subscription.remove();
      stopWatching();
    };
  }, [stopWatching]);

  return {
    ...state,
    requestPermission,
    getCurrentPosition,
    centerOnMe,
    watchPosition: startWatching,
    stopWatching,
  };
}
