import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (success) {
        if (rememberMe) {
          await AsyncStorage.setItem('cached_email', email.trim());
          await AsyncStorage.setItem('cached_password_hash', await hashForCache(password));
        } else {
          await AsyncStorage.multiRemove(['cached_email', 'cached_password_hash']);
        }
        router.replace('/main/tabs/map');
      } else {
        // Try offline cached credentials
        const cachedEmail = await AsyncStorage.getItem('cached_email');
        const cachedHash = await AsyncStorage.getItem('cached_password_hash');
        if (cachedEmail === email.trim() && cachedHash === await hashForCache(password)) {
          router.replace('/main/tabs/map');
        } else {
          Alert.alert('Login Failed', 'Invalid credentials and no offline match found.');
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Network') || msg.includes('offline')) {
        // Offline fallback
        const cachedEmail = await AsyncStorage.getItem('cached_email');
        const cachedHash = await AsyncStorage.getItem('cached_password_hash');
        if (cachedEmail === email.trim() && cachedHash === await hashForCache(password)) {
          router.replace('/main/tabs/map');
        } else {
          Alert.alert('Offline', 'No cached credentials match. Please connect to the internet.');
        }
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, login, router]);

  const handleForgotPassword = useCallback(() => {
    Alert.alert('Forgot Password', 'Please contact your administrator to reset your password.');
  }, []);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.brand, isDark && styles.textDark]}>EternalMap</Text>
            <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
              Cemetery Management GIS
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, isDark && styles.textDark]}>Email</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />

            <Text style={[styles.label, isDark && styles.textDark]}>Password</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(prev => !prev)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.rememberText, isDark && styles.textDark]}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={[styles.registerText, isDark && styles.textMutedDark]}>
                New here? <Text style={styles.registerBold}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

async function hashForCache(input: string): Promise<string> {
  // Simple deterministic hash for offline comparison demo.
  // In production, use proper crypto or do not cache passwords at all.
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  textDark: {
    color: '#eee',
  },
  textMutedDark: {
    color: '#888',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  inputDark: {
    borderColor: '#444',
    color: '#eee',
    backgroundColor: '#1c1c1e',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#aaa',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  rememberText: {
    fontSize: 14,
    color: '#444',
  },
  forgotText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  button: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerBold: {
    fontWeight: '700',
    color: '#2196F3',
  },
});
