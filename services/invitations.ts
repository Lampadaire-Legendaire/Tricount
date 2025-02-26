import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserById } from './users';
import { searchUserByEmail } from './users';
import type { Invitation } from '../types/invitation';

// Interface pour les invitations
export interface Invitation {
  id?: string;
  groupId: string;
  groupName: string;
  recipientEmail: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

/**
 * Crée une nouvelle invitation
 */
export async function createInvitation(
  groupId: string,
  groupName: string,
  recipientEmail: string,
  senderId: string,
  senderName: string
): Promise<string> {
  try {
    console.log('=== DÉBUT createInvitation ===');
    console.log(
      `Création d'invitation pour ${recipientEmail} au groupe ${groupName} (ID: ${groupId})`
    );
    console.log(`Expéditeur: ${senderName} (ID: ${senderId})`);

    if (!recipientEmail || !groupId || !senderId) {
      throw new Error("Paramètres d'invitation incomplets");
    }

    // Rechercher l'utilisateur destinataire par email
    let recipientId = null;
    try {
      const recipient = await searchUserByEmail(recipientEmail);
      if (recipient) {
        recipientId = recipient.id;
        console.log(`Destinataire trouvé: ID ${recipientId}`);
      } else {
        console.log(`Aucun utilisateur trouvé avec l'email ${recipientEmail}`);
      }
    } catch (searchError) {
      console.error(
        "Erreur lors de la recherche de l'utilisateur:",
        searchError
      );
      // Continuer même si la recherche échoue
    }

    // Créer les données de l'invitation
    const invitationData = {
      groupId,
      groupName,
      recipientEmail,
      recipientId,
      senderId,
      senderName,
      status: 'pending',
      createdAt: Date.now(),
    };

    console.log(`Données de l'invitation: ${JSON.stringify(invitationData)}`);

    // Ajouter directement l'invitation à Firestore
    const invitationsCollection = collection(db, 'invitations');
    console.log("Tentative d'ajout à la collection 'invitations'...");
    const docRef = await addDoc(invitationsCollection, invitationData);

    console.log(`Invitation créée avec succès. ID: ${docRef.id}`);
    console.log('=== FIN createInvitation ===');
    return docRef.id;
  } catch (error) {
    console.error('=== ERREUR dans createInvitation ===');
    console.error(`Erreur lors de la création de l'invitation:`, error);
    throw error;
  }
}

/**
 * Récupère les invitations en attente pour un utilisateur
 */
export async function getPendingInvitationsForUser(
  userId: string
): Promise<Invitation[]> {
  try {
    console.log(`Récupération des invitations pour l'utilisateur ${userId}`);

    // Récupérer l'utilisateur pour obtenir son email
    const user = await getUserById(userId);
    if (!user) {
      console.error('Utilisateur non trouvé');
      throw new Error('Utilisateur non trouvé');
    }

    console.log(`Email de l'utilisateur: ${user.email}`);

    const invitationsCollection = collection(db, 'invitations');

    // Requête pour les invitations par ID utilisateur
    console.log(`Recherche des invitations par ID utilisateur: ${userId}`);
    const qById = query(
      invitationsCollection,
      where('recipientId', '==', userId),
      where('status', '==', 'pending')
    );

    // Requête pour les invitations par email
    console.log(`Recherche des invitations par email: ${user.email}`);
    const qByEmail = query(
      invitationsCollection,
      where('recipientEmail', '==', user.email),
      where('status', '==', 'pending')
    );

    const [querySnapshotById, querySnapshotByEmail] = await Promise.all([
      getDocs(qById),
      getDocs(qByEmail),
    ]);

    console.log(`Invitations trouvées par ID: ${querySnapshotById.size}`);
    console.log(`Invitations trouvées par email: ${querySnapshotByEmail.size}`);

    const invitations: Invitation[] = [];

    // Ajouter les invitations par ID
    querySnapshotById.forEach((doc) => {
      const data = doc.data();
      console.log(`Invitation par ID: ${doc.id}, groupe: ${data.groupName}`);
      invitations.push({
        id: doc.id,
        ...data,
      } as Invitation);
    });

    // Ajouter les invitations par email qui ne sont pas déjà incluses
    querySnapshotByEmail.forEach((doc) => {
      const data = doc.data();
      console.log(`Invitation par email: ${doc.id}, groupe: ${data.groupName}`);

      const invitation = {
        id: doc.id,
        ...data,
      } as Invitation;

      // Vérifier si cette invitation n'est pas déjà dans la liste
      if (!invitations.some((inv) => inv.id === invitation.id)) {
        console.log(`Ajout de l'invitation ${doc.id} à la liste`);
        invitations.push(invitation);

        // Mettre à jour l'invitation avec l'ID de l'utilisateur si ce n'est pas déjà fait
        if (!data.recipientId) {
          console.log(
            `Mise à jour de l'invitation ${doc.id} avec l'ID utilisateur ${userId}`
          );
          updateDoc(doc.ref, {
            recipientId: userId,
            updatedAt: Date.now(),
          }).catch((err) =>
            console.error("Erreur lors de la mise à jour de l'invitation:", err)
          );
        }
      } else {
        console.log(`L'invitation ${doc.id} est déjà dans la liste`);
      }
    });

    console.log(`Total des invitations: ${invitations.length}`);
    return invitations;
  } catch (error) {
    console.error('Erreur lors de la récupération des invitations:', error);
    throw error;
  }
}

/**
 * Accepte une invitation
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation non trouvée');
    }

    const invitationData = invitationDoc.data();
    const { groupId, recipientEmail } = invitationData;

    // Mettre à jour le statut de l'invitation
    await updateDoc(invitationRef, {
      status: 'accepted',
      updatedAt: Date.now(),
    });

    // Mettre à jour le groupe pour retirer l'email de la liste des invités
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);

    if (groupDoc.exists()) {
      const groupData = groupDoc.data();
      const invitedUsers = groupData.invitedUsers || [];

      // Filtrer l'email de l'utilisateur qui vient d'accepter
      const updatedInvitedUsers = invitedUsers.filter(
        (email) => email !== recipientEmail
      );

      // Mettre à jour le document du groupe
      await updateDoc(groupRef, {
        invitedUsers: updatedInvitedUsers,
        updatedAt: Date.now(),
      });
    }

    console.log(`Invitation ${invitationId} acceptée`);
  } catch (error) {
    console.error("Erreur lors de l'acceptation de l'invitation:", error);
    throw error;
  }
}

/**
 * Refuse une invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation non trouvée');
    }

    // Mettre à jour le statut de l'invitation
    await updateDoc(invitationRef, {
      status: 'declined',
      updatedAt: Date.now(),
    });

    console.log(`Invitation ${invitationId} refusée`);
  } catch (error) {
    console.error("Erreur lors du refus de l'invitation:", error);
    throw error;
  }
}

/**
 * Vérifie si une invitation existe déjà
 */
export async function checkInvitationExists(
  groupId: string,
  recipientEmail: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('groupId', '==', groupId),
      where('recipientEmail', '==', recipientEmail),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'invitation:", error);
    throw error;
  }
}

