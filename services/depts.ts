import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Dept {
  expenseId: string;
  groupId: string;
  payerId: string;
  amount: number;
  debtors: {
    userId: string;
    amount: number;
  }[];
  createdAt: number;
}

export async function createDept(deptData: Omit<Dept, 'id'>) {
  try {
    const deptsRef = collection(db, 'depts');
    const docRef = await addDoc(deptsRef, deptData);
    console.log('Dette créée avec succès:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de la dette:', error);
    throw error;
  }
}

// Récupérer toutes les dettes d'un groupe
export async function getDeptsByGroupId(groupId: string) {
  try {
    const deptsRef = collection(db, 'depts');
    const q = query(deptsRef, where('groupId', '==', groupId));
    const querySnapshot = await getDocs(q);

    const depts: Dept[] = [];
    querySnapshot.forEach((doc) => {
      depts.push({ id: doc.id, ...doc.data() } as Dept);
    });

    return depts;
  } catch (error) {
    console.error('Erreur lors de la récupération des dettes:', error);
    throw error;
  }
}
