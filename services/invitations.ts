import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserById, searchUserByEmail } from './users';

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
    console.log(
      `Création d'une invitation pour ${recipientEmail} au groupe ${groupName} (ID: ${groupId})`
    );
    console.log(`Expéditeur: ${senderName} (ID: ${senderId})`);

    // Vérifier si l'utilisateur existe
    const recipient = await searchUserByEmail(recipientEmail);
    console.log(
      `Destinataire trouvé: ${
        recipient ? 'Oui (ID: ' + recipient.id + ')' : 'Non'
      }`
    );

    // Créer les données de l'invitation
    const invitationData = {
      groupId,
      groupName,
      recipientEmail,
      recipientId: recipient ? recipient.id : null,
      senderId,
      senderName,
      status: 'pending',
      createdAt: Date.now(),
    };

    console.log("Données de l'invitation:", JSON.stringify(invitationData));

    // Méthode 1: addDoc - Méthode qui fonctionne selon les tests
    try {
      const invitationsCollection = collection(db, 'invitations');
      const docRef = await addDoc(invitationsCollection, invitationData);
      console.log(`Invitation créée avec succès (addDoc). ID: ${docRef.id}`);

      // Vérifier que l'invitation a été créée
      const docSnap = await getDoc(doc(db, 'invitations', docRef.id));
      if (docSnap.exists()) {
        console.log(`Vérification réussie: l'invitation existe dans Firestore`);
        return docRef.id;
      } else {
        console.error(`Erreur: l'invitation n'a pas été créée correctement`);
        throw new Error("L'invitation n'a pas été créée correctement");
      }
    } catch (error) {
      console.error(`Erreur avec addDoc: ${error.message}`);

      // Méthode 2: setDoc comme fallback
      try {
        const invitationId =
          'invitation-' +
          Date.now() +
          '-' +
          Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'invitations', invitationId), invitationData);
        console.log(
          `Invitation créée avec succès (setDoc). ID: ${invitationId}`
        );

        // Vérifier que l'invitation a été créée
        const docSnap = await getDoc(doc(db, 'invitations', invitationId));
        if (docSnap.exists()) {
          console.log(
            `Vérification réussie: l'invitation existe dans Firestore`
          );
          return invitationId;
        } else {
          console.error(`Erreur: l'invitation n'a pas été créée correctement`);
          throw new Error("L'invitation n'a pas été créée correctement");
        }
      } catch (secondError) {
        console.error(`Erreur avec setDoc: ${secondError.message}`);
        throw secondError;
      }
    }
  } catch (error) {
    console.error("Erreur lors de la création de l'invitation:", error);
    throw error;
  }
}

/**
 * Récupère les invitations en attente pour un utilisateur
 */
export async function getPendingInvitations(
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

    // Requête pour les invitations par ID utilisateur
    const qById = query(
      collection(db, 'invitations'),
      where('recipientId', '==', userId),
      where('status', '==', 'pending')
    );

    // Requête pour les invitations par email
    const qByEmail = query(
      collection(db, 'invitations'),
      where('recipientEmail', '==', user.email),
      where('status', '==', 'pending')
    );

    const [snapshotById, snapshotByEmail] = await Promise.all([
      getDocs(qById),
      getDocs(qByEmail),
    ]);

    console.log(`Invitations trouvées par ID: ${snapshotById.size}`);
    console.log(`Invitations trouvées par email: ${snapshotByEmail.size}`);

    const invitations: Invitation[] = [];

    // Ajouter les invitations par ID
    snapshotById.forEach((doc) => {
      invitations.push({
        id: doc.id,
        ...doc.data(),
      } as Invitation);
    });

    // Ajouter les invitations par email qui ne sont pas déjà incluses
    snapshotByEmail.forEach((doc) => {
      const invitation = {
        id: doc.id,
        ...doc.data(),
      } as Invitation;

      if (!invitations.some((inv) => inv.id === invitation.id)) {
        invitations.push(invitation);

        // Mettre à jour l'invitation avec l'ID de l'utilisateur si ce n'est pas déjà fait
        if (!doc.data().recipientId) {
          updateDoc(doc.ref, {
            recipientId: userId,
          }).catch((err) =>
            console.error("Erreur lors de la mise à jour de l'invitation:", err)
          );
        }
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

    // Mettre à jour le statut de l'invitation
    await updateDoc(invitationRef, {
      status: 'accepted',
      updatedAt: Date.now(),
    });

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
