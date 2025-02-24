import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as Crypto from 'expo-crypto';
import { useAuth, User } from '../lib/auth-context';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  // Fonction pour hacher le mot de passe
  const hashPassword = async (password: string): Promise<string> => {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  };

  // Vérifier si un utilisateur existe déjà
  const checkUserExists = async (email: string): Promise<boolean> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  // Récupérer un utilisateur par email
  const getUserByEmail = async (email: string): Promise<User | null> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  };

  // Créer un nouvel utilisateur
  const createUser = async (user: User): Promise<string> => {
    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, user);
    return docRef.id;
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsLoading(true);

      if (isLogin) {
        // Connexion
        console.log('Tentative de connexion avec:', email);

        // Vérifier si l'utilisateur existe
        const user = await getUserByEmail(email);

        if (!user) {
          Alert.alert('Erreur', 'Utilisateur non trouvé');
          return;
        }

        // Vérifier le mot de passe
        const hashedPassword = await hashPassword(password);

        if (user.password !== hashedPassword) {
          Alert.alert('Erreur', 'Mot de passe incorrect');
          return;
        }

        // Connecter l'utilisateur via le contexte
        await login(user);

        console.log('Connexion réussie');
        router.replace('/(tabs)');
      } else {
        // Inscription
        console.log("Tentative d'inscription avec:", email);

        // Vérifier si le mot de passe est assez fort
        if (password.length < 6) {
          Alert.alert(
            'Erreur',
            'Le mot de passe doit contenir au moins 6 caractères'
          );
          return;
        }

        // Vérifier si l'email est déjà utilisé
        const userExists = await checkUserExists(email);

        if (userExists) {
          Alert.alert('Erreur', 'Cet email est déjà utilisé');
          return;
        }

        // Hacher le mot de passe
        const hashedPassword = await hashPassword(password);

        // Créer l'utilisateur
        const newUser: User = {
          email,
          password: hashedPassword,
          name,
          createdAt: new Date().toISOString(),
        };

        const userId = await createUser(newUser);

        // Connecter l'utilisateur via le contexte
        newUser.id = userId;
        await login(newUser);

        console.log('Inscription réussie');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error("Erreur d'authentification:", error);
      Alert.alert(
        'Erreur',
        "Une erreur est survenue lors de l'authentification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Tricount</Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Connectez-vous à votre compte'
              : 'Créez un nouveau compte'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {!isLogin && (
              <Text style={styles.passwordHint}>
                Le mot de passe doit contenir au moins 6 caractères
              </Text>
            )}
          </View>

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isLogin ? 'log-in' : 'person-add'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {isLogin ? 'Se connecter' : "S'inscrire"}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.toggleButton} onPress={toggleAuthMode}>
            <Text style={styles.toggleText}>
              {isLogin
                ? 'Pas encore de compte ? Inscrivez-vous'
                : 'Déjà un compte ? Connectez-vous'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  form: {
    width: '100%',
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
  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#2563EB',
    fontSize: 14,
  },
});
