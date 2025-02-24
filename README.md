# Tricount - Application de partage de dépenses

Cette application permet de gérer des groupes de dépenses et de calculer les équilibres entre participants.

## Configuration

### Prérequis

- Node.js et npm
- Expo CLI (`npm install -g expo-cli`)
- Un projet Firebase

### Installation

1. Clonez ce dépôt
2. Installez les dépendances : `npm install`
3. Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```
EXPO_PUBLIC_FIREBASE_API_KEY=votre_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

### Configuration Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez l'authentification par email/mot de passe :
   - Allez dans "Authentication" > "Sign-in method"
   - Activez le fournisseur "Email/Password"
3. Configurez Firestore Database :
   - Créez une base de données Firestore
   - Définissez les règles de sécurité (voir `firestore.rules`)

## Résolution des problèmes courants

### Erreur "auth/configuration-not-found"

Cette erreur se produit lorsque l'authentification par email/mot de passe n'est pas activée dans Firebase.

Pour résoudre ce problème :

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Allez dans "Authentication" > "Sign-in method"
4. Activez le fournisseur "Email/Password"

### Erreur "auth/network-request-failed"

Cette erreur peut se produire si :

- Vous n'avez pas de connexion Internet
- Les clés API Firebase dans votre fichier `.env` sont incorrectes
- Le domaine de votre application n'est pas autorisé dans Firebase

## Fonctionnalités

- Authentification des utilisateurs
- Création et gestion de groupes de dépenses
- Ajout de participants avec ou sans compte
- Invitation d'utilisateurs par email
- Calcul automatique des équilibres
- Suggestions de remboursements
