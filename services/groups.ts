import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Group } from '../types/group';

export const createGroup = async (
  name: string,
  participants: string[]
): Promise<string> => {
  try {
    const groupData = {
      name,
      participants: participants.map(name => ({
        id: Math.random().toString(36).substr(2, 9),
        name
      })),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      total: 0
    };

    const docRef = await addDoc(collection(db, 'groups'), groupData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw new Error('Failed to create group');
  }
};

export const getGroups = async (): Promise<Group[]> => {
  try {
    const q = query(
      collection(db, 'groups'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Group[];
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw new Error('Failed to fetch groups');
  }
};

export async function getGroupById(groupId: string): Promise<Group> {
  try {
    const docRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Groupe non trouvé');
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Group;
  } catch (error) {
    console.error('Error fetching group:', error);
    throw new Error('Impossible de récupérer le groupe');
  }
}

export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw new Error('Failed to delete group');
  }
};

export async function updateGroup(groupId: string, groupData: Partial<Group>): Promise<Group> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    
    const updateData = {
      ...groupData,
      updatedAt: serverTimestamp()
    };

    await updateDoc(groupRef, updateData);
    
    // Récupérer et retourner le groupe mis à jour
    const updatedDoc = await getDoc(groupRef);
    if (!updatedDoc.exists()) {
      throw new Error('Groupe non trouvé après mise à jour');
    }

    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Group;
  } catch (error) {
    console.error('Error updating group:', error);
    throw new Error('Impossible de mettre à jour le groupe');
  }
}