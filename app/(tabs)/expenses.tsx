import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getGroups } from '../../services/groups';
import { getExpenses } from '../../services/expenses';
import { auth } from '../../lib/firebase';
import type { Group } from '../../types/group';
import type { Expense } from '../../types/expense';

export default function ExpensesScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Vérifier si l'utilisateur est connecté
      if (!auth.currentUser) {
        setGroups([]);
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      // Charger les groupes
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);

      // Si aucun groupe n'est sélectionné, prendre le premier
      const groupId =
        selectedGroupId ||
        (fetchedGroups.length > 0 ? fetchedGroups[0].id : '');
      setSelectedGroupId(groupId);

      if (groupId) {
        // Charger les dépenses du groupe sélectionné
        const fetchedExpenses = await getExpenses(groupId);
        setExpenses(fetchedExpenses);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedGroupId])
  );

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
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
        <Pressable onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterButton,
                selectedGroupId === item.id && styles.filterButtonActive,
              ]}
              onPress={() => handleGroupSelect(item.id)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedGroupId === item.id && styles.filterButtonTextActive,
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          ListEmptyComponent={
            <Text style={styles.emptyFilterText}>Aucun groupe disponible</Text>
          }
        />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.expenseCard}>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseTitle}>{item.title}</Text>
              <Text style={styles.expensePayer}>
                Payé par {item.paidBy.name}
              </Text>
            </View>
            <View style={styles.expenseAmount}>
              <Text style={styles.amount}>{item.amount.toFixed(2)}€</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {groups.length > 0
                ? 'Aucune dépense pour ce groupe'
                : "Créez d'abord un groupe"}
            </Text>
            {groups.length > 0 && (
              <Text style={styles.emptySubtext}>
                Ajoutez votre première dépense !
              </Text>
            )}
          </View>
        }
      />

      {groups.length > 0 && (
        <Link href="/new-expense" asChild>
          <Pressable style={styles.addButton}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterButtonActive: {
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#2563EB',
  },
  filterList: {
    padding: 10,
  },
  emptyFilterText: {
    fontSize: 14,
    color: '#6B7280',
    padding: 10,
  },
  expenseCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  expenseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  expensePayer: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    padding: 16,
    textAlign: 'center',
  },
  retryButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
});
