import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function FirebaseSetupScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.title}>Configuration Firebase</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>
          Comment activer l'authentification par email/mot de passe
        </Text>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>
            Étape 1: Accéder à la console Firebase
          </Text>
          <Text style={styles.stepText}>
            Ouvrez la console Firebase et sélectionnez votre projet
            "tricount-ejm".
          </Text>
          <Pressable
            style={styles.linkButton}
            onPress={() =>
              Linking.openURL(
                'https://console.firebase.google.com/project/tricount-ejm'
              )
            }
          >
            <Text style={styles.linkButtonText}>
              Ouvrir la console Firebase
            </Text>
          </Pressable>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>
            Étape 2: Accéder à l'authentification
          </Text>
          <Text style={styles.stepText}>
            Dans le menu de gauche, cliquez sur "Authentication".
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>
            Étape 3: Configurer les méthodes de connexion
          </Text>
          <Text style={styles.stepText}>
            Cliquez sur l'onglet "Sign-in method", puis sur "Email/Password".
          </Text>
          <Pressable
            style={styles.linkButton}
            onPress={() =>
              Linking.openURL(
                'https://console.firebase.google.com/project/tricount-ejm/authentication/providers'
              )
            }
          >
            <Text style={styles.linkButtonText}>
              Aller aux méthodes de connexion
            </Text>
          </Pressable>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Étape 4: Activer Email/Password</Text>
          <Text style={styles.stepText}>
            Activez l'option "Email/Password" en cliquant sur le commutateur
            pour le mettre en position "Activé".
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>Étape 5: Enregistrer</Text>
          <Text style={styles.stepText}>
            Cliquez sur le bouton "Enregistrer" pour confirmer les
            modifications.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepTitle}>
            Étape 6: Redémarrer l'application
          </Text>
          <Text style={styles.stepText}>
            Après avoir activé l'authentification, redémarrez complètement votre
            application Expo.
          </Text>
        </View>

        <Pressable style={styles.returnButton} onPress={() => router.back()}>
          <Text style={styles.returnButtonText}>Retourner à l'application</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  step: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  linkButton: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  linkButtonText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  returnButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 24,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
