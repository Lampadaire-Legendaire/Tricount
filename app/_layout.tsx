import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from '../lib/auth-context';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

// Composant pour gérer la protection des routes
function ProtectedRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    console.log('Segments de route actuels:', segments);

    if (!user && inAuthGroup) {
      // Rediriger vers l'écran d'authentification si l'utilisateur n'est pas connecté
      console.log('Redirection vers /auth - Utilisateur non connecté');
      router.replace('/auth');
    } else if (
      user &&
      !inAuthGroup &&
      segments[0] !== 'new-group' &&
      segments[0] !== 'edit-group' &&
      segments[0] !== 'new-expense'
    ) {
      // Rediriger vers l'écran principal si l'utilisateur est connecté
      // mais ne pas rediriger s'il est sur une page modale
      console.log('Redirection vers /(tabs) - Utilisateur connecté');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Composant principal
export default function RootLayout() {
  useEffect(() => {
    window.frameworkReady?.();
  }, []);

  return (
    <AuthProvider>
      <ProtectedRouteGuard>
        <View style={styles.container}>
          <StatusBar style="dark" backgroundColor="#fff" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: '#fff',
                ...Platform.select({
                  android: {
                    paddingTop: Constants.statusBarHeight || 0,
                  },
                }),
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="new-group"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="edit-group"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="new-expense"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="test-firebase"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="test-invitations"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="firebase-setup"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="firebase-test"
              options={{
                presentation: 'modal',
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </View>
      </ProtectedRouteGuard>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#2563EB',
  },
});
