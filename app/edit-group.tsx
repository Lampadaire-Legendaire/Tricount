import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getGroupById,
  updateGroup,
  deleteGroup,
  removeEditorFromGroup,
} from '../services/groups';
import { searchUserByEmail } from '../services/users';
import { useAuth } from '../lib/auth-context';
import type { Group } from '../types/group';
import { sendInvitation } from '../services/invitations';

export default function EditGroupScreen() {
  const params = useLocalSearchParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();

  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<
    { id: string; name: string }[]
  >([]);
  const [editors, setEditors] = useState<
    { id: string; name: string; email?: string }[]
  >([]);
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showEditorsSection, setShowEditorsSection] = useState(false);

  useEffect(() => {
    console.log('EditGroupScreen - params:', JSON.stringify(params));
    console.log('EditGroupScreen - groupId:', groupId);

    if (groupId) {
      loadGroup();
    } else {
      setError('ID de groupe manquant');
      setIsLoading(false);
    }
  }, [groupId]);

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Chargement du groupe ${groupId}...`);

      const fetchedGroup = await getGroupById(groupId);
      console.log('Groupe récupéré:', fetchedGroup);

      if (!fetchedGroup) {
        throw new Error('Groupe non trouvé');
      }

      setGroup(fetchedGroup);
      setGroupName(fetchedGroup.name);

      // Vérifier si l'utilisateur actuel est le créateur du groupe
      if (user && fetchedGroup.createdBy === user.id) {
        setIsCreator(true);
        setShowEditorsSection(true);
      }

      // Utiliser les participants du groupe
      if (
        fetchedGroup.participants &&
        Array.isArray(fetchedGroup.participants)
      ) {
        setParticipants(fetchedGroup.participants);
      } else {
        // Initialiser avec un tableau vide si aucun participant n'est trouvé
        setParticipants([]);
      }

      // Utiliser les éditeurs du groupe
      if (fetchedGroup.editors && Array.isArray(fetchedGroup.editors)) {
        setEditors(fetchedGroup.editors);
      } else {
        // Initialiser avec un tableau vide si aucun éditeur n'est trouvé
        setEditors([]);
      }

      console.log('Groupe chargé avec succès:', fetchedGroup.name);
    } catch (err) {
      console.error('Erreur lors de la récupération du groupe:', err);
      setError('Impossible de charger le groupe');
      Alert.alert('Erreur', 'Impossible de charger les informations du groupe');
    } finally {
      setIsLoading(false);
    }
  };

  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: `participant_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        name: '',
      },
    ]);
  };

  const updateParticipantName = (text: string, index: number) => {
    const newParticipants = [...participants];
    newParticipants[index] = {
      ...newParticipants[index],
      name: text,
    };
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) {
      Alert.alert('Erreur', 'Un groupe doit avoir au moins un participant');
      return;
    }

    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
  };

  const handleSearchUser = async () => {
    if (!newEditorEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email');
      return;
    }

    try {
      setIsSearchingUser(true);
      const foundUser = await searchUserByEmail(newEditorEmail);

      if (!foundUser) {
        Alert.alert(
          'Utilisateur non trouvé',
          'Aucun utilisateur trouvé avec cette adresse email'
        );
        return;
      }

      // Vérifier si l'utilisateur est déjà un éditeur
      if (editors.some((editor) => editor.id === foundUser.id)) {
        Alert.alert(
          'Déjà éditeur',
          'Cet utilisateur est déjà un éditeur du groupe'
        );
        return;
      }

      // Vérifier si l'utilisateur est déjà dans les éditeurs invités
      if (group?.invitedEditors?.some((editor) => editor.id === foundUser.id)) {
        Alert.alert(
          'Invitation déjà envoyée',
          'Une invitation a déjà été envoyée à cet utilisateur'
        );
        return;
      }

      // Demander confirmation avant d'envoyer l'invitation
      Alert.alert(
        'Ajouter un éditeur',
        `Voulez-vous inviter ${foundUser.name} à rejoindre ce groupe en tant qu'éditeur ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Inviter',
            onPress: async () => {
              try {
                // Envoyer une invitation à l'utilisateur
                await sendInvitation(
                  group!.id,
                  group!.name,
                  foundUser.email,
                  user!.id,
                  user!.name
                );

                // Mettre à jour le groupe pour ajouter l'utilisateur à la liste des éditeurs invités
                const updatedGroup = { ...group };

                // Initialiser invitedEditors s'il n'existe pas
                if (!updatedGroup.invitedEditors) {
                  updatedGroup.invitedEditors = [];
                }

                // Ajouter l'utilisateur à la liste des éditeurs invités avec la structure correcte
                const newInvitedEditor = {
                  id: foundUser.id,
                  name: foundUser.name,
                  email: foundUser.email,
                };

                updatedGroup.invitedEditors.push(newInvitedEditor);

                // Mettre à jour le groupe dans Firestore
                await updateGroup(group!.id, {
                  invitedEditors: updatedGroup.invitedEditors,
                  updatedAt: Date.now(),
                });

                // Mettre à jour l'état local
                setGroup(updatedGroup);

                // Ajouter l'utilisateur à la liste des éditeurs (en attente) pour l'affichage
                setEditors([
                  ...editors,
                  {
                    id: foundUser.id,
                    name: foundUser.name,
                    email: foundUser.email,
                    pending: true, // Marquer comme en attente
                  },
                ]);

                // Réinitialiser le champ de recherche
                setNewEditorEmail('');

                Alert.alert(
                  'Invitation envoyée',
                  `Une invitation a été envoyée à ${foundUser.name}`
                );
              } catch (error) {
                console.error("Erreur lors de l'envoi de l'invitation:", error);
                Alert.alert(
                  'Erreur',
                  "Impossible d'envoyer l'invitation à cet utilisateur"
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erreur lors de la recherche de l'utilisateur:", error);
      Alert.alert('Erreur', "Impossible de rechercher l'utilisateur");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const removeEditor = (index: number) => {
    // Ne pas permettre de supprimer le créateur ou soi-même
    if (
      editors[index].id === group?.createdBy ||
      editors[index].id === user?.id
    ) {
      Alert.alert(
        'Action impossible',
        'Vous ne pouvez pas supprimer le créateur du groupe ou vous-même'
      );
      return;
    }

    Alert.alert(
      'Supprimer un éditeur',
      `Êtes-vous sûr de vouloir supprimer ${editors[index].name} des éditeurs ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newEditors = [...editors];
            newEditors.splice(index, 1);
            setEditors(newEditors);
          },
        },
      ]
    );
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de groupe');
      return;
    }

    // Filtrer les participants vides
    const validParticipants = participants.filter((p) => p.name.trim() !== '');

    if (validParticipants.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un participant');
      return;
    }

    try {
      setIsSaving(true);

      if (!group) {
        throw new Error('Données du groupe manquantes');
      }

      // Préparer les données à mettre à jour
      const updateData: Partial<Group> = {
        name: groupName,
        participants: validParticipants,
        updatedAt: Date.now(),
      };

      // Si l'utilisateur est le créateur, mettre à jour également les éditeurs
      // Mais ne pas inclure les éditeurs en attente dans la mise à jour du groupe
      if (isCreator) {
        // Filtrer pour ne garder que les éditeurs confirmés (non en attente)
        const confirmedEditors = editors.filter((editor) => !editor.pending);
        updateData.editors = confirmedEditors;
      }

      // Mettre à jour le groupe avec les nouvelles valeurs
      await updateGroup(groupId, updateData);

      Alert.alert('Succès', 'Le groupe a été mis à jour avec succès', [
        {
          text: 'OK',
          onPress: () => {
            router.replace({
              pathname: '/(tabs)',
              params: { refresh: Date.now().toString() },
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du groupe:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le groupe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Supprimer le groupe',
      'Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await deleteGroup(groupId);
              Alert.alert('Succès', 'Le groupe a été supprimé');
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Erreur lors de la suppression du groupe:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le groupe');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;

    try {
      if (group.createdBy === user.id) {
        Alert.alert(
          'Action impossible',
          'Le créateur du groupe ne peut pas le quitter. Vous devez le supprimer.'
        );
        return;
      }

      Alert.alert(
        'Quitter le groupe',
        'Êtes-vous sûr de vouloir quitter ce groupe ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Quitter',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsSaving(true);
                await removeEditorFromGroup(group.id, user.id);

                router.replace({
                  pathname: '/(tabs)',
                  params: { refresh: Date.now().toString() },
                });
              } catch (error) {
                console.error('Erreur lors du départ du groupe:', error);
                Alert.alert(
                  'Erreur',
                  'Une erreur est survenue lors du départ du groupe'
                );
              } finally {
                setIsSaving(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur lors du départ du groupe:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du départ du groupe');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement du groupe...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </Pressable>
        <Text style={styles.title}>Modifier le groupe</Text>
        <Pressable
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={handleSaveGroup}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nom du groupe"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {isCreator && (
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Éditeurs</Text>
              <Pressable
                onPress={() => setShowEditorsSection(!showEditorsSection)}
                style={styles.toggleButton}
              >
                <Ionicons
                  name={showEditorsSection ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#2563EB"
                />
              </Pressable>
            </View>

            {showEditorsSection && (
              <>
                <Text style={styles.helperText}>
                  Les éditeurs peuvent ajouter des dépenses au groupe
                </Text>

                {editors.map((editor, index) => (
                  <View
                    key={editor.id || `editor-${index}`}
                    style={styles.editorItem}
                  >
                    <View style={styles.editorInfo}>
                      <Ionicons
                        name="person-circle"
                        size={36}
                        color="#4B5563"
                      />
                      <View style={styles.editorDetails}>
                        <Text style={styles.editorName}>{editor.name}</Text>
                        {editor.email && (
                          <Text style={styles.editorEmail}>{editor.email}</Text>
                        )}
                      </View>
                    </View>

                    {editor.pending && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>En attente</Text>
                      </View>
                    )}

                    {group?.createdBy === editor.id && (
                      <View style={styles.creatorBadge}>
                        <Text style={styles.creatorBadgeText}>Créateur</Text>
                      </View>
                    )}

                    {isCreator &&
                      editor.id !== user?.id &&
                      editor.id !== group?.createdBy && (
                        <Pressable
                          style={styles.removeButton}
                          onPress={() => removeEditor(index)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#EF4444"
                          />
                        </Pressable>
                      )}
                  </View>
                ))}

                <View style={styles.addEditorContainer}>
                  <TextInput
                    style={[styles.input, styles.editorEmailInput]}
                    value={newEditorEmail}
                    onChangeText={setNewEditorEmail}
                    placeholder="Email de l'utilisateur à ajouter"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={[
                      styles.addEditorButton,
                      isSearchingUser && styles.disabledButton,
                    ]}
                    onPress={handleSearchUser}
                    disabled={isSearchingUser}
                  >
                    {isSearchingUser ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Participants</Text>
          {participants.map((participant, index) => (
            <View
              key={participant.id || `participant-${index}`}
              style={styles.participantItem}
            >
              <View style={styles.participantInfo}>
                <Ionicons name="person-outline" size={20} color="#4B5563" />
                <TextInput
                  style={styles.participantInput}
                  value={participant.name}
                  onChangeText={(text) => updateParticipantName(text, index)}
                  placeholder="Nom du participant"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Pressable
                onPress={() => removeParticipant(index)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable onPress={addParticipant} style={styles.addParticipantButton}>
          <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
          <Text style={styles.addParticipantText}>Ajouter un participant</Text>
        </Pressable>

        <View style={styles.footer}>
          {isCreator ? (
            <Pressable
              style={styles.deleteButton}
              onPress={handleDeleteGroup}
              disabled={isSaving}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Supprimer le groupe</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={styles.leaveButton}
              onPress={handleLeaveGroup}
              disabled={isSaving}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="exit" size={20} color="#FFFFFF" />
                <Text style={styles.leaveButtonText}>Quitter le groupe</Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.bottomMargin} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  backButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    padding: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addParticipantText: {
    fontSize: 16,
    color: '#2563EB',
    marginLeft: 8,
  },
  bottomMargin: {
    marginBottom: 24,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  editorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  editorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  editorEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  creatorBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  addEditorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  editorEmailInput: {
    flex: 1,
    marginRight: 8,
  },
  addEditorButton: {
    backgroundColor: '#2563EB',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pendingBadgeText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    width: '100%',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  leaveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
