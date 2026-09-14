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
import { useSettings } from '../../context/SettingsContext';








export default function AboutScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>About App</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.content}>
        <Image
          source={require('../../../assets/icon.png')}
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
    color: colors.textWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.08)',
    width: '100%',
  },
  paragraph: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  version: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 40,
  },
  credit: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    opacity: 0.6,
  },
});
