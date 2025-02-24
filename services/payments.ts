import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Payment } from '../types/payment';

export const createPayment = async (
  fromId: string,
  toId: string,
  amount: number,
  groupId: string
): Promise<string> => {
  try {
    const paymentData = {
      fromId,
      toId,
      amount,
      groupId,
      createdAt: serverTimestamp(),
      status: 'pending'
    };

    const docRef = await addDoc(collection(db, 'payments'), paymentData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw new Error('Failed to create payment');
  }
};

export const markPaymentAsCompleted = async (paymentId: string): Promise<void> => {
  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status: 'completed',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    throw new Error('Failed to update payment');
  }
}; 