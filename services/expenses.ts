import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, where, doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Expense } from '../types/expense';

export const createExpense = async (
  title: string,
  amount: number,
  groupId: string,
  paidBy: string
): Promise<string> => {
  try {
    const expenseRef = doc(collection(db, 'expenses'));
    const groupRef = doc(db, 'groups', groupId);

    await runTransaction(db, async (transaction) => {
      // Lecture du groupe AVANT toute écriture
      const groupDoc = await transaction.get(groupRef);
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      // Préparation des données
      const currentTotal = groupDoc.data().total || 0;
      const expenseData = {
        id: expenseRef.id,
        title,
        amount,
        groupId,
        paidBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Écritures après toutes les lectures
      transaction.set(expenseRef, expenseData);
      transaction.update(groupRef, {
        total: currentTotal + amount,
        updatedAt: serverTimestamp(),
      });
    });

    return expenseRef.id;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw new Error('Failed to create expense');
  }
};

export async function getExpenses(groupId: string): Promise<Expense[]> {
  try {
    // Requête simple sans orderBy pour éviter le besoin d'index composite
    const q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId)
    );
    
    const querySnapshot = await getDocs(q);
    const expenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().getTime() || Date.now(),
    })) as Expense[];

    // Tri côté client
    return expenses.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw new Error('Failed to fetch expenses');
  }
} 