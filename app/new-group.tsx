import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createGroup } from '../services/groups';

export default function NewGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState(['', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addParticipant = () => {
    setParticipants([...participants, '']);
  };

  const updateParticipant = (text: string, index: number) => {
    const newParticipants = [...participants];
    newParticipants[index] = text;
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 2) return;
    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const validParticipants = participants.filter(p => p.trim() !== '');
      await createGroup(groupName, validParticipants);
      
      router.back();
    } catch (err) {
      setError('Une erreur est survenue lors de la création du groupe');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = groupName.trim() !== '' && participants.filter(p => p.trim() !== '').length >= 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.title}>Nouveau Groupe</Text>
          <Pressable 
            onPress={handleSubmit}
            style={[
              styles.createButton,
              (!isValid || isLoading) && styles.createButtonDisabled
            ]}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Créer</Text>
            )}
          </Pressable>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du groupe</Text>
          <TextInput
            style={styles.input}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Ex: Vacances d'été"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Participants</Text>
          {participants.map((participant, index) => (
            <View key={index} style={styles.participantInput}>
              <TextInput
                style={[styles.input, styles.participantField]}
                value={participant}
                onChangeText={(text) => updateParticipant(text, index)}
                placeholder={`Participant ${index + 1}`}
                placeholderTextColor="#9CA3AF"
              />
              {participants.length > 2 && (
                <Pressable
                  onPress={() => removeParticipant(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="remove-circle" size={24} color="#DC2626" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <Pressable 
          onPress={addParticipant} 
          style={[styles.addParticipantButton, styles.bottomMargin]}
        >
          <Ionicons name="add-circle" size={24} color="#2563EB" />
          <Text style={styles.addParticipantText}>Ajouter un participant</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
    width: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    width: 80,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  participantInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantField: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  addParticipantText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomMargin: {
    marginBottom: 40,
  },
});