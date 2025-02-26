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

// Interface pour les dépenses
export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string;
  participants: string[];
  createdBy: string;
  createdAt: number;
}

// Créer une nouvelle dépense
export async function createExpense(expenseData: Omit<Expense, 'id'>) {
  try {
    console.log("Création d'une nouvelle dépense:", expenseData);

    // Vérifier si une dépense similaire existe déjà (pour éviter les doublons)
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('groupId', '==', expenseData.groupId),
      where('title', '==', expenseData.title),
      where('amount', '==', expenseData.amount),
      where('createdAt', '==', expenseData.createdAt)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.warn('Une dépense similaire existe déjà, possible doublon');
    }

    // Créer la dépense
    const docRef = await addDoc(expensesRef, expenseData);
    console.log(`Dépense créée avec l'ID: ${docRef.id}`);

    // Mettre à jour le total du groupe
    await updateGroupTotal(expenseData.groupId);

    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de la dépense:', error);
    throw error;
  }
}

// Récupérer toutes les dépenses d'un groupe
export async function getExpensesByGroupId(
  groupId: string
): Promise<Expense[]> {
  try {
    console.log(`Récupération des dépenses pour le groupe ${groupId}`);

    const expensesRef = collection(db, 'expenses');

    // Modification de la requête pour éviter l'erreur d'index
    // Nous utilisons d'abord une requête simple par groupId
    const q = query(expensesRef, where('groupId', '==', groupId));

    const querySnapshot = await getDocs(q);
    const expenses: Expense[] = [];

    querySnapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
      } as Expense);
    });

    // Tri côté client au lieu d'utiliser orderBy dans la requête
    expenses.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`${expenses.length} dépenses récupérées`);
    return expenses;
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    throw error;
  }
}

// Récupérer une dépense par son ID
export async function getExpenseById(
  expenseId: string
): Promise<Expense | null> {
  try {
    const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));

    if (!expenseDoc.exists()) {
      return null;
    }

    return {
      id: expenseDoc.id,
      ...expenseDoc.data(),
    } as Expense;
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error);
    throw error;
  }
}

// Supprimer une dépense
export async function deleteExpense(expenseId: string, groupId: string) {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    console.log(`Dépense ${expenseId} supprimée`);

    // Mettre à jour le total du groupe
    await updateGroupTotal(groupId);
  } catch (error) {
    console.error('Erreur lors de la suppression de la dépense:', error);
    throw error;
  }
}

// Mettre à jour le total du groupe
async function updateGroupTotal(groupId: string) {
  try {
    // Récupérer toutes les dépenses du groupe sans utiliser orderBy
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('groupId', '==', groupId));

    const querySnapshot = await getDocs(q);
    let total = 0;

    // Calculer le total - une seule fois par dépense
    querySnapshot.forEach((doc) => {
      const expense = doc.data();
      total += Number(expense.amount);
    });

    console.log(`Calcul du total pour le groupe ${groupId}: ${total}€`);

    // Mettre à jour le groupe avec le total exact
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      total,
      updatedAt: Date.now(),
    });

    console.log(`Total du groupe ${groupId} mis à jour: ${total}€`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du total du groupe:', error);
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
