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
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createInvitation,
  getPendingInvitationsForUser,
} from '../services/invitations';

export default function TestInvitationsScreen() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [groupName, setGroupName] = useState('Groupe de test');
  const [groupId, setGroupId] = useState('test-group-' + Date.now());
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

      // Afficher des détails sur l'erreur
      if (error.code) {
        setResult((prev) => prev + `Code d'erreur: ${error.code}\n`);
      }

      if (error.name) {
        setResult((prev) => prev + `Type d'erreur: ${error.name}\n`);
      }
    }
  };

  const handleSendInvitation = async () => {
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
      setResult("Envoi de l'invitation avec le nouveau service...\n");

      // Envoyer l'invitation avec le nouveau service
      const invitationId = await createInvitation(
        groupId,
        groupName,
        recipientEmail,
        user.id,
        user.name
      );

      setResult(
        (prev) => prev + `Invitation envoyée avec succès. ID: ${invitationId}\n`
      );

      // Vérifier que l'invitation a été créée
      await checkInvitation(invitationId);

      Alert.alert('Succès', `Invitation envoyée à ${recipientEmail}`);
    } catch (error) {
      console.error('Erreur lors du test:', error);
      setResult((prev) => prev + `Erreur: ${error.message}\n`);

      // Afficher des détails sur l'erreur
      if (error.code) {
        setResult((prev) => prev + `Code d'erreur: ${error.code}\n`);
      }

      Alert.alert(
        'Erreur',
        `Impossible d'envoyer l'invitation: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkInvitation = async (invitationId: string) => {
    try {
      setResult(
        (prev) =>
          prev + `Vérification de l'invitation avec ID: ${invitationId}...\n`
      );

      // Vérifier directement le document
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        setResult((prev) => prev + `Aucune invitation trouvée avec cet ID.\n`);
      } else {
        const data = invitationDoc.data();
        setResult((prev) => prev + `Invitation trouvée:\n`);
        setResult(
          (prev) =>
            prev +
            `- ID: ${invitationId}\n` +
            `- Groupe: ${data.groupName}\n` +
            `- De: ${data.senderName}\n` +
            `- À: ${data.recipientEmail}\n` +
            `- Statut: ${data.status}\n` +
            `- Créée le: ${
              data.createdAt
                ? new Date(data.createdAt.toDate()).toLocaleString()
                : 'N/A'
            }\n`
        );
      }
    } catch (error) {
      setResult(
        (prev) => prev + `Erreur lors de la vérification: ${error.message}\n`
      );
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

      const invitations = await getPendingInvitationsForUser(user.id);

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

  const openFirebaseConsole = () => {
    Linking.openURL('https://console.firebase.google.com/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            console.log("Retour à l'écran précédent");
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.title}>Test des Invitations</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Nouveau service d'invitations</Text>
          <Text style={styles.infoText}>
            Un nouveau service dédié aux invitations a été créé pour résoudre
            les problèmes de création. Utilisez les fonctions ci-dessous pour
            tester le nouveau service.
          </Text>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: '#DC2626', marginTop: 10 },
            ]}
            onPress={openFirebaseConsole}
          >
            <Text style={styles.buttonText}>Ouvrir la console Firebase</Text>
          </Pressable>
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
          <Text style={styles.sectionTitle}>2. Envoyer une Invitation</Text>
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
            onPress={handleSendInvitation}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Envoyer l'invitation</Text>
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
