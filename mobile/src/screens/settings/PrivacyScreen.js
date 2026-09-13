import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Shield } from 'lucide-react-native';

const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';

export default function PrivacyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={TEXT_WHITE} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Note</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Shield color="#A78BFA" size={48} strokeWidth={1.5} />
        </View>

        <View style={styles.card}>
          <Text style={styles.paragraph}>
            We believe your data is yours. This app is designed with privacy in mind from the ground up.
          </Text>
          
          <Text style={styles.bullet}>
            • <Text style={styles.bold}>Local Storage:</Text> Your favorites, recent searches, and offline lyrics cache are stored locally on your device. They are not tied to any account or uploaded to the cloud.
          </Text>

          <Text style={styles.bullet}>
            • <Text style={styles.bold}>Feedback:</Text> If you submit feedback through the Contact form, it is stored securely and used exclusively to improve the app.
          </Text>

          <Text style={styles.bullet}>
            • <Text style={styles.bold}>No Tracking:</Text> We do not sell, share, or track your personal data.
          </Text>
          
          <Text style={[styles.paragraph, { marginTop: 16 }]}>
            If you reset your app data in Settings, all locally stored preferences and favorites will be permanently deleted from your device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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
    color: TEXT_WHITE,
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.08)',
    width: '100%',
  },
  paragraph: {
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  bullet: {
    color: TEXT_MUTED,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    paddingLeft: 8,
  },
  bold: {
    color: TEXT_WHITE,
    fontWeight: '700',
  },
});
