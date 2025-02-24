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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGroups, deleteGroup } from '../../services/groups';
import { useAuth } from '../../lib/auth-context';
import type { Group } from '../../types/group';

export default function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (user) {
      console.log('Chargement des groupes...');
      loadGroups();
    } else {
      setIsLoading(false);
      setGroups([]);
      setFilteredGroups([]);
    }
  }, [user, params.refresh]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
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
    }
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
      Alert.alert('Erreur', 'Impossible de supprimer le groupe');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour naviguer vers la page de création de groupe
  const navigateToNewGroup = () => {
    console.log('Navigation vers la page de création de groupe');
    try {
      router.push('/new-group');
    } catch (error) {
      console.error('Erreur de navigation:', error);
      Alert.alert(
        'Erreur',
        "Impossible d'accéder à la page de création de groupe"
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadGroups} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un groupe / un participant..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery !== '' && (
          <Pressable
            onPress={() => handleSearch('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {/* Bouton temporaire pour tester les invitations */}
      <Pressable
        style={styles.testButton}
        onPress={() => {
          console.log('Navigation vers la page de test des invitations');
          try {
            // Utiliser une navigation plus directe
            router.navigate('/test-invitations');
            console.log('Navigation réussie');
          } catch (error) {
            console.error('Erreur de navigation:', error);
            Alert.alert(
              'Erreur',
              `Impossible d'accéder à la page de test: ${error.message}`
            );
          }
        }}
      >
        <Text style={styles.testButtonText}>Tester les invitations</Text>
      </Pressable>

      {/* Bouton pour le test direct de Firebase */}
      <Pressable
        style={[
          styles.testButton,
          { backgroundColor: '#DC2626', marginTop: 8 },
        ]}
        onPress={() => {
          console.log('Navigation vers la page de test direct Firebase');
          try {
            // Navigation directe vers une page dans le même dossier (tabs)
            router.push('/(tabs)/firebase-direct-test');
            console.log('Navigation réussie');
          } catch (error) {
            console.error('Erreur de navigation:', error);
            Alert.alert(
              'Erreur',
              `Impossible d'accéder à la page de test: ${error.message}`
            );
          }
        }}
      >
        <Text style={styles.testButtonText}>Test Firebase Direct</Text>
      </Pressable>

      {/* Bouton pour le test direct des invitations */}
      <Pressable
        style={[
          styles.testButton,
          { backgroundColor: '#8B5CF6', marginTop: 8 },
        ]}
        onPress={() => {
          console.log('Navigation vers la page de test direct des invitations');
          try {
            // Navigation directe vers une page dans le même dossier (tabs)
            router.push('/(tabs)/invitations-direct-test');
            console.log('Navigation réussie');
          } catch (error) {
            console.error('Erreur de navigation:', error);
            Alert.alert(
              'Erreur',
              `Impossible d'accéder à la page de test: ${error.message}`
            );
          }
        }}
      >
        <Text style={styles.testButtonText}>Test Invitations Direct</Text>
      </Pressable>

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.groupCard,
              pressed && styles.groupCardPressed,
            ]}
            onPress={() => handleGroupPress(item)}
            onLongPress={() => handleLongPress(item)}
          >
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMembers}>
                {item.participants.length} participants
              </Text>
            </View>
            <View style={styles.groupTotal}>
              <Text style={styles.totalAmount}>{item.total.toFixed(2)}€</Text>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun groupe trouvé</Text>
            <Text style={styles.emptySubtext}>
              Créez votre premier groupe en cliquant sur le bouton ci-dessous
            </Text>
          </View>
        }
        refreshing={isLoading}
        onRefresh={loadGroups}
      />

      <Pressable style={styles.createButton} onPress={navigateToNewGroup}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>

      <Modal
        visible={selectedGroup !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedGroup(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedGroup(null)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
              <Pressable onPress={() => setSelectedGroup(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Participants</Text>
              {selectedGroup?.participants.map((participant, index) => (
                <View key={index} style={styles.participantRow}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                </View>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Total des dépenses</Text>
              <Text style={styles.modalTotal}>
                {selectedGroup?.total.toFixed(2)}€
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  setSelectedGroup(null);
                  router.push({
                    pathname: '/new-expense',
                    params: { groupId: selectedGroup?.id },
                  });
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Nouvelle dépense</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  emptySubtext: {
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
});
