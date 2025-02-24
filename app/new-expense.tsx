import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import { getGroups, getGroupById } from '../services/groups';
import type { Group, Participant } from '../types/group';

interface SelectedPayer {
  id: string;
  name: string;
  amount: string;
}

export default function NewExpenseScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [involvedParticipants, setInvolvedParticipants] = useState<Set<string>>(new Set());
  const [payerParticipates, setPayerParticipates] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadParticipants();
    } else {
      setParticipants([]);
      setInvolvedParticipants(new Set());
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
    } catch (err) {
      setError('Erreur lors du chargement des groupes');
    }
  };

  const loadParticipants = async () => {
    try {
      const group = await getGroupById(selectedGroup);
      if (group) {
        setParticipants(group.participants);
      }
    } catch (err) {
      setError('Erreur lors du chargement des participants');
    }
  };

  const getAmountPerPerson = () => {
    const totalAmount = parseFloat(amount || '0');
    if (isNaN(totalAmount)) return '0';
    const numberOfInvolved = involvedParticipants.size + (payerParticipates ? 1 : 0);
    if (numberOfInvolved === 0) return '0';
    return (totalAmount / numberOfInvolved).toFixed(2);
  };

  const toggleInvolvedParticipant = (participantId: string) => {
    setInvolvedParticipants(current => {
      const newSet = new Set(current);
      if (current.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const amountNumber = parseFloat(amount.replace(',', '.'));
      
      if (isNaN(amountNumber)) {
        throw new Error('Le montant est invalide');
      }
      
      router.back();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Une erreur est survenue lors de la création de la dépense');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = title.trim() !== '' && amount.trim() !== '' && selectedGroup !== '' && paidBy !== '';

  const selectAllParticipants = () => {
    const allParticipants = new Set(
      participants
        .filter(p => p.id !== paidBy) // Exclure le payeur
        .map(p => p.id)
    );
    setInvolvedParticipants(allParticipants);
  };

  const selectNoParticipants = () => {
    setInvolvedParticipants(new Set());
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nouvelle Dépense</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Courses, Restaurant..."
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Montant (€)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Groupe</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedGroup}
            onValueChange={(itemValue) => setSelectedGroup(itemValue)}
          >
            <Picker.Item label="Sélectionner un groupe" value="" />
            {groups.map(group => (
              <Picker.Item key={group.id} label={group.name} value={group.id} />
            ))}
          </Picker>
        </View>
      </View>

      {selectedGroup && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Qui a payé ?</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paidBy}
                onValueChange={(itemValue) => setPaidBy(itemValue)}
              >
                <Picker.Item label="Sélectionner qui a payé" value="" />
                {participants.map(participant => (
                  <Picker.Item 
                    key={participant.id} 
                    label={`${participant.name} ${amount ? `(+${amount}€)` : ''}`}
                    value={participant.id} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.payerParticipationRow}>
              <Text style={styles.label}>Le payeur participe à la dépense ?</Text>
              <Checkbox
                value={payerParticipates}
                onValueChange={setPayerParticipates}
                color="#2563EB"
              />
            </View>
          </View>

          <View style={[styles.inputContainer, styles.involvedSection]}>
            <Text style={styles.label}>Qui doit rembourser ?</Text>
            <View style={styles.selectAllContainer}>
              <Pressable 
                style={styles.selectButton} 
                onPress={selectAllParticipants}
              >
                <Text style={styles.selectButtonText}>Tout le monde</Text>
              </Pressable>
              <Pressable 
                style={[styles.selectButton, styles.selectButtonSecondary]} 
                onPress={selectNoParticipants}
              >
                <Text style={[styles.selectButtonText, styles.selectButtonTextSecondary]}>Personne</Text>
              </Pressable>
            </View>
            {participants.map(participant => {
              const isPayer = participant.id === paidBy;
              const isInvolved = involvedParticipants.has(participant.id);
              const amountPerPerson = getAmountPerPerson();
              
              // Calcul du montant net pour le payeur
              const payerNetAmount = isPayer 
                ? parseFloat(amount || '0') - (payerParticipates ? parseFloat(amountPerPerson) : 0)
                : -parseFloat(amountPerPerson);

              return (
                <View key={participant.id} style={styles.participantRow}>
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      value={isPayer ? payerParticipates : isInvolved}
                      onValueChange={() => {
                        if (isPayer) {
                          setPayerParticipates(!payerParticipates);
                        } else {
                          toggleInvolvedParticipant(participant.id);
                        }
                      }}
                      disabled={false} // Le payeur peut maintenant choisir de ne pas participer
                      color={isInvolved || (isPayer && payerParticipates) ? "#2563EB" : undefined}
                    />
                    <Text style={[
                      styles.participantName,
                      isPayer && styles.payerName
                    ]}>
                      {participant.name}{isPayer ? ' (payeur)' : ''}
                    </Text>
                  </View>
                  {amount && (isInvolved || isPayer) && (
                    <Text style={[
                      styles.participantAmount,
                      payerNetAmount >= 0 ? styles.positiveAmount : styles.negativeAmount
                    ]}>
                      {isPayer && !payerParticipates 
                        ? `+${amount}€`
                        : `${payerNetAmount >= 0 ? '+' : ''}${payerNetAmount.toFixed(2)}€`
                      }
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      <Pressable
        style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Créer la dépense</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  error: {
    color: '#DC2626',
    marginBottom: 20,
  },
  loadingIndicator: {
    padding: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedParticipant: {
    backgroundColor: '#F3F4F6',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  participantAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  positiveAmount: {
    color: '#059669',
  },
  negativeAmount: {
    color: '#DC2626',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  involvedSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payerName: {
    fontWeight: '600',
    color: '#2563EB',
  },
  payerParticipationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  selectButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectButtonTextSecondary: {
    color: '#374151',
  },
}); 