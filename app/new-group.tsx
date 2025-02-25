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
import { useAuth } from '../lib/auth-context';
import { searchUserByEmail } from '../services/users';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function NewGroupScreen() {
  console.log('Page de création de groupe chargée');

  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<
    {
      id: string;
      name: string;
      email?: string;
      isExistingUser?: boolean;
      isInvited?: boolean;
      pending?: boolean;
    }[]
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
        setParticipants([
          {
            id: user.id,
            name: user.name,
            email: user.email,
            isExistingUser: true,
          },
        ]);
      }
    }
  }, [user]);

  const handleSearchUser = async () => {
    if (!newParticipantEmail || !newParticipantEmail.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setIsSearching(true);
      console.log(
        `Recherche de l'utilisateur avec l'email: ${newParticipantEmail}`
      );

      // Vérifier si l'utilisateur existe déjà dans la liste des participants
      const existingParticipant = participants.find(
        (p) => p.email === newParticipantEmail
      );

      if (existingParticipant) {
        Alert.alert(
          'Participant déjà ajouté',
          'Cet utilisateur est déjà dans la liste des participants'
        );
        return;
      }

      // Rechercher l'utilisateur dans la base de données
      const foundUser = await searchUserByEmail(newParticipantEmail);

      if (foundUser) {
        console.log(`Utilisateur trouvé: ${foundUser.name} (${foundUser.id})`);

        // Ajouter l'utilisateur existant à la liste des participants
        setParticipants([
          ...participants,
          {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            isExistingUser: true, // Marquer comme utilisateur existant
          },
        ]);
      } else {
        // Utilisateur non trouvé, créer un participant temporaire
        const tempId = `temp-${Date.now()}`;
        const tempParticipant = {
          id: tempId,
          name: `Invité (${newParticipantEmail})`,
          email: newParticipantEmail,
          pending: true,
          isInvited: true, // Marquer clairement comme invité
        };

        setParticipants([...participants, tempParticipant]);
        console.log(
          `Utilisateur non trouvé, ajout d'un participant temporaire: ${tempParticipant.name}`
        );

        // Créer immédiatement une invitation temporaire
        try {
          // Générer un ID de groupe temporaire si nécessaire
          const tempGroupId = `temp-group-${Date.now()}`;
          const tempGroupName = groupName || 'Nouveau groupe';

          console.log(
            `Création d'une invitation temporaire pour ${newParticipantEmail}`
          );

          // Créer directement l'invitation dans Firestore
          const invitationData = {
            groupId: tempGroupId,
            groupName: tempGroupName,
            recipientEmail: newParticipantEmail,
            senderId: user.id,
            senderName: user.name,
            status: 'pending',
            createdAt: Date.now(),
            isTemporary: true, // Marquer comme temporaire
          };

          console.log(
            `Données de l'invitation: ${JSON.stringify(invitationData)}`
          );

          // Ajouter l'invitation à Firestore
          const invitationsCollection = collection(db, 'invitations');
          const invitationRef = await addDoc(
            invitationsCollection,
            invitationData
          );

          console.log(
            `Invitation temporaire créée avec succès. ID: ${invitationRef.id}`
          );
        } catch (error) {
          console.error(
            `Erreur lors de la création de l'invitation temporaire:`,
            error
          );
          // Continuer malgré l'erreur
        }
      }

      setNewParticipantEmail('');
    } catch (error) {
      console.error("Erreur lors de la recherche de l'utilisateur:", error);
      Alert.alert('Erreur', "Impossible de rechercher l'utilisateur");
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
      console.log('Participants bruts:', JSON.stringify(participants));

      // Séparer EXPLICITEMENT les participants confirmés et en attente
      // Utiliser le flag isInvited pour identifier les invités
      const pendingParticipants = participants.filter(
        (p) => p.isInvited === true
      );

      // IMPORTANT: Filtrer les participants qui ne sont PAS l'utilisateur actuel
      // Tous les autres utilisateurs doivent recevoir une invitation
      const confirmedParticipants = participants.filter(
        (p) => p.id === user.id
      );

      // Tous les autres participants (existants mais pas l'utilisateur actuel) doivent recevoir une invitation
      const existingUsersToInvite = participants.filter(
        (p) => p.isExistingUser === true && p.id !== user.id
      );

      console.log(
        'Participants confirmés (seulement utilisateur actuel):',
        JSON.stringify(confirmedParticipants)
      );
      console.log(
        'Participants en attente (non-existants):',
        JSON.stringify(pendingParticipants)
      );
      console.log(
        'Utilisateurs existants à inviter:',
        JSON.stringify(existingUsersToInvite)
      );

      // Extraire les emails des participants en attente
      const invitedEmails = [
        ...pendingParticipants.map((p) => p.email),
        ...existingUsersToInvite.map((p) => p.email),
      ].filter(Boolean);

      console.log('Emails invités:', invitedEmails);

      // S'assurer que seuls les participants confirmés sont dans le tableau participants
      const groupData = {
        name: groupName,
        participants: confirmedParticipants.map((p) => ({
          id: p.id,
          name: p.name,
        })),
        invitedUsers: invitedEmails, // Mettre les emails des utilisateurs invités ici
        createdBy: user.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        total: 0,
      };

      console.log('Données du groupe FINALES:', JSON.stringify(groupData));

      // Ajouter le groupe à la collection
      const groupsCollection = collection(db, 'groups');
      const docRef = await addDoc(groupsCollection, groupData);
      const groupId = docRef.id;

      console.log(`Groupe créé avec succès. ID: ${groupId}`);

      // Envoyer des invitations à TOUS les participants sauf l'utilisateur actuel
      const allParticipantsToInvite = [
        ...pendingParticipants,
        ...existingUsersToInvite,
      ];

      if (allParticipantsToInvite.length > 0) {
        console.log(
          `=== DÉBUT ENVOI DES INVITATIONS (${allParticipantsToInvite.length} participants) ===`
        );

        for (const participant of allParticipantsToInvite) {
          if (!participant.email) {
            console.log('Participant sans email, invitation ignorée');
            continue;
          }

          try {
            console.log(
              `Tentative d'envoi d'invitation à ${participant.email}`
            );

            // Créer directement l'invitation dans Firestore
            const invitationData = {
              groupId,
              groupName,
              recipientEmail: participant.email,
              recipientId: participant.isExistingUser ? participant.id : null,
              senderId: user.id,
              senderName: user.name,
              status: 'pending',
              createdAt: Date.now(),
            };

            console.log(
              `Données d'invitation: ${JSON.stringify(invitationData)}`
            );

            // Ajouter directement à Firestore
            const invitationsCollection = collection(db, 'invitations');
            const invitationRef = await addDoc(
              invitationsCollection,
              invitationData
            );

            console.log(
              `Invitation créée avec succès. ID: ${invitationRef.id}`
            );
          } catch (error) {
            console.error(
              `Erreur lors de l'envoi de l'invitation à ${participant.email}:`,
              error
            );
          }
        }

        console.log('=== FIN ENVOI DES INVITATIONS ===');
      }

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
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
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
    opacity: 0.7,
  },
  createButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 16,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
