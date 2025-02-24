import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getGroups, deleteGroup } from '../../services/groups';
import type { Group } from '../../types/group';

export default function HomeScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const router = useRouter();

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
      setFilteredGroups(fetchedGroups);
    } catch (err) {
      setError('Impossible de charger les groupes');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = groups.filter(group => 
      group.name.toLowerCase().includes(text.toLowerCase()) ||
      group.participants.some(p => p.name.toLowerCase().includes(text.toLowerCase()))
    );
    setFilteredGroups(filtered);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      'Supprimer le groupe',
      `Êtes-vous sûr de vouloir supprimer le groupe "${groupName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteGroup(groupId);
              await loadGroups();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le groupe');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLongPress = (group: Group) => {
    Alert.alert(
      group.name,
      'Que souhaitez-vous faire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          style: 'default',
          onPress: () => {
            router.push({
              pathname: '/edit-group',
              params: { groupId: group.id }
            });
          }
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => handleDeleteGroup(group.id, group.name),
        },
      ]
    );
  };

  const handleGroupPress = (group: Group) => {
    setSelectedGroup(group);
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
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
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

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [
              styles.groupCard,
              pressed && styles.groupCardPressed
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
              <Text style={styles.totalAmount}>
                {item.total.toFixed(2)}€
              </Text>
              <Text style={styles.totalLabel}>Total</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? "Aucun résultat trouvé" : "Aucun groupe pour le moment"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? "Essayez d'autres termes de recherche" : "Créez votre premier groupe pour commencer !"}
              </Text>
            </View>
          )
        }
      />
      {isLoading && <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />}

      <View style={styles.createButtonContainer}>
        <Link href="/new-group" asChild>
          <Pressable style={styles.createButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </Link>
      </View>

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
              <Text style={styles.modalTotal}>{selectedGroup?.total.toFixed(2)}€</Text>
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
  createButtonContainer: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
  createButton: {
    backgroundColor: '#2563EB',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  groupCard: {
    backgroundColor: '#fff',
    marginHorizontal: 18,
    marginBottom: 12,
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
    marginHorizontal: 'auto',
    marginVertical: 8,
    marginBottom: 16,
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
    elevation: 3,
    width: '90%',
    alignSelf: 'center',
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
  loader: {
    marginTop: 16,
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
    fontSize: 24,
    fontWeight: '600',
    color: '#2563EB',
  },
});