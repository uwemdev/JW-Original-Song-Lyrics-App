import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';

export default function AboutScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  
  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Original Song Lyrics</Text>
        
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            Jehovah's Witnesses' original songs, and their lyrics, are available on{' '}
            <Text style={styles.link} onPress={() => openLink('https://jw.org')}>jw.org</Text>. 
            But they're spread out. Different pages for different categories, no single place to browse them all, search across them, or read the lyrics without hunting through a video or a specific song page. If you wanted to quickly find the words to a song, teach a child the verses, or sit with the lyrics during personal reflection, there was no easy way to do that in one place.
          </Text>

          <Text style={styles.paragraph}>
            That's what this app makes easy.
          </Text>

          <Text style={styles.paragraph}>
            Original Song Lyrics brings together the full lyrics for every original song across all categories: Original Songs, Become Jehovah's Friend, Sing With Us, and International Music. Every song includes its complete lyrics, a short write-up explaining the story or scripture behind it, and the audio itself when you're connected, so you can listen and read at the same time.
          </Text>

          <Text style={styles.paragraph}>
            The lyrics stay with you even without an internet connection. New songs are added regularly and show up automatically, no app update required. You can save your favorites, search across every song, and adjust the text size to however you read best.
          </Text>

          <Text style={styles.paragraph}>
            All songs featured in this app are based on the official original songs library published by Jehovah's Witnesses at{' '}
            <Text style={styles.link} onPress={() => openLink('https://jw.org/en/library/music-songs/original-songs/')}>
              jw.org
            </Text>. This app is an independent project, built by a fellow Witness who wanted this to exist. It is not affiliated with, endorsed by, or officially connected to the Watch Tower Bible and Tract Society or jw.org. It simply brings everything into one place.
          </Text>

          <Text style={[styles.paragraph, { fontWeight: '700', marginTop: 8, marginBottom: 0, color: colors.textWhite }]}>
            This app is free, and always will be. No ads, ever.
          </Text>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: 20,
  },
  title: {
    color: colors.textWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
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
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 16,
  },
  link: {
    color: colors.purpleAccent,
    textDecorationLine: 'underline',
  },
  version: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 32,
  },
});
