import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { getGroups } from '../../services/groups';
import { getDeptsByGroupId } from '../../services/depts';
import type { Group } from '../../types/group';
import type { Dept } from '../../services/depts';

interface DebtDetail {
  participantName: string;
  amount: number;
}

interface ParticipantBalance {
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  debtsToOthers: DebtDetail[];
  debtsFromOthers: DebtDetail[];
}

export default function BalanceScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [participantBalances, setParticipantBalances] = useState<
    ParticipantBalance[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0) {
        setSelectedGroup(fetchedGroups[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBalances = async (group: Group) => {
    try {
      setIsLoading(true);
      const depts = await getDeptsByGroupId(group.id);

      // Initialiser les soldes pour chaque participant
      const balances: { [key: string]: ParticipantBalance } = {};
      group.participants.forEach((participant) => {
        balances[participant.name] = {
          name: participant.name,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
          debtsToOthers: [],
          debtsFromOthers: [],
        };
      });

      // Vérifier que depts existe
      if (!depts) {
        setParticipantBalances(Object.values(balances));
        return;
      }

      // Calculer les totaux et les dettes détaillées
      depts.forEach((dept: Dept) => {
        if (!dept) return; // Ignorer les dettes invalides

        const payer = group.participants.find((p) => p.name === dept.payerId);
        if (payer && balances[payer.name]) {
          balances[payer.name].totalPaid += dept.amount;

          // Vérifier que debtors existe
          if (dept.debtors && Array.isArray(dept.debtors)) {
            dept.debtors.forEach((debtor) => {
              if (debtor && debtor.userId && balances[debtor.userId]) {
                balances[debtor.userId].totalOwed += debtor.amount;

                balances[debtor.userId].debtsToOthers.push({
                  participantName: payer.name,
                  amount: debtor.amount,
                });

                balances[payer.name].debtsFromOthers.push({
                  participantName: debtor.userId,
                  amount: debtor.amount,
                });
              }
            });
          }
        }
      });

      // Calculer le solde net et consolider les dettes
      Object.values(balances).forEach((balance) => {
        balance.netBalance = balance.totalPaid - balance.totalOwed;
        balance.debtsToOthers = consolidateDebts(balance.debtsToOthers || []);
        balance.debtsFromOthers = consolidateDebts(
          balance.debtsFromOthers || []
        );
      });

      setParticipantBalances(Object.values(balances));
    } catch (error) {
      console.error('Erreur lors du calcul des soldes:', error);
      setParticipantBalances([]); // Initialiser avec un tableau vide en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction utilitaire pour consolider les dettes par participant
  const consolidateDebts = (debts: DebtDetail[]): DebtDetail[] => {
    const consolidatedDebts = new Map<string, number>();

    debts.forEach((debt) => {
      const currentAmount = consolidatedDebts.get(debt.participantName) || 0;
      consolidatedDebts.set(debt.participantName, currentAmount + debt.amount);
    });

    return Array.from(consolidatedDebts.entries()).map(
      ([participantName, amount]) => ({
        participantName,
        amount,
      })
    );
  };

  useEffect(() => {
    if (selectedGroup) {
      calculateBalances(selectedGroup);
    }
  }, [selectedGroup]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedGroup) {
      await calculateBalances(selectedGroup);
    }
    setRefreshing(false);
  }, [selectedGroup]);

  const renderGroupSelector = () => (
    <Pressable
      style={styles.groupSelector}
      onPress={() => setShowGroupSelector(true)}
    >
      <Text style={styles.groupName}>
        {selectedGroup?.name || 'Sélectionner un groupe'}
      </Text>
      <Ionicons name="chevron-down" size={24} color="#4B5563" />
    </Pressable>
  );

  const renderGroupSelectorModal = () => (
    <Modal
      visible={showGroupSelector}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowGroupSelector(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un groupe</Text>
            <Pressable
              onPress={() => setShowGroupSelector(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#4B5563" />
            </Pressable>
          </View>
          <ScrollView style={styles.groupList}>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                style={styles.groupItem}
                onPress={() => {
                  setSelectedGroup(group);
                  setShowGroupSelector(false);
                }}
              >
                <Text style={styles.groupItemText}>{group.name}</Text>
                {selectedGroup?.id === group.id && (
                  <Ionicons name="checkmark" size={24} color="#2563EB" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderBalanceCard = (balance: ParticipantBalance) => (
    <View style={styles.balanceCard} key={balance.name}>
      <View style={styles.balanceHeader}>
        <Ionicons name="person-circle" size={40} color="#2563EB" />
        <Text style={styles.participantName}>{balance.name}</Text>
      </View>
      <View style={styles.balanceDetails}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total payé</Text>
          <Text style={styles.balanceAmount}>
            {(balance.totalPaid || 0).toFixed(2)}€
          </Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total dû</Text>
          <Text style={styles.balanceAmount}>
            {(balance.totalOwed || 0).toFixed(2)}€
          </Text>
        </View>

        {/* Dettes envers les autres */}
        {balance.debtsToOthers && balance.debtsToOthers.length > 0 && (
          <View style={styles.debtsSection}>
            <Text style={styles.debtsSectionTitle}>Doit :</Text>
            {balance.debtsToOthers.map((debt, index) => (
              <View key={`debt-to-${index}`} style={styles.debtRow}>
                <Text style={styles.debtParticipant}>
                  {debt.participantName}
                </Text>
                <Text style={styles.negativeBalance}>
                  {(debt.amount || 0).toFixed(2)}€
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Dettes des autres */}
        {balance.debtsFromOthers && balance.debtsFromOthers.length > 0 && (
          <View style={styles.debtsSection}>
            <Text style={styles.debtsSectionTitle}>Doit recevoir :</Text>
            {balance.debtsFromOthers.map((debt, index) => (
              <View key={`debt-from-${index}`} style={styles.debtRow}>
                <Text style={styles.debtParticipant}>
                  {debt.participantName}
                </Text>
                <Text style={styles.positiveBalance}>
                  {(debt.amount || 0).toFixed(2)}€
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderGroupSelector()}
      {renderGroupSelectorModal()}

      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <ScrollView
          style={styles.balanceList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
            />
          }
        >
          {participantBalances.map(renderBalanceCard)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  balanceList: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  balanceDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  debtsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  debtsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  debtParticipant: {
    fontSize: 14,
    color: '#4B5563',
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#DC2626',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  groupList: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupItemText: {
    fontSize: 16,
    color: '#111827',
  },
});
