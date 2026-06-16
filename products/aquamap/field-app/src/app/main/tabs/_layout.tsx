import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: () => <Text>🗺️</Text> }}
      />
      <Tabs.Screen
        name="assets"
        options={{ title: 'Assets', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tabs.Screen
        name="inspections"
        options={{ title: 'Inspections', tabBarIcon: () => <Text>🔍</Text> }}
      />
      <Tabs.Screen
        name="work-orders"
        options={{ title: 'Work Orders', tabBarIcon: () => <Text>🔧</Text> }}
      />
      <Tabs.Screen
        name="sync"
        options={{ title: 'Sync', tabBarIcon: () => <Text>🔄</Text> }}
      />
    </Tabs>
  );
}
