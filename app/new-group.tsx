import { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../services/groups';
import { searchUserByEmail } from '../services/users';
import { useAuth } from '../lib/auth-context';

export default function NewGroupScreen() {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState<
    { id: string; name: string }[]
  >([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editors, setEditors] = useState<
    { id: string; name: string; email: string }[]
  >(user ? [{ id: user.id, name: user.name, email: user.email }] : []);
  const [newEditorEmail, setNewEditorEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [virtualParticipants, setVirtualParticipants] = useState<
    { name: string }[]
  >([]);

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de participant');
      return;
    }

    // Vérifier si le nom existe déjà
    const nameExists = [...participants, ...virtualParticipants].some(
      (p) =>
        p.name.trim().toLowerCase() === newParticipantName.trim().toLowerCase()
    );

    if (nameExists) {
      Alert.alert('Erreur', 'Ce nom de participant existe déjà');
      return;
    }

    // Ajouter le participant à la liste des participants virtuels
    setVirtualParticipants([
      ...virtualParticipants,
      { name: newParticipantName.trim() },
    ]);
    setNewParticipantName('');
  };

  const handleRemoveParticipant = (index: number) => {
    const newVirtualParticipants = [...virtualParticipants];
    newVirtualParticipants.splice(index, 1);
    setVirtualParticipants(newVirtualParticipants);
  };

  const handleSearchUser = async () => {
    if (!newEditorEmail.trim()) {
      Alert.alert('Erreur', "Veuillez entrer l'email de l'éditeur");
      return;
    }

    try {
      setIsSearching(true);
      console.log(`Recherche de l'utilisateur avec l'email: ${newEditorEmail}`);

      const foundUser = await searchUserByEmail(newEditorEmail.trim());

      if (!foundUser) {
        Alert.alert('Erreur', 'Aucun utilisateur trouvé avec cet email');
        return;
      }

      // Vérifier si l'utilisateur est déjà dans la liste des éditeurs
      const userExists = editors.some((editor) => editor.id === foundUser.id);
      if (userExists) {
        Alert.alert('Erreur', 'Cet utilisateur est déjà un éditeur du groupe');
        return;
      }

      // Ajouter l'utilisateur à la liste des éditeurs
      setEditors([
        ...editors,
        {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
        },
      ]);

      setNewEditorEmail('');
    } catch (error) {
      console.error("Erreur lors de la recherche de l'utilisateur:", error);
      Alert.alert('Erreur', "Impossible de rechercher l'utilisateur");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveEditor = (index: number) => {
    // Ne pas permettre de supprimer l'utilisateur actuel (créateur)
    if (editors[index].id === user?.id) {
      Alert.alert('Erreur', 'Vous ne pouvez pas vous retirer du groupe');
      return;
    }

    const newEditors = [...editors];
    newEditors.splice(index, 1);
    setEditors(newEditors);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de groupe');
      return;
    }

    // Filtrer les participants vides
    const validParticipants = participants.filter((p) => p.name.trim() !== '');

    // Ajouter les participants virtuels
    const allParticipants = [...validParticipants, ...virtualParticipants];

    if (allParticipants.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un participant');
      return;
    }

    // Vérifier que les noms des participants sont uniques
    const participantNames = allParticipants.map((p) => p.name.trim());
    const uniqueNames = new Set(participantNames);

    if (uniqueNames.size !== participantNames.length) {
      Alert.alert('Erreur', 'Les noms des participants doivent être uniques');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Début de la création du groupe...');
      console.log(`Nom du groupe: ${groupName}`);
      console.log(`Nombre de participants: ${allParticipants.length}`);

      // Filtrer les éditeurs pour ne garder que ceux qui sont invités
      // (l'utilisateur actuel sera ajouté automatiquement comme éditeur dans createGroup)
      const invitedEditors = editors.filter((editor) => editor.id !== user?.id);
      console.log(`Nombre d'éditeurs invités: ${invitedEditors.length}`);

      // Créer le groupe
      const groupId = await createGroup(
        groupName,
        invitedEditors,
        allParticipants
      );

      console.log(`Groupe créé avec succès. ID: ${groupId}`);

      // Rediriger vers l'écran d'accueil
      Alert.alert('Succès', 'Le groupe a été créé avec succès', [
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
      console.error('Erreur lors de la création du groupe:', error);
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Nouveau Groupe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Vacances à la montagne"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Éditeurs</Text>
          <Text style={styles.sectionDescription}>
            Entrez ici l'adresse mail des utilisateurs à ajouter en temps
            qu'editeurs
          </Text>

          <Text style={styles.label}>Ajouter des éditeurs par email</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Email de l'éditeur"
              value={newEditorEmail}
              onChangeText={setNewEditorEmail}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={styles.searchButton}
              onPress={handleSearchUser}
              disabled={isSearching || !newEditorEmail.trim()}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={24} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          <Text style={styles.listTitle}>Éditeurs ({editors.length})</Text>
          {editors.map((editor, index) => (
            <View key={editor.id} style={styles.editorItem}>
              <View style={styles.editorInfo}>
                <Ionicons name="person-circle" size={36} color="#4B5563" />
                <View style={styles.editorDetails}>
                  <Text style={styles.editorName}>{editor.name}</Text>
                  <Text style={styles.editorEmail}>{editor.email}</Text>
                </View>
              </View>
              {editor.id === user?.id ? (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Créateur</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleRemoveEditor(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <Text style={styles.sectionDescription}>
            Entrez ici le nom des personnes qui participeront au partage des
            dépenses
          </Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Nom du participant"
              value={newParticipantName}
              onChangeText={setNewParticipantName}
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              style={styles.searchButton}
              onPress={handleAddParticipant}
              disabled={!newParticipantName.trim()}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {virtualParticipants.length > 0 && (
            <>
              <Text style={styles.listTitle}>
                Participants ({virtualParticipants.length})
              </Text>
              {virtualParticipants.map((participant, index) => (
                <View key={index} style={styles.participantItem}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Pressable
                    onPress={() => handleRemoveParticipant(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </View>

        <Pressable
          style={[
            styles.createButton,
            (!groupName.trim() || virtualParticipants.length === 0) &&
              styles.disabledButton,
          ]}
          onPress={handleCreateGroup}
          disabled={
            isCreating || !groupName.trim() || virtualParticipants.length === 0
          }
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Créer le groupe</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  participantItem: {
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
  participantName: {
    fontSize: 16,
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
