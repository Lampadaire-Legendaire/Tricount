import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Group } from '../types/group';
import type { Expense } from '../types/expense';

export interface Balance {
  participantId: string;
  participantName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export const calculateBalances = async (groupId?: string): Promise<Balance[]> => {
  try {
    // Récupérer les groupes
    const groupsRef = collection(db, 'groups');
    const groupsSnap = await getDocs(groupId 
      ? query(groupsRef, where('id', '==', groupId))
      : groupsRef
    );
    const groups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[];

    // Récupérer les dépenses
    const expensesRef = collection(db, 'expenses');
    const expensesSnap = await getDocs(groupId
      ? query(expensesRef, where('groupId', '==', groupId))
      : expensesRef
    );
    const expenses = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];

    // Calculer les soldes pour chaque participant dans chaque groupe
    const balances: Balance[] = [];
    
    groups.forEach(group => {
      const groupExpenses = expenses.filter(e => e.groupId === group.id);
      const totalGroupExpense = groupExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const sharePerPerson = totalGroupExpense / group.participants.length;

      group.participants.forEach(participant => {
        // Total payé par ce participant
        const totalPaid = groupExpenses
          .filter(e => e.paidBy === participant.id)
          .reduce((sum, exp) => sum + exp.amount, 0);

        // Solde = ce que la personne a payé - ce qu'elle devait payer
        const balance = totalPaid - sharePerPerson;

        balances.push({
          participantId: participant.id,
          participantName: participant.name,
          amount: balance,
          groupId: group.id,
          groupName: group.name,
        });
      });
    });

    return balances;
  } catch (error) {
    console.error('Error calculating balances:', error);
    throw new Error('Failed to calculate balances');
  }
};

export interface PaymentSuggestion {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  groupId: string;
  groupName: string;
}

export const calculatePaymentSuggestions = (balances: Balance[]): PaymentSuggestion[] => {
  const suggestions: PaymentSuggestion[] = [];
  
  // Regrouper les balances par groupe
  const groupedBalances = balances.reduce((acc, balance) => {
    if (!acc[balance.groupId]) {
      acc[balance.groupId] = [];
    }
    acc[balance.groupId].push(balance);
    return acc;
  }, {} as Record<string, Balance[]>);

  // Pour chaque groupe
  Object.entries(groupedBalances).forEach(([groupId, groupBalances]) => {
    const debtors = groupBalances.filter(b => b.amount < 0)
      .sort((a, b) => a.amount - b.amount);
    const creditors = groupBalances.filter(b => b.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      // Arrondir à 2 décimales pour éviter les problèmes de précision
      const debtAmount = Math.abs(Math.round(debtor.amount * 100) / 100);
      const creditAmount = Math.round(creditor.amount * 100) / 100;
      
      const amount = Math.min(debtAmount, creditAmount);
      
      if (amount > 0.01) { // Ignorer les très petits montants
        suggestions.push({
          from: debtor.participantId,
          fromName: debtor.participantName,
          to: creditor.participantId,
          toName: creditor.participantName,
          amount,
          groupId,
          groupName: debtor.groupName,
        });
      }

      // Mettre à jour les montants restants
      debtor.amount += amount;
      creditor.amount -= amount;

      // Passer au suivant si le solde est réglé
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }
  });

  return suggestions;
}; 