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

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Account info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Organization
  const [orgName, setOrgName] = useState('');
  const [orgPhone, setOrgPhone] = useState('');

  // Step 3: Cemetery setup
  const [cemeteryName, setCemeteryName] = useState('');
  const [cemeteryAddress, setCemeteryAddress] = useState('');
  const [cemeteryCity, setCemeteryCity] = useState('');
  const [cemeteryState, setCemeteryState] = useState('');

  const validateStep = useCallback((current: number): boolean => {
    if (current === 1) {
      if (!email.trim() || !password || !confirmPassword) {
        Alert.alert('Missing fields', 'Please fill in all account fields.');
        return false;
      }
      if (password.length < 8) {
        Alert.alert('Weak password', 'Password must be at least 8 characters.');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('Mismatch', 'Passwords do not match.');
        return false;
      }
      return true;
    }
    if (current === 2) {
      if (!orgName.trim()) {
        Alert.alert('Missing field', 'Please enter an organization name.');
        return false;
      }
      return true;
    }
    if (current === 3) {
      if (!cemeteryName.trim()) {
        Alert.alert('Missing field', 'Please enter a cemetery name.');
        return false;
      }
      return true;
    }
    return true;
  }, [email, password, confirmPassword, orgName, cemeteryName]);

  const nextStep = useCallback(() => {
    if (!validateStep(step)) return;
    if (step < 3) setStep(prev => ((prev + 1) as 1 | 2 | 3));
  }, [step, validateStep]);

  const prevStep = useCallback(() => {
    if (step > 1) setStep(prev => ((prev - 1) as 1 | 2 | 3));
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const success = await register({
        email: email.trim(),
        password,
        organization: { name: orgName.trim(), phone: orgPhone.trim() },
        cemetery: {
          name: cemeteryName.trim(),
          address: cemeteryAddress.trim(),
          city: cemeteryCity.trim(),
          state: cemeteryState.trim(),
        },
      });
      if (success) {
        Alert.alert('Welcome!', 'Your account has been created.', [
          { text: 'Get Started', onPress: () => router.replace('/main/tabs/map') },
        ]);
      } else {
        Alert.alert('Registration Failed', 'Please try again later.');
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [email, password, orgName, orgPhone, cemeteryName, cemeteryAddress, cemeteryCity, cemeteryState, register, router, validateStep]);

  const renderStepIndicator = () => (
    <View style={styles.stepper}>
      {[1, 2, 3].map(s => (
        <View key={s} style={styles.stepRow}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
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
        placeholder="At least 8 characters"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />

      <Text style={[styles.label, isDark && styles.textDark]}>Confirm Password</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repeat password"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={[styles.label, isDark && styles.textDark]}>Organization Name</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={orgName}
        onChangeText={setOrgName}
        placeholder="e.g. Oak Hill Cemetery Association"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
        autoComplete="organization"
      />

      <Text style={[styles.label, isDark && styles.textDark]}>Organization Phone (optional)</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={orgPhone}
        onChangeText={setOrgPhone}
        placeholder="+1 (555) 000-0000"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={[styles.label, isDark && styles.textDark]}>Cemetery Name</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={cemeteryName}
        onChangeText={setCemeteryName}
        placeholder="e.g. Oak Hill Cemetery"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
      />

      <Text style={[styles.label, isDark && styles.textDark]}>Address</Text>
      <TextInput
        style={[styles.input, isDark && styles.inputDark]}
        value={cemeteryAddress}
        onChangeText={setCemeteryAddress}
        placeholder="123 Main St"
        placeholderTextColor={isDark ? '#888' : '#aaa'}
        autoComplete="street-address"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, isDark && styles.textDark]}>City</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={cemeteryCity}
            onChangeText={setCemeteryCity}
            placeholder="City"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, isDark && styles.textDark]}>State</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={cemeteryState}
            onChangeText={setCemeteryState}
            placeholder="State"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            autoComplete="addressState"
          />
        </View>
      </View>
    </View>
  );

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
          <Text style={[styles.header, isDark && styles.textDark]}>Create Account</Text>
          {renderStepIndicator()}

          <View style={styles.form}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>

          <View style={styles.actions}>
            {step > 1 && (
              <TouchableOpacity style={[styles.secondaryButton, isDark && styles.secondaryButtonDark]} onPress={prevStep}>
                <Text style={[styles.secondaryText, isDark && styles.textDark]}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
                <Text style={styles.primaryText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Create Account</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginText, isDark && styles.textMutedDark]}>
              Already have an account? <Text style={styles.loginBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 16,
  },
  textDark: {
    color: '#eee',
  },
  textMutedDark: {
    color: '#888',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#2196F3',
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  stepNumActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e5ea',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#2196F3',
  },
  form: {
    marginBottom: 16,
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
    gap: 12,
  },
  half: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
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
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonDark: {
    borderColor: '#444',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginBold: {
    fontWeight: '700',
    color: '#2196F3',
  },
});
