import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Chargement des invitations...');

      const pendingInvitations = await getPendingInvitations(user.id);
      console.log(
        `${pendingInvitations.length} invitations en attente trouvées`
      );
      setInvitations(pendingInvitations);
    } catch (err) {
      console.error('Erreur lors du chargement des invitations:', err);
      setError('Impossible de charger vos invitations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInvitations();
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

  const renderInvitationItem = ({ item }) => (
    <View style={styles.invitationCard}>
      <View style={styles.invitationInfo}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <Text style={styles.invitationText}>
          {item.senderName} vous invite à rejoindre ce groupe
        </Text>
      </View>
      <View style={styles.invitationActions}>
        <Pressable
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptInvitation(item)}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDeclineInvitation(item)}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadInvitations} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={renderInvitationItem}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune invitation en attente</Text>
            <Text style={styles.emptySubtext}>
              Les invitations que vous recevez apparaîtront ici
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  invitationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invitationInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  invitationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  invitationActions: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