// Alias pour la compatibilité avec le code existant
export const getPendingInvitations = getPendingInvitationsForUser;

// Envoyer une invitation à un utilisateur
export async function sendInvitation(
  groupId: string,
  groupName: string,
  recipientEmail: string,
  senderId: string,
  senderName: string
): Promise<string> {
  try {
    console.log(
      `Début de l'envoi d'invitation à ${recipientEmail} pour le groupe ${groupName} (ID: ${groupId})`
    );
    console.log(`Expéditeur: ${senderName} (ID: ${senderId})`);

    if (!recipientEmail || !groupId || !senderId) {
      throw new Error("Paramètres d'invitation incomplets");
    }

    // Rechercher l'utilisateur destinataire par email
    let recipientId = null;
    try {
      const recipient = await searchUserByEmail(recipientEmail);
      if (recipient) {
        recipientId = recipient.id;
        console.log(`Destinataire trouvé: ID ${recipientId}`);
      } else {
        console.log(`Aucun utilisateur trouvé avec l'email ${recipientEmail}`);
      }
    } catch (searchError) {
      console.error(
        "Erreur lors de la recherche de l'utilisateur:",
        searchError
      );
      // Continuer même si la recherche échoue
    }

    // Créer les données de l'invitation
    const invitationData = {
      groupId,
      groupName,
      recipientEmail,
      recipientId,
      senderId,
      senderName,
      status: 'pending',
      createdAt: Date.now(),
    };

    console.log(`Données de l'invitation: ${JSON.stringify(invitationData)}`);

    // Ajouter l'invitation à Firestore
    const invitationsCollection = collection(db, 'invitations');
    const docRef = await addDoc(invitationsCollection, invitationData);

    console.log(`Invitation créée avec succès. ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation:", error);
    throw error;
  }
}
