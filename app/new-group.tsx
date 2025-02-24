import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../services/groups';
import { useAuth } from '../lib/auth-context';
import { searchUserByEmail } from '../services/users';

export default function NewGroupScreen() {
  console.log('Page de création de groupe chargée');

  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<
    { id: string; name: string; email?: string }[]
  >([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  // Ajouter automatiquement l'utilisateur actuel comme participant
  useEffect(() => {
    if (user) {
      // Vérifier si l'utilisateur est déjà dans la liste
      if (!participants.some((p) => p.id === user.id)) {
        setParticipants([{ id: user.id, name: user.name, email: user.email }]);
      }
    }
  }, [user]);

  const handleSearchUser = async () => {
    if (!newParticipantEmail.trim() || !newParticipantEmail.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    // Vérifier si l'email est déjà dans la liste
    if (participants.some((p) => p.email === newParticipantEmail.trim())) {
      Alert.alert('Information', 'Cet utilisateur est déjà dans le groupe');
      return;
    }

    try {
      setIsSearching(true);
      const foundUser = await searchUserByEmail(newParticipantEmail.trim());

      if (foundUser) {
        setParticipants([
          ...participants,
          {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
          },
        ]);
        setNewParticipantEmail('');
        Alert.alert('Succès', `${foundUser.name} a été ajouté au groupe`);
      } else {
        // Si l'utilisateur n'existe pas, proposer d'envoyer une invitation
        Alert.alert(
          'Utilisateur non trouvé',
          'Voulez-vous inviter cet utilisateur par email?',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Inviter',
              onPress: () => {
                // Ajouter un utilisateur temporaire en attendant qu'il s'inscrive
                const newParticipant = {
                  id: `temp-${Date.now()}`,
                  name: newParticipantEmail.split('@')[0], // Utiliser la partie avant @ comme nom temporaire
                  email: newParticipantEmail.trim(),
                  pending: true,
                };
                setParticipants([...participants, newParticipant]);
                setNewParticipantEmail('');
                // Ici on pourrait implémenter l'envoi d'un email d'invitation
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de l'utilisateur:", error);
      Alert.alert('Erreur', 'Impossible de rechercher cet utilisateur');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveParticipant = (id: string) => {
    // Ne pas permettre la suppression de l'utilisateur actuel
    if (user && id === user.id) {
      Alert.alert(
        'Action non autorisée',
        'Vous ne pouvez pas vous retirer du groupe'
      );
      return;
    }

    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de groupe');
      return;
    }

    if (participants.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un participant');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Création du groupe:', groupName);
      console.log('Participants:', participants);

      // Séparer les participants confirmés et en attente
      const participantsWithStatus = participants.map((p) => ({
        ...p,
        pending: p.id === 'temp-${Date.now()}', // Marquer les participants temporaires comme en attente
      }));

      console.log('Participants avec statut:', participantsWithStatus);

      // Créer le groupe avec le service
      const groupId = await createGroup(groupName, participantsWithStatus);
      console.log('Groupe créé avec succès. ID:', groupId);

      Alert.alert('Succès', 'Le groupe a été créé avec succès', [
        {
          text: 'OK',
          onPress: () => {
            // Rediriger vers l'écran d'accueil avec un paramètre pour rafraîchir la liste
            router.replace({
              pathname: '/(tabs)',
              params: { refresh: Date.now().toString() },
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.title}>Nouveau Groupe</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Vacances à la montagne"
            value={groupName}
            onChangeText={setGroupName}
            autoFocus
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ajouter des participants par email</Text>
          <View style={styles.participantInputContainer}>
            <TextInput
              style={styles.participantInput}
              placeholder="Email du participant"
              value={newParticipantEmail}
              onChangeText={setNewParticipantEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onSubmitEditing={handleSearchUser}
            />
            <Pressable
              onPress={handleSearchUser}
              style={styles.addButton}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={24} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        <Text style={styles.participantsTitle}>
          Participants ({participants.length})
        </Text>

        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.participantItem}>
              <View>
                <Text style={styles.participantName}>{item.name}</Text>
                {item.email && (
                  <Text style={styles.participantEmail}>{item.email}</Text>
                )}
                {item.pending && (
                  <Text style={styles.pendingLabel}>
                    En attente d'inscription
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => handleRemoveParticipant(item.id)}
                style={styles.removeButton}
                disabled={user && item.id === user.id}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={user && item.id === user.id ? '#D1D5DB' : '#EF4444'}
                />
              </Pressable>
            </View>
          )}
          style={styles.participantList}
        />

        <Pressable
          style={[
            styles.createButton,
            (!groupName.trim() || participants.length < 2) &&
              styles.disabledButton,
          ]}
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || participants.length < 2 || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Créer le groupe</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  form: {
    padding: 16,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  participantInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  participantInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2563EB',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  participantList: {
    flex: 1,
    marginBottom: 16,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  participantEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 4,
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  createButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
