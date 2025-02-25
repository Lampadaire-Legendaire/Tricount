import { useState, useEffect } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGroups, deleteGroup } from '../../services/groups';
import { getPendingInvitations } from '../../services/invitations';
import { useAuth } from '../../lib/auth-context';
import type { Group } from '../../types/group';

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

  const loadGroups = async () => {
    try {
      if (!refreshing) {
        setIsLoading(true);
      }
      setError(null);

      const fetchedGroups = await getGroups();
      console.log(`${fetchedGroups.length} groupes chargés`);
      setGroups(fetchedGroups);
      setFilteredGroups(fetchedGroups);
    } catch (err) {
      console.error('Erreur lors de la récupération des groupes:', err);
      setError('Impossible de charger vos groupes');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
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
            params: { id: group.id },
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes groupes</Text>
        {invitationsCount > 0 && (
          <Pressable
            style={styles.invitationNotification}
            onPress={() => router.push('/(tabs)/invitations')}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.invitationNotificationText}>
              {invitationsCount}{' '}
              {invitationsCount > 1 ? 'invitations' : 'invitation'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un groupe..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <Pressable onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </Pressable>
        ) : null}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadGroups}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.groupCard}
              onPress={() => handleGroupPress(item)}
              onLongPress={() => handleLongPress(item)}
              delayLongPress={500}
            >
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.participantsCount}>
                  {item.participants.length}{' '}
                  {item.participants.length > 1
                    ? 'participants'
                    : 'participant'}
                </Text>
              </View>
              <View style={styles.groupTotal}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  {item.total ? `${item.total.toFixed(2)} €` : '0.00 €'}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Vous n'avez pas encore de groupe.
              </Text>
              <Text style={styles.emptySubText}>
                Créez un groupe pour commencer à partager des dépenses.
              </Text>
            </View>
          }
          contentContainerStyle={
            filteredGroups.length === 0 ? { flex: 1 } : { paddingBottom: 80 }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
            />
          }
        />
      )}

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
                <Pressable onPress={() => setSelectedGroup(null)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Participants</Text>
                {selectedGroup.participants.map((participant) => (
                  <View key={participant.id} style={styles.participantRow}>
                    <Text style={styles.participantName}>
                      {participant.name}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Total des dépenses</Text>
                <Text style={styles.modalTotal}>
                  {selectedGroup.total.toFixed(2)} €
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.closeModalButton}
                  onPress={() => setSelectedGroup(null)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>Fermer</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  groupCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCardPressed: {
    opacity: 0.7,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupTotal: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  participantRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantName: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#F59E0B',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  participantsCount: {
    fontSize: 14,
    color: '#6B7280',
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
  editButton: {
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  closeModalButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
});
