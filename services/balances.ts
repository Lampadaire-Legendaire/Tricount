import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Group } from '../types/group';
import type { Expense } from '../types/expense';

export interface Balance {
  participantId: string;
  participantName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export interface PaymentSuggestion {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

// Récupérer l'utilisateur actuel depuis AsyncStorage
const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem('currentUser');
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

// Calculer les soldes pour un groupe ou pour tous les groupes
export async function calculateBalances(groupId?: string): Promise<Balance[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn('Tentative de calcul des soldes sans utilisateur connecté');
      return [];
    }

    // Récupérer les groupes
    let groups: Group[] = [];
    const groupsCollection = collection(db, 'groups');

    if (groupId) {
      // Récupérer un groupe spécifique
      const q = query(groupsCollection, where('__name__', '==', groupId));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() } as Group);
      });
    } else {
      // Récupérer tous les groupes de l'utilisateur
      const q = query(
        groupsCollection,
        where('participants', 'array-contains', {
          id: currentUser.id,
          name: currentUser.name,
        })
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() } as Group);
      });
    }

    // Récupérer les dépenses pour chaque groupe
    const balances: Balance[] = [];

    for (const group of groups) {
      // Initialiser les soldes pour chaque participant
      const participantBalances = new Map<string, Balance>();

      for (const participant of group.participants) {
        participantBalances.set(participant.id, {
          participantId: participant.id,
          participantName: participant.name,
          amount: 0,
          groupId: group.id,
          groupName: group.name,
        });
      }

      // Récupérer les dépenses du groupe
      const expensesCollection = collection(db, 'expenses');
      const q = query(expensesCollection, where('groupId', '==', group.id));
      const querySnapshot = await getDocs(q);

      const expenses: Expense[] = [];
      querySnapshot.forEach((doc) => {
        expenses.push({ id: doc.id, ...doc.data() } as Expense);
      });

      // Calculer les soldes
      for (const expense of expenses) {
        const payerId = expense.paidBy.id;
        const amountPerPerson = expense.amount / expense.participants.length;

        // Ajouter le montant total au payeur
        const payerBalance = participantBalances.get(payerId);
        if (payerBalance) {
          payerBalance.amount += expense.amount;
        }

        // Soustraire le montant par personne à chaque participant
        for (const participant of expense.participants) {
          const participantBalance = participantBalances.get(participant.id);
          if (participantBalance) {
            participantBalance.amount -= amountPerPerson;
          }
        }
      }

      // Ajouter les soldes au résultat
      balances.push(...participantBalances.values());
    }

    return balances;
  } catch (error) {
    console.error('Erreur lors du calcul des soldes:', error);
    return [];
  }
}

// Calculer les suggestions de remboursement
export function calculatePaymentSuggestions(
  balances: Balance[]
): PaymentSuggestion[] {
  try {
    // Si pas de balances, retourner un tableau vide
    if (!balances || balances.length === 0) {
      return [];
    }

    // Regrouper les soldes par groupe
    const groupBalances = new Map<string, Balance[]>();

    for (const balance of balances) {
      if (!groupBalances.has(balance.groupId)) {
        groupBalances.set(balance.groupId, []);
      }

      const groupBalanceArray = groupBalances.get(balance.groupId);
      if (groupBalanceArray) {
        groupBalanceArray.push({ ...balance }); // Copie pour éviter les modifications par référence
      }
    }

    const suggestions: PaymentSuggestion[] = [];

    // Calculer les suggestions pour chaque groupe
    groupBalances.forEach((groupBalanceArray, groupId) => {
      const debtors = groupBalanceArray
        .filter((b) => b.amount < 0)
        .sort((a, b) => a.amount - b.amount); // Du plus négatif au moins négatif

      const creditors = groupBalanceArray
        .filter((b) => b.amount > 0)
        .sort((a, b) => b.amount - a.amount); // Du plus positif au moins positif

      let debtorIndex = 0;
      let creditorIndex = 0;

      while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
        const debtor = debtors[debtorIndex];
        const creditor = creditors[creditorIndex];

        // Montant à rembourser (minimum entre la dette et la créance)
        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        if (amount > 0.01) {
          // Ignorer les très petits montants
          suggestions.push({
            from: debtor.participantId,
            fromName: debtor.participantName,
            to: creditor.participantId,
            toName: creditor.participantName,
            amount,
            groupId: debtor.groupId,
            groupName: debtor.groupName,
          });

          // Mettre à jour les soldes
          debtor.amount += amount;
          creditor.amount -= amount;
        }

        // Passer au prochain débiteur/créditeur si nécessaire
        if (Math.abs(debtor.amount) < 0.01) {
          debtorIndex++;
        }

        if (creditor.amount < 0.01) {
          creditorIndex++;
        }
      }
    });

    return suggestions;
  } catch (error) {
    console.error('Erreur lors du calcul des suggestions de paiement:', error);
    return [];
  }
}
