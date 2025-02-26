import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getGroupById } from '../services/groups';
import { createExpense } from '../services/expenses';
import { useAuth } from '../lib/auth-context';
import type { Group } from '../types/group';
import { createDept } from '../services/depts';

export default function NewExpenseScreen() {
  const params = useLocalSearchParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [participants, setParticipants] = useState<
    { id: string; name: string; selected: boolean }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaidByDropdown, setShowPaidByDropdown] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroup();
    } else {
      setError('ID de groupe manquant');
      setIsLoading(false);
    }
  }, [groupId]);

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Chargement du groupe ${groupId}...`);

      const fetchedGroup = await getGroupById(groupId);
      console.log('Groupe récupéré:', fetchedGroup);

      if (fetchedGroup) {
        setGroup(fetchedGroup);

        // Initialiser les participants avec leur nom comme ID
        const initialParticipants = fetchedGroup.participants.map(
          (participant) => ({
            id: participant.name, // Utiliser le nom comme ID
            name: participant.name,
            selected: true,
          })
        );
        setParticipants(initialParticipants);

        // Par défaut, le payeur est le premier participant
        if (initialParticipants.length > 0) {
          setPaidBy(initialParticipants[0].id);
        }
      } else {
        setError('Groupe non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du groupe:', error);
      setError('Impossible de charger les informations du groupe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !group) return;

    // Validation des champs
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre pour la dépense');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (!paidBy) {
      Alert.alert('Erreur', 'Veuillez sélectionner qui a payé');
      return;
    }

    const selectedParticipants = participants.filter((p) => p.selected);
    if (selectedParticipants.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un participant');
      return;
    }

    try {
      setIsSaving(true);

      const payerParticipant = participants.find((p) => p.id === paidBy);

      if (!payerParticipant) {
        Alert.alert('Erreur', 'Payeur non trouvé');
        return;
      }

      // Créer la dépense
      const expenseData = {
        groupId: group.id,
        title: title.trim(),
        amount: parseFloat(amount),
        paidBy: payerParticipant.name,
        participants: selectedParticipants.map((p) => p.name),
        createdBy: user.id,
        createdAt: Date.now(),
      };

      const expenseId = await createExpense(expenseData);

      // Calculer le montant par participant
      const amountPerParticipant =
        parseFloat(amount) / selectedParticipants.length;

      // Créer la dette en excluant le payeur de la liste des débiteurs
      const deptData = {
        expenseId,
        groupId: group.id,
        payerId: paidBy,
        amount: parseFloat(amount),
        debtors: selectedParticipants
          .filter((participant) => participant.id !== paidBy) // Exclure le payeur
          .map((participant) => ({
            userId: participant.id,
            amount: amountPerParticipant,
          })),
        createdAt: Date.now(),
      };

      await createDept(deptData);

      Alert.alert('Succès', 'Dépense ajoutée avec succès', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err) {
      console.error('Erreur lors de la création de la dépense:', err);
      Alert.alert('Erreur', "Impossible d'ajouter la dépense");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleParticipant = (index: number) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index].selected = !updatedParticipants[index].selected;
    setParticipants(updatedParticipants);
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </Pressable>
        <Text style={styles.headerTitle}>Nouvelle dépense</Text>
        <Pressable
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupLabel}>Groupe</Text>
          <Text style={styles.groupName}>{group?.name}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Titre de la dépense</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Courses, Restaurant, etc."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Montant</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={styles.currencySymbol}>€</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payé par</Text>
          <View style={styles.dropdownContainer}>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowPaidByDropdown(!showPaidByDropdown)}
            >
              <Text style={styles.dropdownText}>
                {paidBy || 'Sélectionner'}
              </Text>
              <Ionicons
                name={showPaidByDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#4B5563"
              />
            </Pressable>

            {showPaidByDropdown && (
              <View style={styles.dropdownMenu}>
                {participants.map((participant, index) => (
                  <Pressable
                    key={index}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setPaidBy(participant.id);
                      setShowPaidByDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        paidBy === participant.id &&
                          styles.dropdownItemSelected,
                      ]}
                    >
                      {participant.name}
                    </Text>
                    {paidBy === participant.id && (
                      <Ionicons name="checkmark" size={18} color="#2563EB" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pour qui?</Text>
          <Text style={styles.participantsHelp}>
            Sélectionnez les personnes concernées par cette dépense
          </Text>

          <View style={styles.participantsContainer}>
            {participants.map((participant, index) => (
              <Pressable
                key={`participant-${index}`}
                style={[
                  styles.participantCard,
                  participant.selected && styles.participantCardSelected,
                ]}
                onPress={() => toggleParticipant(index)}
              >
                <View style={styles.participantContent}>
                  <Ionicons
                    name={participant.selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={participant.selected ? '#2563EB' : '#9CA3AF'}
                    style={styles.participantCheckbox}
                  />
                  <Text
                    style={[
                      styles.participantName,
                      participant.selected && styles.participantNameSelected,
                    ]}
                  >
                    {participant.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Résumé</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cash-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.summaryLabel}>Montant total</Text>
              <Text style={styles.summaryValue}>
                {amount ? `${parseFloat(amount).toFixed(2)} €` : '0.00 €'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="person-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.summaryLabel}>Payé par</Text>
              <Text style={styles.summaryValue}>{paidBy || '-'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="people-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.summaryLabel}>Participants</Text>
              <Text style={styles.summaryValue}>
                {participants.filter((p) => p.selected).length}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="calculator-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.summaryLabel}>Montant par personne</Text>
              <Text style={styles.summaryValue}>
                {amount && participants.filter((p) => p.selected).length > 0
                  ? `${(
                      parseFloat(amount) /
                      participants.filter((p) => p.selected).length
                    ).toFixed(2)} €`
                  : '0.00 €'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  groupInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 4,
    maxHeight: 240,
    overflow: 'scroll',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
  },
  dropdownItemSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  participantsHelp: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  participantsContainer: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
  },
  participantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  participantCardSelected: {
    backgroundColor: '#EBF5FF',
    borderColor: '#BFDBFE',
  },
  participantContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantCheckbox: {
    marginRight: 12,
  },
  participantName: {
    fontSize: 16,
    color: '#4B5563',
    flex: 1,
  },
  participantNameSelected: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  summary: {
    marginTop: 24,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
