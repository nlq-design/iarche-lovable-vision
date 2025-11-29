# Configuration de l'authentification à deux facteurs (2FA)

## Vue d'ensemble

L'authentification à deux facteurs (2FA) avec TOTP (Time-based One-Time Password) ajoute une couche de sécurité supplémentaire pour les comptes administrateurs en exigeant un code temporaire en plus du mot de passe.

## Activation du 2FA dans Lovable Cloud

### Étape 1 : Activer le 2FA dans les paramètres d'authentification

1. Accédez au **Backend** (Cloud view)
2. Naviguez vers **Users → Auth Settings**
3. Activez l'option **"Multi-Factor Authentication (MFA)"**
4. Sauvegardez les modifications

### Étape 2 : Configuration du 2FA pour les admins

Le 2FA est maintenant disponible pour tous les utilisateurs. Les administrateurs peuvent l'activer depuis leur profil :

1. **L'utilisateur se connecte normalement**
2. **Accéder aux paramètres de profil** (à implémenter dans l'interface admin)
3. **Scanner le QR code** avec une application d'authentification (Google Authenticator, Authy, etc.)
4. **Entrer le code de vérification** pour confirmer l'activation

### Étape 3 : Flux de connexion avec 2FA

Une fois le 2FA activé pour un utilisateur :

1. L'utilisateur entre son email et mot de passe
2. Le système détecte que le 2FA est activé
3. L'utilisateur est invité à entrer le code TOTP de son application
4. Après validation du code, l'utilisateur accède à son compte

## Implémentation technique

### Bibliothèques nécessaires

Supabase Auth gère nativement le 2FA. Aucune bibliothèque externe n'est nécessaire côté backend.

### API Supabase pour le 2FA

```typescript
// Enrôler un utilisateur dans le 2FA
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Admin 2FA'
});

// Le QR code est disponible dans data.totp.qr_code
// L'utilisateur scanne ce QR code avec son application

// Vérifier et activer le 2FA
const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
  factorId: data.id
});

const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challengeData.id,
  code: '123456' // Code TOTP entré par l'utilisateur
});

// Lors de la connexion avec 2FA
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Si le 2FA est requis, signInData contiendra les informations pour le challenge
if (signInData.user && !signInData.session) {
  // 2FA requis
  const factors = await supabase.auth.mfa.listFactors();
  const totpFactor = factors.data.totp[0];
  
  const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
  
  // L'utilisateur entre son code TOTP
  const verified = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.data.id,
    code: userInputCode
  });
}
```

## Recommandations de sécurité

1. **Forcer le 2FA pour tous les admins** : Modifier la politique RLS pour exiger le 2FA pour les utilisateurs avec le rôle `admin`

2. **Codes de récupération** : Générer des codes de récupération uniques lors de l'activation du 2FA

3. **Expiration des sessions** : Configurer des sessions plus courtes pour les comptes avec 2FA

4. **Audit logs** : Logger toutes les tentatives de connexion avec 2FA (succès et échecs)

## Flux d'interface utilisateur recommandé

### Page de configuration du 2FA (à implémenter)

```typescript
// Exemple de composant React pour activer le 2FA
const Enable2FA = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  
  const startEnrollment = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Admin Account'
    });
    
    if (data) {
      setQrCode(data.totp.qr_code); // Afficher ce QR code
    }
  };
  
  const verifyAndEnable = async (factorId: string, challengeId: string) => {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: verificationCode
    });
    
    if (data) {
      // 2FA activé avec succès
      toast.success('2FA activé !');
    }
  };
  
  return (
    <div>
      {!qrCode ? (
        <button onClick={startEnrollment}>Activer le 2FA</button>
      ) : (
        <div>
          <img src={qrCode} alt="QR Code 2FA" />
          <input 
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Entrez le code de vérification"
          />
          <button onClick={() => verifyAndEnable(factorId, challengeId)}>
            Vérifier et activer
          </button>
        </div>
      )}
    </div>
  );
};
```

### Modification du flux de connexion

```typescript
// Dans votre composant de login
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    toast.error('Erreur de connexion');
    return;
  }
  
  // Vérifier si 2FA est requis
  if (data.user && !data.session) {
    // Rediriger vers la page de vérification 2FA
    navigate('/verify-2fa');
  } else {
    // Connexion réussie sans 2FA
    navigate('/admin');
  }
};
```

## Applications d'authentification compatibles

- **Google Authenticator** (iOS, Android)
- **Authy** (iOS, Android, Desktop)
- **Microsoft Authenticator** (iOS, Android)
- **1Password** (avec support TOTP)
- **Bitwarden** (avec support TOTP)

## Dépannage

### L'utilisateur a perdu son appareil 2FA

1. Utilisez les codes de récupération générés lors de l'activation
2. Ou désactivez le 2FA via la base de données en tant qu'admin super-utilisateur

### Le code TOTP ne fonctionne pas

- Vérifiez que l'heure de l'appareil est synchronisée (TOTP est basé sur le temps)
- Le code change toutes les 30 secondes
- Attendez le prochain code si celui-ci vient d'expirer

## Prochaines étapes

1. Créer une page de configuration 2FA dans l'interface admin (`/admin/settings/2fa`)
2. Ajouter un indicateur visuel sur le profil admin montrant si le 2FA est activé
3. Implémenter la génération et le stockage sécurisé des codes de récupération
4. Ajouter des logs d'audit pour les événements 2FA (activation, désactivation, tentatives échouées)

## Ressources

- [Documentation Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [RFC 6238 - TOTP Algorithm](https://tools.ietf.org/html/rfc6238)
