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
import type { Group } from '../types/group';

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
  invitedEditors: {
    id: string;
    name: string;
    email?: string;
  }[] = [], // Éditeurs invités
  participants: {
    name: string;
  }[]
): Promise<string> {
  try {
    console.log(
      `Création du groupe "${name}" avec ${
        invitedEditors?.length || 0
      } éditeurs invités et ${participants.length} participants`
    );

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    // Vérifier que les noms des participants sont uniques
    const participantNames = participants.map((p) => p.name.trim());
    const uniqueNames = new Set(participantNames);

    if (uniqueNames.size !== participantNames.length) {
      throw new Error('Les noms des participants doivent être uniques');
    }

    // Filtrer les participants pour exclure ceux qui ont le même nom que les éditeurs invités
    const invitedEditorNames = invitedEditors.map((editor) =>
      editor.name.trim()
    );
    const filteredParticipants = participants.filter(
      (participant) => !invitedEditorNames.includes(participant.name.trim())
    );

    // Simplifier les participants - juste le nom
    const simplifiedParticipants = filteredParticipants.map((participant) => ({
      name: participant.name.trim(),
    }));

    // S'assurer que invitedEditors est un tableau d'objets avec la structure correcte
    const formattedInvitedEditors = invitedEditors.map((editor) => ({
      id: editor.id,
      name: editor.name,
      email: editor.email,
    }));

    // Créer le document du groupe avec la structure correcte
    const groupData = {
      name: name.trim(), // Nom du groupe au niveau racine
      editors: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        },
      ],
      invitedEditors: formattedInvitedEditors,
      participants: simplifiedParticipants,
      total: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: currentUser.id,
    };

    console.log(
      'Structure du groupe à créer:',
      JSON.stringify(groupData, null, 2)
    );

    // Ajouter le document à Firestore
    const docRef = await addDoc(collection(db, 'groups'), groupData);

    console.log(`Groupe créé avec succès. ID: ${docRef.id}`);

    // Envoyer des invitations aux éditeurs invités
    if (invitedEditors && invitedEditors.length > 0) {
      console.log(`Envoi d'invitations à ${invitedEditors.length} éditeurs...`);

      // Envoyer les invitations une par une
      for (const editor of invitedEditors) {
        if (editor.email) {
          try {
            console.log(`Envoi d'invitation à ${editor.email}...`);

            // Utiliser la fonction createInvitation du service invitations
            const invitationId = await createInvitation(
              docRef.id,
              name,
              editor.email,
              currentUser.id,
              currentUser.name
            );

            console.log(`Invitation envoyée avec succès. ID: ${invitationId}`);
          } catch (inviteError) {
            console.error(
              `Erreur lors de l'envoi de l'invitation à ${editor.email}:`,
              inviteError
            );
            // Continuer avec les autres invitations même si une échoue
          }
        }
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    throw error;
  }
}

// Récupérer les groupes de l'utilisateur
export async function getGroups(): Promise<Group[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    console.log(
      `Récupération des groupes pour l'utilisateur ${currentUser.id}`
    );

    // Récupérer les groupes où l'utilisateur est éditeur
    const q = query(
      collection(db, 'groups'),
      where('editors', 'array-contains', {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      })
    );

    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name,
        editors: data.editors || [],
        participants: data.participants || [],
        total: data.total || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
      });
    });

    console.log(`${groups.length} groupes trouvés`);
    return groups;
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes:', error);
    throw error;
  }
}

// Récupérer un groupe par son ID
export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    console.log(`Récupération du groupe ${groupId}`);

    if (!groupId) {
      console.error('ID de groupe non fourni');
      return null;
    }

    const docRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(`Groupe ${groupId} non trouvé`);
      return null;
    }

    const data = docSnap.data();
    console.log('Données du groupe récupérées:', JSON.stringify(data, null, 2));

    return {
      id: docSnap.id,
      name: data.name || '',
      editors: data.editors || [],
      participants: data.participants || [],
      total: data.total || 0,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
      createdBy: data.createdBy || '',
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du groupe:', error);
    throw error;
  }
}

// Mettre à jour un groupe
export async function updateGroup(
  groupId: string,
  updatedGroup: Partial<Group>
): Promise<void> {
  try {
    console.log(`Mise à jour du groupe ${groupId}`);

    const docRef = doc(db, 'groups', groupId);

    // Récupérer le groupe actuel pour vérifier les autorisations
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) {
      throw new Error('Groupe non trouvé');
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const currentData = currentDoc.data();

    // Vérifier que l'utilisateur est un éditeur du groupe
    const isEditor = currentData.editors.some(
      (editor) => editor.id === currentUser.id
    );

    if (!isEditor) {
      throw new Error("Vous n'avez pas les droits pour modifier ce groupe");
    }

    // Si l'utilisateur essaie de modifier les éditeurs, vérifier qu'il est le créateur
    if (updatedGroup.editors && currentData.createdBy !== currentUser.id) {
      throw new Error('Seul le créateur du groupe peut modifier les éditeurs');
    }

    // Mettre à jour le document
    await updateDoc(docRef, {
      ...updatedGroup,
      updatedAt: Date.now(),
    });

    console.log(`Groupe ${groupId} mis à jour avec succès`);
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

// Ajouter un éditeur à un groupe
export async function addEditorToGroup(
  groupId: string,
  editor: {
    id: string;
    name: string;
    email?: string;
  }
): Promise<void> {
  try {
    console.log(`Ajout de l'éditeur ${editor.name} au groupe ${groupId}`);

    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (!groupDoc.exists()) {
      throw new Error('Groupe non trouvé');
    }

    const groupData = groupDoc.data();
    const editors = groupData.editors || [];
    const invitedEditors = groupData.invitedEditors || [];

    // Vérifier si l'utilisateur est déjà un éditeur
    if (editors.some((e: any) => e.id === editor.id)) {
      console.log(`L'utilisateur ${editor.name} est déjà un éditeur du groupe`);
      return;
    }

    // Ajouter l'utilisateur à la liste des éditeurs
    editors.push(editor);

    // Retirer l'utilisateur de la liste des éditeurs invités
    const updatedInvitedEditors = invitedEditors.filter(
      (e: any) => e.id !== editor.id
    );

    // Mettre à jour le document du groupe
    await updateDoc(groupRef, {
      editors,
      invitedEditors: updatedInvitedEditors,
      updatedAt: Date.now(),
    });

    console.log(`Éditeur ${editor.name} ajouté au groupe ${groupId}`);
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'éditeur au groupe:", error);
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

// Fonction pour retirer un éditeur d'un groupe
export async function removeEditorFromGroup(groupId: string, editorId: string) {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      throw new Error('Groupe non trouvé');
    }

    const groupData = groupSnap.data();

    // Filtrer la liste des éditeurs pour retirer l'éditeur qui quitte
    const updatedEditors = groupData.editors.filter(
      (editor: { id: string }) => editor.id !== editorId
    );

    // Mettre à jour le document du groupe avec la nouvelle liste d'éditeurs
    await updateDoc(groupRef, {
      editors: updatedEditors,
      updatedAt: Date.now(),
    });

    console.log(`Éditeur ${editorId} retiré du groupe ${groupId}`);
  } catch (error) {
    console.error("Erreur lors du retrait de l'éditeur:", error);
    throw error;
  }
}

export { getGroups as getUserGroups };

export { getGroups as getUserGroups };
