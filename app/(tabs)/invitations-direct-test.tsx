import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

export default function InvitationsDirectTestScreen() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [groupName, setGroupName] = useState('Groupe de test direct');
  const [groupId, setGroupId] = useState('test-group-direct-' + Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    // Vérifier si la collection 'invitations' existe déjà
    checkInvitationsCollection();
  }, []);

  const checkInvitationsCollection = async () => {
    try {
      setResult('Vérification de la collection invitations...\n');
      const invitationsRef = collection(db, 'invitations');
      const snapshot = await getDocs(invitationsRef);

      setResult(
        (prev) =>
          prev +
          `Collection invitations: ${
            snapshot.empty ? 'vide' : snapshot.size + ' documents trouvés'
          }\n`
      );
    } catch (error) {
      setResult(
        (prev) =>
          prev +
          `Erreur lors de la vérification de la collection: ${error.message}\n`
      );
    }
  };

  const createInvitationDirectly = async () => {
    if (!user) {
      setResult('Erreur: Utilisateur non connecté\n');
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setResult('Erreur: Email invalide\n');
      return;
    }

    try {
      setIsLoading(true);
      setResult("Création directe d'une invitation...\n");

      const invitationData = {
        groupId,
        groupName,
        recipientEmail,
        senderId: user.id,
        senderName: user.name,
        status: 'pending',
        createdAt: Date.now(),
      };

      setResult(
        (prev) =>
          prev +
          `Données de l'invitation: ${JSON.stringify(invitationData)}\n\n`
      );

      // Méthode 1: addDoc
      try {
        const invitationsCollection = collection(db, 'invitations');
        const docRef = await addDoc(invitationsCollection, invitationData);
        setResult(
          (prev) =>
            prev + `Invitation créée avec succès (addDoc). ID: ${docRef.id}\n`
        );

        // Vérifier que l'invitation a été créée
        const docSnap = await getDoc(doc(db, 'invitations', docRef.id));
        if (docSnap.exists()) {
          setResult(
            (prev) =>
              prev + `Vérification: l'invitation existe dans Firestore\n`
          );
        } else {
          setResult(
            (prev) =>
              prev + `Erreur: l'invitation n'a pas été créée correctement\n`
          );
        }
      } catch (error) {
        setResult((prev) => prev + `Erreur avec addDoc: ${error.message}\n\n`);

        // Méthode 2: setDoc
        try {
          const invitationId = 'direct-invitation-' + Date.now();
          await setDoc(doc(db, 'invitations', invitationId), invitationData);
          setResult(
            (prev) =>
              prev +
              `Invitation créée avec succès (setDoc). ID: ${invitationId}\n`
          );

          // Vérifier que l'invitation a été créée
          const docSnap = await getDoc(doc(db, 'invitations', invitationId));
          if (docSnap.exists()) {
            setResult(
              (prev) =>
                prev + `Vérification: l'invitation existe dans Firestore\n`
            );
          } else {
            setResult(
              (prev) =>
                prev + `Erreur: l'invitation n'a pas été créée correctement\n`
            );
          }
        } catch (error) {
          setResult(
            (prev) => prev + `Erreur avec setDoc: ${error.message}\n\n`
          );
        }
      }

      // Vérifier si la collection existe
      const invitationsSnapshot = await getDocs(collection(db, 'invitations'));
      setResult(
        (prev) =>
          prev +
          `\nVérification: ${invitationsSnapshot.size} invitations trouvées dans la collection\n`
      );

      Alert.alert(
        'Résultat',
        'Vérifiez les résultats dans la section ci-dessous'
      );
    } catch (error) {
      setResult((prev) => prev + `Erreur générale: ${error.message}\n`);
      Alert.alert('Erreur', `Une erreur est survenue: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkMyInvitations = async () => {
    if (!user) {
      setResult('Erreur: Utilisateur non connecté\n');
      return;
    }

    try {
      setIsLoading(true);
      setResult(
        `Vérification des invitations pour l'utilisateur ${user.id}...\n`
      );

      // Requête pour les invitations par ID utilisateur
      const qById = query(
        collection(db, 'invitations'),
        where('recipientId', '==', user.id),
        where('status', '==', 'pending')
      );

      // Requête pour les invitations par email
      const qByEmail = query(
        collection(db, 'invitations'),
        where('recipientEmail', '==', user.email),
        where('status', '==', 'pending')
      );

      const [snapshotById, snapshotByEmail] = await Promise.all([
        getDocs(qById),
        getDocs(qByEmail),
      ]);

      setResult(
        (prev) => prev + `Invitations trouvées par ID: ${snapshotById.size}\n`
      );
      setResult(
        (prev) =>
          prev + `Invitations trouvées par email: ${snapshotByEmail.size}\n\n`
      );

      const invitations = [];

      // Ajouter les invitations par ID
      snapshotById.forEach((doc) => {
        invitations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Ajouter les invitations par email qui ne sont pas déjà incluses
      snapshotByEmail.forEach((doc) => {
        const invitation = {
          id: doc.id,
          ...doc.data(),
        };

        if (!invitations.some((inv) => inv.id === invitation.id)) {
          invitations.push(invitation);
        }
      });

      if (invitations.length === 0) {
        setResult((prev) => prev + 'Aucune invitation en attente.\n');
      } else {
        setResult(
          (prev) => prev + `${invitations.length} invitation(s) en attente:\n`
        );
        invitations.forEach((inv) => {
          setResult(
            (prev) =>
              prev +
              `- ID: ${inv.id}, Groupe: ${inv.groupName}, De: ${inv.senderName}\n`
          );
        });
      }
    } catch (error) {
      setResult(
        (prev) => prev + `Erreur lors de la vérification: ${error.message}\n`
      );
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
        <Text style={styles.title}>Test Direct des Invitations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Test direct des invitations</Text>
          <Text style={styles.infoText}>
            Cette page teste la création directe d'invitations dans Firestore.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Vérifier la Collection</Text>
          <Pressable
            style={styles.button}
            onPress={checkInvitationsCollection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              Vérifier Collection Invitations
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Créer une Invitation</Text>
          <Text style={styles.label}>Email du destinataire</Text>
          <TextInput
            style={styles.input}
            value={recipientEmail}
            onChangeText={setRecipientEmail}
            placeholder="exemple@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nom du groupe"
          />

          <Text style={styles.label}>ID du groupe</Text>
          <TextInput
            style={styles.input}
            value={groupId}
            onChangeText={setGroupId}
            placeholder="ID du groupe"
          />

          <Pressable
            style={styles.button}
            onPress={createInvitationDirectly}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Créer l'invitation</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Vérifier Mes Invitations</Text>
          <Pressable
            style={styles.button}
            onPress={checkMyInvitations}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Vérifier mes invitations</Text>
          </Pressable>
        </View>

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

          <Pressable
            style={[
              styles.button,
              { marginTop: 10, backgroundColor: '#6B7280' },
            ]}
            onPress={() => setResult('')}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Effacer les résultats</Text>
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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
    minHeight: 200,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  resultScroll: {
    maxHeight: 300,
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
