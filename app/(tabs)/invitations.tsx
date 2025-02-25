import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
} from '../../services/invitations';
import { addParticipantToGroup } from '../../services/groups';

export default function InvitationsScreen() {
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user, params.refresh]);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      console.log('Chargement des invitations...');
      const userInvitations = await getPendingInvitations(user.id);
      console.log(`${userInvitations.length} invitations trouvées`);
      setInvitations(userInvitations);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
      Alert.alert('Erreur', 'Impossible de charger les invitations');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const updateGlobalInvitationsCount = () => {
    // Cette fonction sera appelée après chaque action sur une invitation
    // Le compteur sera mis à jour automatiquement lors du prochain rendu
    // grâce au useEffect dans app.tsx
  };

  const handleAcceptInvitation = async (invitation) => {
    try {
      setIsLoading(true);
      console.log(
        `Acceptation de l'invitation ${invitation.id} pour le groupe ${invitation.groupName}`
      );

      // Accepter l'invitation
      await acceptInvitation(invitation.id);

      // Ajouter l'utilisateur au groupe
      await addParticipantToGroup(invitation.groupId, {
        id: user.id,
        name: user.name,
      });

      // Mettre à jour la liste des invitations
      setInvitations(invitations.filter((inv) => inv.id !== invitation.id));

      Alert.alert(
        'Invitation acceptée',
        `Vous avez rejoint le groupe "${invitation.groupName}"`
      );

      // Rediriger vers l'écran d'accueil avec un paramètre pour rafraîchir la liste
      router.replace({
        pathname: '/(tabs)',
        params: { refresh: Date.now().toString() },
      });
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'invitation:", error);
      Alert.alert('Erreur', "Impossible d'accepter l'invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitation) => {
    try {
      setIsLoading(true);
      console.log(
        `Refus de l'invitation ${invitation.id} pour le groupe ${invitation.groupName}`
      );

      // Refuser l'invitation
      await declineInvitation(invitation.id);

      // Mettre à jour la liste des invitations
      setInvitations(invitations.filter((inv) => inv.id !== invitation.id));

      Alert.alert(
        'Invitation refusée',
        `Vous avez refusé de rejoindre le groupe "${invitation.groupName}"`
      );
    } catch (error) {
      console.error("Erreur lors du refus de l'invitation:", error);
      Alert.alert('Erreur', "Impossible de refuser l'invitation");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des invitations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
              <Text style={styles.groupName}>{item.groupName}</Text>
              <Text style={styles.invitationDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.invitationText}>
              <Text style={styles.senderName}>{item.senderName}</Text> vous
              invite à rejoindre ce groupe
            </Text>
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleDeclineInvitation(item)}
              >
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.buttonText}>Refuser</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptInvitation(item)}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.buttonText}>Accepter</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Aucune invitation en attente</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
          />
        }
        contentContainerStyle={
          invitations.length === 0 ? { flex: 1 } : styles.listContent
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  listContent: {
    padding: 16,
  },
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  invitationDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  invitationText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
  },
  senderName: {
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.48,
  },
  acceptButton: {
    backgroundColor: '#2563EB',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
