import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { getGroups } from '../../services/groups';
import { getExpensesByGroupId, deleteExpense } from '../../services/expenses';
import type { Group } from '../../types/group';
import type { Expense } from '../../services/expenses';

export default function ExpensesScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
    } else {
      setIsLoading(false);
      setGroups([]);
    }
  }, [user]);

  // Utiliser useFocusEffect pour recharger les dépenses chaque fois que l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      if (selectedGroup) {
        console.log('Écran des dépenses affiché, rechargement des dépenses...');
        loadExpenses();
      }
      return () => {
        // Nettoyage si nécessaire
      };
    }, [selectedGroup])
  );

  useEffect(() => {
    if (selectedGroup) {
      loadExpenses();
    } else {
      setExpenses([]);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchedGroups = await getGroups();
      console.log(`${fetchedGroups.length} groupes récupérés`);

      setGroups(fetchedGroups);

      // Si aucun groupe n'est sélectionné et qu'il y a des groupes disponibles, sélectionner le premier
      if (!selectedGroup && fetchedGroups.length > 0) {
        setSelectedGroup(fetchedGroups[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      setError('Impossible de charger les groupes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExpenses = async () => {
    if (!selectedGroup) return;

    try {
      setIsLoadingExpenses(true);
      const fetchedExpenses = await getExpensesByGroupId(selectedGroup.id);
      console.log(
        `${fetchedExpenses.length} dépenses récupérées pour le groupe ${selectedGroup.id}`
      );

      // Vérifier les doublons potentiels
      const titles = fetchedExpenses.map((e) => e.title);
      const uniqueTitles = new Set(titles);
      if (titles.length !== uniqueTitles.size) {
        console.warn('Attention: des dépenses en double ont été détectées');
      }

      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
      Alert.alert('Erreur', 'Impossible de charger les dépenses');
    } finally {
      setIsLoadingExpenses(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('Rafraîchissement manuel des dépenses...');
    setRefreshing(true);
    loadExpenses();
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setShowGroupSelector(false);
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette dépense ?',
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
              if (!selectedGroup) return;
              await deleteExpense(expenseId, selectedGroup.id);
              loadExpenses();
            } catch (error) {
              console.error(
                'Erreur lors de la suppression de la dépense:',
                error
              );
              Alert.alert('Erreur', 'Impossible de supprimer la dépense');
            }
          },
        },
      ]
    );
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupItem = ({ item }: { item: Group }) => (
    <Pressable
      style={[
        styles.groupItem,
        selectedGroup?.id === item.id && styles.selectedGroupItem,
      ]}
      onPress={() => handleSelectGroup(item)}
    >
      <View style={styles.groupItemContent}>
        <Ionicons
          name="people"
          size={24}
          color={selectedGroup?.id === item.id ? '#FFFFFF' : '#4B5563'}
        />
        <Text
          style={[
            styles.groupItemText,
            selectedGroup?.id === item.id && styles.selectedGroupItemText,
          ]}
        >
          {item.name}
        </Text>
      </View>
      {selectedGroup?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
      )}
    </Pressable>
  );

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <Pressable
      style={styles.expenseItem}
      onPress={() => {
        setSelectedExpense(item);
        setShowExpenseDetails(true);
      }}
    >
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseTitle}>{item.title}</Text>
        <Text style={styles.expenseAmount}>{item.amount.toFixed(2)} €</Text>
      </View>

      <View style={styles.expenseDetails}>
        <View style={styles.expenseDetailRow}>
          <View style={styles.expenseDetailItem}>
            <Ionicons name="person" size={16} color="#4B5563" />
            <Text style={styles.expenseDetailLabel}>Payé par</Text>
            <Text style={styles.expenseDetailValue}>{item.paidBy}</Text>
          </View>

          <View style={styles.expenseDetailItem}>
            <Ionicons name="people" size={16} color="#4B5563" />
            <Text style={styles.expenseDetailLabel}>Participants</Text>
            <Text style={styles.expenseDetailValue}>
              {item.participants.length}
            </Text>
          </View>
        </View>

        <View style={styles.expenseDetailRow}>
          <View style={styles.expenseDetailItem}>
            <Ionicons name="cash-outline" size={16} color="#4B5563" />
            <Text style={styles.expenseDetailLabel}>Part/pers.</Text>
            <Text style={styles.expenseDetailValue}>
              {(item.amount / item.participants.length).toFixed(2)} €
            </Text>
          </View>

          <View style={styles.expenseDetailItem}>
            <Ionicons name="calendar-outline" size={16} color="#4B5563" />
            <Text style={styles.expenseDetailLabel}>Date</Text>
            <Text style={styles.expenseDetailValue}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des groupes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadGroups}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>Vous n'avez pas encore de groupe</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/new-group')}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Créer un groupe</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.groupSelector}
          onPress={() => setShowGroupSelector(true)}
        >
          <Text style={styles.groupSelectorText} numberOfLines={1}>
            {selectedGroup?.name || 'Sélectionner un groupe'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#4B5563" />
        </Pressable>
      </View>

      <View style={styles.content}>
        {selectedGroup ? (
          isLoadingExpenses && !refreshing ? (
            <View style={styles.loadingExpensesContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingExpensesText}>
                Chargement des dépenses...
              </Text>
            </View>
          ) : expenses.length > 0 ? (
            <FlatList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.expensesList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#2563EB']}
                />
              }
            />
          ) : (
            <View style={styles.expensesContainer}>
              <Text style={styles.noExpensesText}>
                Aucune dépense pour le moment
              </Text>
            </View>
          )
        ) : (
          <View style={styles.noGroupSelectedContainer}>
            <Text style={styles.noGroupSelectedText}>
              Veuillez sélectionner un groupe pour voir les dépenses
            </Text>
          </View>
        )}
      </View>

      {selectedGroup && (
        <View style={styles.newButtonContainer}>
          <Pressable
            style={styles.newButton}
            onPress={() =>
              router.push({
                pathname: '/new-expense',
                params: { groupId: selectedGroup.id },
              })
            }
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Nouvelle dépense</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={showGroupSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un groupe</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowGroupSelector(false)}
              >
                <Ionicons name="close" size={24} color="#4B5563" />
              </Pressable>
            </View>

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

            <FlatList
              data={filteredGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupsList}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {showExpenseDetails && selectedExpense && (
        <Modal
          visible={showExpenseDetails}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowExpenseDetails(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.expenseModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails de la dépense</Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setShowExpenseDetails(false)}
                >
                  <Ionicons name="close" size={24} color="#4B5563" />
                </Pressable>
              </View>

              <ScrollView style={styles.expenseModalBody}>
                <View style={styles.expenseModalHeader}>
                  <Text style={styles.expenseModalTitle}>
                    {selectedExpense.title}
                  </Text>
                  <Text style={styles.expenseModalAmount}>
                    {selectedExpense.amount.toFixed(2)} €
                  </Text>
                </View>

                <View style={styles.expenseModalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="person" size={20} color="#2563EB" />
                    <Text style={styles.sectionTitle}>Payé par</Text>
                  </View>
                  <Text style={styles.sectionValue}>
                    {selectedExpense.paidBy}
                  </Text>
                </View>

                <View style={styles.expenseModalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="people" size={20} color="#2563EB" />
                    <Text style={styles.sectionTitle}>Participants</Text>
                  </View>
                  <View style={styles.participantsList}>
                    {selectedExpense.participants.map((participant, index) => (
                      <View key={index} style={styles.participantItem}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#4B5563"
                        />
                        <Text style={styles.participantName}>
                          {participant}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.expenseModalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="cash-outline" size={20} color="#2563EB" />
                    <Text style={styles.sectionTitle}>
                      Montant par personne
                    </Text>
                  </View>
                  <Text style={styles.sectionValue}>
                    {(
                      selectedExpense.amount /
                      selectedExpense.participants.length
                    ).toFixed(2)}{' '}
                    €
                  </Text>
                </View>

                <View style={styles.expenseModalSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#2563EB"
                    />
                    <Text style={styles.sectionTitle}>Date</Text>
                  </View>
                  <Text style={styles.sectionValue}>
                    {new Date(selectedExpense.createdAt).toLocaleDateString()} à{' '}
                    {new Date(selectedExpense.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              </ScrollView>

              {user && selectedExpense.createdBy === user.id && (
                <View style={styles.expenseModalActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => {
                      setShowExpenseDetails(false);
                      router.push({
                        pathname: '/edit-expense',
                        params: { expenseId: selectedExpense.id },
                      });
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Modifier</Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => {
                      setShowExpenseDetails(false);
                      handleDeleteExpense(selectedExpense.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Supprimer</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  groupSelectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  expensesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noExpensesText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  noGroupSelectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noGroupSelectedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  groupsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedGroupItem: {
    backgroundColor: '#2563EB',
  },
  groupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItemText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
  },
  selectedGroupItemText: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
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
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  expensesList: {
    padding: 16,
  },
  expenseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  expenseDetails: {
    marginTop: 8,
  },
  expenseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expenseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    marginRight: 4,
  },
  expenseDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  loadingExpensesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingExpensesText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  newButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  newButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
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
  expenseModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  expenseModalBody: {
    padding: 16,
    maxHeight: '70%',
    overflow: 'scroll',
  },
  expenseModalHeader: {
    marginBottom: 16,
  },
  expenseModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  expenseModalAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
  },
  expenseModalSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 8,
  },
  sectionValue: {
    fontSize: 16,
    color: '#111827',
    paddingLeft: 28,
  },
  participantsList: {
    paddingLeft: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  participantName: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 8,
  },
  expenseModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});
