import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Collection de référence
const paymentsCollection = collection(db, 'payments');

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

// Créer un nouveau paiement
export async function createPayment(
  fromId: string,
  toId: string,
  amount: number,
  groupId: string
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn(
        'Tentative de création de paiement sans utilisateur connecté'
      );
      return null;
    }

    const newPayment = {
      fromId,
      toId,
      amount,
      groupId,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    const docRef = await addDoc(paymentsCollection, newPayment);
    return { id: docRef.id, ...newPayment };
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    throw error;
  }
}

export const markPaymentAsCompleted = async (
  paymentId: string
): Promise<void> => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: 'completed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    throw new Error('Failed to update payment');
  }
};
