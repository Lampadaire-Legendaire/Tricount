import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGroups, deleteGroup } from '../../services/groups';
import { getPendingInvitations } from '../../services/invitations';
import { useAuth } from '../../lib/auth-context';
import type { Group } from '../../types/group';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationsCount, setInvitationsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (user) {
      console.log('Chargement des groupes...');
      loadGroups();
      loadInvitationsCount();
    } else {
      setIsLoading(false);
      setGroups([]);
      setFilteredGroups([]);
    }
  }, [user, params.refresh]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadGroups();
      }
    }, [user])
  );

  useEffect(() => {
    if (params.refresh) {
      loadGroups();
    }
  }, [params.refresh]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
      setFilteredGroups(fetchedGroups);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setError('Impossible de charger les groupes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvitationsCount = async () => {
    try {
      const invitations = await getPendingInvitations(user.id);
      setInvitationsCount(invitations.length);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGroups();
    loadInvitationsCount();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      const filtered = groups.filter(
        (group) =>
          group.name.toLowerCase().includes(text.toLowerCase()) ||
          group.participants.some((p) =>
            p.name.toLowerCase().includes(text.toLowerCase())
          )
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(groups);
    }
  };

  const handleGroupPress = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleLongPress = (group: Group) => {
    Alert.alert('Options', `Que souhaitez-vous faire avec "${group.name}" ?`, [
      {
        text: 'Annuler',
        style: 'cancel',
      },
      {
        text: 'Modifier',
        onPress: () => {
          // Navigation vers l'écran d'édition
          router.push({
            pathname: '/edit-group',
            params: { groupId: group.id },
          });
        },
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => confirmDelete(group),
      },
    ]);
  };

  const confirmDelete = (group: Group) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${group.name}" ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => handleDeleteGroup(group.id),
        },
      ]
    );
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setIsLoading(true);
      await deleteGroup(groupId);

      // Mettre à jour la liste des groupes
      setGroups(groups.filter((g) => g.id !== groupId));
      setFilteredGroups(filteredGroups.filter((g) => g.id !== groupId));

      Alert.alert('Succès', 'Le groupe a été supprimé');
    } catch (error) {
      console.error('Erreur lors de la suppression du groupe:', error);

      // Vérifier si l'erreur est liée aux permissions
      if (
        (error instanceof Error &&
          error.message.includes("n'êtes pas autorisé")) ||
        error.message.includes('not authorized')
      ) {
        Alert.alert(
          'Accès refusé',
          "Vous n'êtes pas autorisé à supprimer ce groupe. Seul le créateur du groupe peut le supprimer."
        );
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer le groupe');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewGroup = (groupId: string, groupName: string) => {
    // Fermer la modal
    setSelectedGroup(null);

    // Naviguer vers la page de détail du groupe
    router.push({
      pathname: '/group-details',
      params: { id: groupId, name: groupName },
    });
  };

  const handleEditGroup = (group: Group) => {
    console.log('Édition du groupe:', group.id);
    router.push({
      pathname: '/edit-group',
      params: { groupId: group.id },
    });
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <Pressable style={styles.groupCard} onPress={() => handleGroupPress(item)}>
      <View style={styles.groupCardHeader}>
        <View style={styles.groupIconContainer}>
          <Ionicons name="people" size={24} color="#2563EB" />
        </View>
        <Text style={styles.groupName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>

      <View style={styles.groupCardBody}>
        <View style={styles.groupInfoItem}>
          <Ionicons name="person-outline" size={16} color="#4B5563" />
          <Text style={styles.groupInfoLabel}>Participants</Text>
          <Text style={styles.groupInfoValue}>{item.participants.length}</Text>
        </View>

        <View style={styles.groupInfoItem}>
          <Ionicons name="cash-outline" size={16} color="#4B5563" />
          <Text style={styles.groupInfoLabel}>Total</Text>
          <Text style={styles.groupInfoValue}>{item.total.toFixed(2)} €</Text>
        </View>

        <View style={styles.groupInfoItem}>
          <Ionicons name="calendar-outline" size={16} color="#4B5563" />
          <Text style={styles.groupInfoLabel}>Créé le</Text>
          <Text style={styles.groupInfoValue}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadGroups}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Champ de recherche remonté */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un groupe..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <FlatList
          data={filteredGroups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Aucun groupe ne correspond à votre recherche'
                  : 'Vous ne participez à aucun groupe'}
              </Text>
            </View>
          }
        />
      </View>

      {selectedGroup && (
        <Modal
          visible={!!selectedGroup}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedGroup(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                <Pressable
                  onPress={() => setSelectedGroup(null)}
                  style={styles.closeIconButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="people" size={20} color="#2563EB" />
                  <Text style={styles.modalSectionTitle}>Éditeurs</Text>
                </View>
                {selectedGroup.editors.map((editor) => (
                  <View key={editor.id} style={styles.participantRow}>
                    <Ionicons
                      name="person"
                      size={18}
                      color="#4B5563"
                      style={styles.participantIcon}
                    />
                    <Text style={styles.participantName}>{editor.name}</Text>
                    {editor.id === selectedGroup.createdBy ? (
                      <View style={styles.creatorBadge}>
                        <Text style={styles.creatorBadgeText}>Créateur</Text>
                      </View>
                    ) : (
                      <View style={styles.editorBadge}>
                        <Text style={styles.editorBadgeText}>Éditeur</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="list" size={20} color="#2563EB" />
                  <Text style={styles.modalSectionTitle}>Participants</Text>
                </View>
                {selectedGroup.participants.map((participant, index) => (
                  <View
                    key={`participant-${index}-${participant.name}`}
                    style={styles.participantRow}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color="#4B5563"
                      style={styles.participantIcon}
                    />
                    <Text style={styles.participantName}>
                      {participant.name}
                    </Text>
                    {participant.isVirtual && (
                      <Text style={styles.virtualLabel}>(Fictif)</Text>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.modalSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="cash-outline" size={20} color="#2563EB" />
                  <Text style={styles.modalSectionTitle}>
                    Total des dépenses
                  </Text>
                </View>
                <Text style={styles.modalTotal}>
                  {selectedGroup.total.toFixed(2)} €
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => {
                    setSelectedGroup(null);
                    handleEditGroup(selectedGroup);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Modifier le groupe</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bouton de création de groupe */}
      <View style={styles.newButtonContainer}>
        <Pressable
          style={styles.newButton}
          onPress={() => router.push('/new-group')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.newButtonText}>Nouveau groupe</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  groupCardBody: {
    padding: 16,
  },
  groupInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  groupInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  closeIconButton: {
    padding: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  participantIcon: {
    marginRight: 8,
  },
  participantName: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  modalTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    marginTop: 16,
  },
  editButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
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
  editorBadge: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  editorBadgeText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '500',
  },
  virtualLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  newButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  newButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  invitationNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  invitationNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  groupsList: {
    paddingHorizontal: 16,
  },
});
