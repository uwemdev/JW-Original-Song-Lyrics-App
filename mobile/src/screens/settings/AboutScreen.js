import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

const BG = '#0F0A1A';
const CARD_BG = '#1A1425';
const PURPLE = '#6D28D9';
const PURPLE_ACCENT = '#A78BFA';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#B8AFC9';

export default function AboutScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>About App</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <Image
          source={require('../../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>JW Original Song Lyrics</Text>
        
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            This app is inspired by jw.org's Original Songs library. It was built to make lyrics and audio accessible in one beautiful place across all song categories.
          </Text>
          <Text style={[styles.paragraph, { marginTop: 16 }]}>
            Whether you want to read lyrics offline, practice singing along, or just enjoy the beautiful music, everything you need is right here.
          </Text>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.credit}>Built for the brotherhood.</Text>
      </View>
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    color: TEXT_WHITE,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 32,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  version: {
    color: TEXT_WHITE,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 40,
  },
  credit: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 8,
    opacity: 0.6,
  },
});
