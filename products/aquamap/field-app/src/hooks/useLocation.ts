import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied');
      return false;
    }
    return true;
  }, []);

  const getCurrentPosition = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };
      setLocation(coords);
      return coords;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [requestPermission]);

  const watchPosition = useCallback(async (callback?: (loc: LocationState) => void) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;
    setWatching(true);
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
        setLocation(coords);
        callback?.(coords);
      }
    );
    return () => {
      setWatching(false);
      subscription.remove();
    };
  }, [requestPermission]);

  return { location, error, watching, requestPermission, getCurrentPosition, watchPosition };
}
