import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { getGroups } from '../../services/groups';
import { getDeptsByGroupId } from '../../services/depts';
import type { Group } from '../../types/group';

interface ParticipantBalance {
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export default function BalanceScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [participantBalances, setParticipantBalances] = useState<
    ParticipantBalance[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
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
        };
      });

      // Calculer les totaux payés et dus
      depts.forEach((dept) => {
        // Ajouter le montant total payé
        const payer = group.participants.find((p) => p.name === dept.payerId);
        if (payer && balances[payer.name]) {
          balances[payer.name].totalPaid += dept.amount;
        }

        // Ajouter les montants dus
        dept.debtors.forEach((debtor) => {
          if (balances[debtor.userId]) {
            balances[debtor.userId].totalOwed += debtor.amount;
          }
        });
      });

      // Calculer le solde net pour chaque participant
      Object.values(balances).forEach((balance) => {
        balance.netBalance = balance.totalPaid - balance.totalOwed;
      });

      setParticipantBalances(Object.values(balances));
    } catch (error) {
      console.error('Erreur lors du calcul des soldes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      calculateBalances(selectedGroup);
    }
  }, [selectedGroup]);

  const renderParticipantBalance = (balance: ParticipantBalance) => (
    <View style={styles.balanceCard} key={balance.name}>
      <View style={styles.balanceHeader}>
        <Ionicons name="person-circle" size={40} color="#2563EB" />
        <Text style={styles.participantName}>{balance.name}</Text>
      </View>
      <View style={styles.balanceDetails}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total payé</Text>
          <Text style={styles.balanceAmount}>
            {balance.totalPaid.toFixed(2)}€
          </Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Total dû</Text>
          <Text style={styles.balanceAmount}>
            {balance.totalOwed.toFixed(2)}€
          </Text>
        </View>
        <View style={[styles.balanceRow, styles.netBalanceRow]}>
          <Text style={styles.balanceLabel}>Solde net</Text>
          <Text
            style={[
              styles.balanceAmount,
              balance.netBalance >= 0
                ? styles.positiveBalance
                : styles.negativeBalance,
            ]}
          >
            {balance.netBalance.toFixed(2)}€
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        style={styles.groupSelector}
        onPress={() => setShowGroupSelector(true)}
      >
        <Text style={styles.groupName}>
          {selectedGroup?.name || 'Sélectionner un groupe'}
        </Text>
        <Ionicons name="chevron-down" size={24} color="#4B5563" />
      </Pressable>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <ScrollView style={styles.balanceList}>
          {participantBalances.map(renderParticipantBalance)}
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
  netBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  positiveBalance: {
    color: '#059669',
  },
  negativeBalance: {
    color: '#DC2626',
  },
});
