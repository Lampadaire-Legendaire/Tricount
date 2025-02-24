import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

export default function FirebaseTestScreen() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testFirebaseConnection = async () => {
    try {
      setIsLoading(true);
      setResult('Test de connexion à Firebase...\n');

      // Test 1: Vérifier si on peut lire la collection 'users'
      setResult((prev) => prev + 'Test 1: Lecture de la collection users...\n');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setResult(
        (prev) =>
          prev + `Résultat: ${usersSnapshot.size} utilisateurs trouvés\n\n`
      );

      // Test 2: Vérifier si on peut lire la collection 'groups'
      setResult(
        (prev) => prev + 'Test 2: Lecture de la collection groups...\n'
      );
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      setResult(
        (prev) => prev + `Résultat: ${groupsSnapshot.size} groupes trouvés\n\n`
      );

      // Test 3: Essayer de créer un document dans une collection existante
      setResult(
        (prev) =>
          prev + "Test 3: Création d'un document dans la collection users...\n"
      );
      const testUserDoc = {
        name: 'Test User',
        email: 'test-' + Date.now() + '@example.com',
        createdAt: Date.now(),
      };
      const userDocRef = await addDoc(collection(db, 'users'), testUserDoc);
      setResult(
        (prev) => prev + `Résultat: Document créé avec ID ${userDocRef.id}\n\n`
      );

      // Test 4: Essayer de créer un document dans la collection 'invitations'
      setResult(
        (prev) =>
          prev +
          "Test 4: Création d'un document dans la collection invitations...\n"
      );
      const testInvitationDoc = {
        groupId: 'test-group-' + Date.now(),
        groupName: 'Test Group',
        recipientEmail: 'test-' + Date.now() + '@example.com',
        senderId: 'test-sender',
        senderName: 'Test Sender',
        status: 'pending',
        createdAt: Date.now(),
      };

      try {
        const invitationDocRef = await addDoc(
          collection(db, 'invitations'),
          testInvitationDoc
        );
        setResult(
          (prev) =>
            prev + `Résultat: Document créé avec ID ${invitationDocRef.id}\n\n`
        );
      } catch (error) {
        setResult((prev) => prev + `Erreur: ${error.message}\n\n`);

        // Test 5: Essayer avec setDoc
        setResult(
          (prev) =>
            prev +
            'Test 5: Création avec setDoc dans la collection invitations...\n'
        );
        try {
          const docId = 'test-invitation-' + Date.now();
          await setDoc(doc(db, 'invitations', docId), testInvitationDoc);
          setResult(
            (prev) => prev + `Résultat: Document créé avec ID ${docId}\n\n`
          );
        } catch (error) {
          setResult((prev) => prev + `Erreur: ${error.message}\n\n`);
        }
      }

      setResult((prev) => prev + 'Tests terminés.\n');
    } catch (error) {
      setResult((prev) => prev + `Erreur générale: ${error.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.title}>Test Firebase</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Cette page teste la connexion à Firebase et les permissions pour créer
          des documents.
        </Text>

        <Pressable
          style={styles.button}
          onPress={testFirebaseConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Exécuter les tests</Text>
        </Pressable>

        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Résultat:</Text>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#2563EB"
              style={styles.loader}
            />
          )}
          <ScrollView style={styles.resultScroll}>
            <Text style={styles.resultText}>{result}</Text>
          </ScrollView>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  resultScroll: {
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
  loader: {
    marginVertical: 8,
  },
});
