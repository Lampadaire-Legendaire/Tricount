import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface pour les utilisateurs
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

// Interface pour les invitations
export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  recipientEmail: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

// Rechercher un utilisateur par email
export async function searchUserByEmail(email: string) {
  try {
    console.log(`Recherche de l'utilisateur avec l'email: ${email}`);

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('Aucun utilisateur trouvé avec cet email');
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    return {
      id: userDoc.id,
      name: userData.name || '',
      email: userData.email || '',
    };
  } catch (error) {
    console.error("Erreur lors de la recherche de l'utilisateur:", error);
    throw error;
  }
}

// Récupérer les informations d'un utilisateur par ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as User;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    throw error;
  }
}

// Mettre à jour le profil d'un utilisateur
export async function updateUserProfile(
  userId: string,
  data: Partial<User>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: Date.now(),
    });

    // Mettre à jour les informations dans AsyncStorage si c'est l'utilisateur actuel
    const currentUserJson = await AsyncStorage.getItem('currentUser');
    if (currentUserJson) {
      const currentUser = JSON.parse(currentUserJson);
      if (currentUser.id === userId) {
        const updatedUser = {
          ...currentUser,
          ...data,
        };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    throw error;
  }
}

// Récupérer les invitations en attente pour un utilisateur
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

    // Générer un ID unique pour l'invitation
    const invitationId = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    console.log(`ID d'invitation généré: ${invitationId}`);

    // Créer directement le document dans Firestore
    console.log(
      `Tentative de création du document dans la collection 'invitations'...`
    );

    try {
      // Utiliser la méthode la plus directe possible
      await setDoc(doc(db, 'invitations', invitationId), invitationData);
      console.log(
        `Document créé avec succès dans la collection 'invitations' avec l'ID: ${invitationId}`
      );

      // Vérifier immédiatement que le document a été créé
      const docRef = doc(db, 'invitations', invitationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log(`Vérification réussie: le document existe dans Firestore`);
        return invitationId;
      } else {
        console.error(`Erreur: le document n'a pas été créé correctement`);
        throw new Error("L'invitation n'a pas été créée correctement");
      }
    } catch (error) {
      console.error(`Erreur lors de la création du document:`, error);

      // Essayer une autre approche avec addDoc
      console.log(`Tentative alternative avec addDoc...`);
      const invitationsCollectionRef = collection(db, 'invitations');
      const newDocRef = await addDoc(invitationsCollectionRef, invitationData);

      console.log(`Document créé avec succès via addDoc. ID: ${newDocRef.id}`);
      return newDocRef.id;
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation:", error);
    throw error;
  }
}

// Accepter une invitation
export async function acceptInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation non trouvée');
    }

    const invitation = invitationDoc.data() as Invitation;

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

// Refuser une invitation
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
