import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { resendVerificationEmail } from '../services/auth';
import type { AuthStackParamList } from '../types';

type ScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyEmail'>;
type NavProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { email } = route.params;
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    setResending(true);
    setMessage(null);
    try {
      await resendVerificationEmail(email);
      setMessage('Verification email sent! Check your inbox.');
    } catch (err: any) {
      setMessage(err.message ?? 'Could not resend. Try again later.');
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Ionicons name="mail-outline" size={64} color="#6C5CE7" />

      <Text style={styles.title}>Check your college email</Text>

      <Text style={styles.description}>
        We sent a verification link to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      {message && <Text style={styles.message}>{message}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleResend}
        disabled={resending}
      >
        {resending ? (
          <ActivityIndicator color="#6C5CE7" />
        ) : (
          <Text style={styles.buttonText}>Resend Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>
          Already verified? <Text style={styles.linkBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  email: { fontWeight: '600', color: '#6C5CE7' },
  message: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
  },
  button: {
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  buttonText: { color: '#6C5CE7', fontSize: 15, fontWeight: '600' },
  linkButton: { marginTop: 8 },
  linkText: { color: '#777', fontSize: 14 },
  linkBold: { color: '#6C5CE7', fontWeight: '600' },
});
