import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../lib/firebase';
import {
  fetchSignInMethodsForEmail,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export default function TestFirebaseScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testAuth = async () => {
    setIsLoading(true);
    addLog("Test de l'authentification Firebase...");

    try {
      // Test 1: Vérifier si l'authentification est initialisée
      addLog(`Auth initialisé: ${!!auth}`);

      // Test 2: Vérifier si l'authentification anonyme fonctionne
      try {
        await signInAnonymously(auth);
        addLog('✅ Authentification anonyme réussie');

        // Se déconnecter après le test
        await signOut(auth);
        addLog('Déconnexion réussie');
      } catch (error) {
        addLog(`❌ Erreur d'authentification anonyme: ${error.message}`);
      }

      // Test 3: Vérifier si fetchSignInMethodsForEmail fonctionne
      try {
        const testEmail = 'test_' + Date.now() + '@example.com';
        const methods = await fetchSignInMethodsForEmail(auth, testEmail);
        addLog(
          `✅ fetchSignInMethodsForEmail réussi: ${methods.length} méthodes trouvées`
        );
      } catch (error) {
        addLog(`❌ Erreur fetchSignInMethodsForEmail: ${error.message}`);
      }
    } catch (error) {
      addLog(`❌ Erreur générale: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFirestore = async () => {
    setIsLoading(true);
    addLog('Test de Firestore...');

    try {
      // Test 1: Vérifier si Firestore est initialisé
      addLog(`Firestore initialisé: ${!!db}`);

      // Test 2: Essayer de lire une collection
      try {
        const querySnapshot = await getDocs(collection(db, 'test_collection'));
        addLog(
          `✅ Lecture Firestore réussie: ${querySnapshot.size} documents trouvés`
        );
      } catch (error) {
        addLog(`❌ Erreur de lecture Firestore: ${error.message}`);
      }
    } catch (error) {
      addLog(`❌ Erreur générale: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    addLog('Écran de test Firebase chargé');
    addLog(
      `Configuration du projet: ${auth?.app?.options?.projectId || 'inconnu'}`
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.title}>Test Firebase</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testAuth}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Tester Auth</Text>
        </Pressable>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testFirestore}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Tester Firestore</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
