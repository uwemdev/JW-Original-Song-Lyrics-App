import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
} from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../lib/supabase';








function Toast({ visible, message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function FeedbackScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const submitDisabled = !message.trim() || submitting;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('feedback').insert([{
        name: name.trim() || null,
        email: email.trim() || null,
        message: message.trim(),
      }]);

      if (error) throw error;

      setName('');
      setEmail('');
      setMessage('');
      
      setToastMsg('Thank you! Your feedback has been sent.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);

    } catch (err) {
      setToastMsg('Failed to send feedback. Try again later.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.textWhite} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact / Feedback</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.introText}>
          Have a suggestion, found a bug, or just want to say hi? Let us know below.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={name}
            onChangeText={setName}
            editable={!submitting}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your email address"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's on your mind?"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!submitting}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitDisabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitDisabled}
          accessibilityRole="button"
        >
          <Send color={submitDisabled ? 'rgba(255,255,255,0.5)' : '#FFF'} size={18} />
          <Text style={[styles.submitText, submitDisabled && { color: 'rgba(255,255,255,0.5)' }]}>
            {submitting ? 'Sending...' : 'Send Feedback'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast visible={showToast} message={toastMsg} />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  introText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textWhite,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(109,40,217,0.4)',
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(109,40,217,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
