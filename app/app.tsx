import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from '../lib/auth-context';

export default function AppLayout() {
  return (
    <AuthProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2563EB',
          headerStyle: {
            height: 70,
          },
          headerTitleStyle: {
            fontSize: 26,
            fontWeight: '800',
            color: '#111827',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Groupes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Dépenses',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="invitations"
          options={{
            title: 'Invitations',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="mail" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthProvider>
  );
}
