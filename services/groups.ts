import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInvitation } from './invitations';

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

// Créer un nouveau groupe
export async function createGroup(
  name: string,
  participants: {
    id: string;
    name: string;
    email?: string;
    pending?: boolean;
  }[]
): Promise<string> {
  try {
    console.log(
      `Création du groupe "${name}" avec ${participants.length} participants`
    );

    // Récupérer l'utilisateur actuel
    const currentUserJson = await AsyncStorage.getItem('currentUser');
    if (!currentUserJson) {
      throw new Error('Utilisateur non connecté');
    }

    const currentUser = JSON.parse(currentUserJson);
    console.log(`Utilisateur actuel: ${currentUser.name} (${currentUser.id})`);

    // Ajouter l'utilisateur actuel comme participant s'il n'est pas déjà inclus
    const currentUserIsParticipant = participants.some(
      (p) => p.id === currentUser.id
    );

    if (!currentUserIsParticipant) {
      console.log(`Ajout de l'utilisateur actuel comme participant`);
      participants.unshift({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        pending: false,
      });
    }

    // Séparer les participants confirmés et en attente
    const confirmedParticipants = participants.filter((p) => !p.pending);
    const pendingParticipants = participants.filter(
      (p) => p.pending && p.email
    );

    console.log(`Participants confirmés: ${confirmedParticipants.length}`);
    console.log(`Participants en attente: ${pendingParticipants.length}`);

    // Créer le groupe avec les participants confirmés
    const groupData = {
      name,
      participants: confirmedParticipants.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      createdBy: currentUser.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      total: 0,
    };

    // Ajouter le groupe à la collection
    const groupsCollection = collection(db, 'groups');
    const docRef = await addDoc(groupsCollection, groupData);
    const groupId = docRef.id;

    console.log(`Groupe créé avec succès. ID: ${groupId}`);

    // Envoyer des invitations aux participants en attente
    if (pendingParticipants.length > 0) {
      console.log(
        `Envoi des invitations aux ${pendingParticipants.length} participants en attente`
      );

      for (const participant of pendingParticipants) {
        if (!participant.email) {
          console.log(`Participant sans email, invitation ignorée`);
          continue;
        }

        try {
          console.log(`Envoi d'invitation à ${participant.email}`);
          const invitationId = await createInvitation(
            groupId,
            name,
            participant.email,
            currentUser.id,
            currentUser.name
          );
          console.log(
            `Invitation envoyée avec succès à ${participant.email}. ID: ${invitationId}`
          );
        } catch (error) {
          console.error(
            `Erreur lors de l'envoi de l'invitation à ${participant.email}:`,
            error
          );
        }
      }
    }

    return groupId;
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    throw error;
  }
}

// Récupérer tous les groupes de l'utilisateur
export async function getGroups() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const groupsCollection = collection(db, 'groups');

    // Requête pour trouver les groupes où l'utilisateur est participant
    const q = query(
      groupsCollection,
      where('participants', 'array-contains', {
        id: currentUser.id,
        name: currentUser.name,
      })
    );

    const querySnapshot = await getDocs(q);
    const groups = [];

    querySnapshot.forEach((doc) => {
      groups.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Trier les groupes par date de création (du plus récent au plus ancien)
    return groups.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
    throw error;
  }
}

// Récupérer un groupe par son ID
export async function getGroupById(groupId: string) {
  try {
    const docRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error('Groupe non trouvé');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du groupe:', error);
    throw error;
  }
}

// Mettre à jour un groupe
export async function updateGroup(
  groupId: string,
  data: { name?: string; participants?: { id: string; name: string }[] }
) {
  try {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du groupe:', error);
    throw error;
  }
}

// Supprimer un groupe
export async function deleteGroup(groupId: string) {
  try {
    // Vérifier si l'utilisateur est le créateur du groupe
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const groupDoc = await getGroupById(groupId);
    if (groupDoc.createdBy !== currentUser.id) {
      throw new Error("Vous n'êtes pas autorisé à supprimer ce groupe");
    }

    // Supprimer le groupe
    await deleteDoc(doc(db, 'groups', groupId));

    // Ici, on pourrait également supprimer toutes les dépenses associées au groupe
    // et les invitations en attente
  } catch (error) {
    console.error('Erreur lors de la suppression du groupe:', error);
    throw error;
  }
}

// Ajouter un participant à un groupe
export async function addParticipantToGroup(
  groupId: string,
  participant: { id: string; name: string }
) {
  try {
    console.log(`Ajout de ${participant.name} au groupe ${groupId}`);

    // Récupérer le groupe actuel
    const groupDoc = await getGroupById(groupId);

    // Vérifier si le participant existe déjà
    if (groupDoc.participants.some((p) => p.id === participant.id)) {
      console.log('Le participant existe déjà dans le groupe');
      return; // Le participant existe déjà
    }

    // Ajouter le participant à la liste
    const updatedParticipants = [...groupDoc.participants, participant];

    // Mettre à jour le groupe
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      participants: updatedParticipants,
      updatedAt: Date.now(),
    });

    console.log(`${participant.name} ajouté au groupe ${groupDoc.name}`);
  } catch (error) {
    console.error("Erreur lors de l'ajout du participant:", error);
    throw error;
  }
}

// Mettre à jour le total des dépenses d'un groupe
export async function updateGroupTotal(groupId: string, newTotal: number) {
  try {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      total: newTotal,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du total du groupe:', error);
    throw error;
  }
}
