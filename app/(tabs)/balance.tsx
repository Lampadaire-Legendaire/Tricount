import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { getGroups } from '../../services/groups';
import { calculateBalances, calculatePaymentSuggestions } from '../../services/balances';
import { createPayment } from '../../services/payments';
import type { Group } from '../../types/group';
import type { Balance } from '../../services/balances';
import type { PaymentSuggestion } from '../../types/payment';

export default function BalanceScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadBalances();
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
    } catch (err) {
      setError('Erreur lors du chargement des groupes');
    }
  };

  const loadBalances = async () => {
    try {
      setIsLoading(true);
      const fetchedBalances = await calculateBalances(selectedGroup || undefined);
      setBalances(fetchedBalances);
    } catch (err) {
      setError('Erreur lors du calcul des soldes');
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = balances.reduce((sum, balance) => sum + balance.amount, 0);

  const suggestions = calculatePaymentSuggestions(balances);

  const handlePaymentConfirmation = async (suggestion: PaymentSuggestion) => {
    Alert.alert(
      'Confirmer le remboursement',
      `Confirmez-vous que ${suggestion.fromName} a remboursé ${suggestion.amount.toFixed(2)}€ à ${suggestion.toName} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setIsLoading(true);
              await createPayment(
                suggestion.from,
                suggestion.to,
                suggestion.amount,
                suggestion.groupId
              );
              // Recharger les soldes
              await loadBalances();
              Alert.alert('Succès', 'Le remboursement a été enregistré');
            } catch (err) {
              Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement du remboursement');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCloseModal = () => {
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Picker
          selectedValue={selectedGroup}
          onValueChange={itemValue => setSelectedGroup(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Tous les groupes" value="" />
          {groups.map(group => (
            <Picker.Item key={group.id} label={group.name} value={group.id} />
          ))}
        </Picker>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Balance Globale</Text>
        <Text style={[
          styles.summaryTotal,
          totalBalance > 0 ? styles.positive : styles.negative
        ]}>
          {totalBalance.toFixed(2)}€
        </Text>
        {suggestions.length > 0 && (
          <Pressable 
            style={styles.suggestionsButton}
            onPress={() => setShowSuggestions(true)}
          >
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.suggestionsButtonText}>
              Voir les remboursements suggérés
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={balances}
        keyExtractor={(item) => `${item.groupId}-${item.participantId}`}
        renderItem={({ item }) => (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.personName}>{item.participantName}</Text>
              <Text style={[
                styles.balanceAmount,
                item.amount > 0 ? styles.positive : styles.negative
              ]}>
                {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)}€
              </Text>
            </View>
            {!selectedGroup && (
              <Text style={styles.groupName}>{item.groupName}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun solde à afficher</Text>
            </View>
          )
        }
      />

      <Modal
        isVisible={showSuggestions}
        onSwipeComplete={handleCloseModal}
        onBackdropPress={handleCloseModal}
        onBackButtonPress={handleCloseModal}
        swipeDirection={['down']}
        style={styles.modal}
        propagateSwipe
      >
        <View style={styles.modalContent}>
          <View style={styles.modalIndicator} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Suggestions de remboursement</Text>
            <Pressable 
              onPress={handleCloseModal}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>
          
          <FlatList
            data={suggestions}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Pressable 
                style={styles.suggestionCard}
                onPress={() => {
                  handleCloseModal();
                  handlePaymentConfirmation(item);
                }}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionText}>
                    <Text style={styles.participantName}>{item.fromName}</Text>
                    {' → '}
                    <Text style={styles.participantName}>{item.toName}</Text>
                  </Text>
                  <Text style={styles.amount}>{item.amount.toFixed(2)}€</Text>
                </View>
                {!selectedGroup && (
                  <Text style={styles.groupName}>{item.groupName}</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {isLoading && <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />}
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
  picker: {
    backgroundColor: '#F3F4F6',
  },
  summary: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#DC2626',
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
  error: {
    color: '#DC2626',
    padding: 16,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  suggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  suggestionsButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  suggestionCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
  },
  participantName: {
    fontWeight: '600',
    color: '#111827',
  },
  amount: {
    color: '#2563EB',
    fontWeight: '600',
  },
});