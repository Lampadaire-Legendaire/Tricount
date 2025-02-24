import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense } from '../types/expense';

// Collection de référence
const expensesCollection = collection(db, 'expenses');
const groupsCollection = collection(db, 'groups');

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

// Créer une nouvelle dépense
export async function createExpense(
  groupId: string,
  title: string,
  amount: number,
  paidBy: { id: string; name: string },
  participants: { id: string; name: string }[]
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn(
        'Tentative de création de dépense sans utilisateur connecté'
      );
      return null;
    }

    const newExpense = {
      groupId,
      title,
      amount,
      paidBy,
      participants,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    // Ajouter la dépense
    const docRef = await addDoc(expensesCollection, newExpense);

    // Mettre à jour le total du groupe
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      const groupData = groupSnap.data();
      await updateDoc(groupRef, {
        total: (groupData.total || 0) + amount,
      });
    }

    return { id: docRef.id, ...newExpense };
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    throw error;
  }
}

// Récupérer toutes les dépenses d'un groupe
export async function getExpenses(groupId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn(
        'Tentative de récupération des dépenses sans utilisateur connecté'
      );
      return [];
    }

    const q = query(
      expensesCollection,
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() } as Expense);
    });

    return expenses;
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    return [];
  }
}

// Mettre à jour une dépense
export async function updateExpense(
  expenseId: string,
  title: string,
  amount: number,
  paidBy: { id: string; name: string },
  participants: { id: string; name: string }[]
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn(
        'Tentative de mise à jour de dépense sans utilisateur connecté'
      );
      return null;
    }

    // Récupérer l'ancienne dépense pour calculer la différence de montant
    const expenseRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
      throw new Error('Dépense non trouvée');
    }

    const oldExpense = expenseSnap.data();
    const amountDifference = amount - oldExpense.amount;

    // Mettre à jour la dépense
    await updateDoc(expenseRef, {
      title,
      amount,
      paidBy,
      participants,
    });

    // Mettre à jour le total du groupe si le montant a changé
    if (amountDifference !== 0) {
      const groupRef = doc(db, 'groups', oldExpense.groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        await updateDoc(groupRef, {
          total: (groupData.total || 0) + amountDifference,
        });
      }
    }

    return {
      id: expenseId,
      groupId: oldExpense.groupId,
      title,
      amount,
      paidBy,
      participants,
      createdAt: oldExpense.createdAt,
      createdBy: oldExpense.createdBy,
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la dépense:', error);
    throw error;
  }
}

// Supprimer une dépense
export async function deleteExpense(expenseId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn(
        'Tentative de suppression de dépense sans utilisateur connecté'
      );
      return false;
    }

    // Récupérer la dépense pour soustraire son montant du total du groupe
    const expenseRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseRef);

    if (!expenseSnap.exists()) {
      throw new Error('Dépense non trouvée');
    }

    const expense = expenseSnap.data();

    // Supprimer la dépense
    await deleteDoc(expenseRef);

    // Mettre à jour le total du groupe
    const groupRef = doc(db, 'groups', expense.groupId);
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      const groupData = groupSnap.data();
      await updateDoc(groupRef, {
        total: (groupData.total || 0) - expense.amount,
      });
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    throw error;
  }
}
