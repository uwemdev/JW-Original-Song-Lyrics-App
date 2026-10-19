import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { CURRENT_APP_VERSION, fetchVersionConfig, compareVersions } from '../../lib/versionCheck';
import UpdateModal from '../../components/UpdateModal';

export default function AboutScreen({ navigation }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'latest' | 'has_update' | null
  const [versionConfig, setVersionConfig] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isForced, setIsForced] = useState(false);
  
  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const config = await fetchVersionConfig();
      if (config && config.latest_version) {
        setVersionConfig(config);
        const hasNew = compareVersions(CURRENT_APP_VERSION, config.latest_version) < 0;
        const forced = Boolean(config.force_update || compareVersions(CURRENT_APP_VERSION, config.min_required_version) < 0);
        setIsForced(forced);

        if (hasNew) {
          setUpdateStatus('has_update');
          setShowModal(true);
        } else {
          setUpdateStatus('latest');
        }
      } else {
        setUpdateStatus('latest');
      }
    } catch (_) {
      setUpdateStatus('latest');
    } finally {
      setCheckingUpdate(false);
    }
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
            This app is free, and always will be.
          </Text>
        </View>

        {/* Version & Update check section */}
        <View style={styles.versionContainer}>
          <Text style={styles.version}>Version {CURRENT_APP_VERSION}</Text>

          {updateStatus === 'latest' ? (
            <View style={styles.upToDateBadge}>
              <CheckCircle2 size={15} color="#10B981" />
              <Text style={styles.upToDateText}>You're using the latest version</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.checkUpdateBtn}
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
              activeOpacity={0.7}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={colors.purpleAccent} />
              ) : (
                <>
                  <RefreshCw size={14} color={colors.purpleAccent} />
                  <Text style={styles.checkUpdateText}>Check for Updates</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Update Modal */}
      <UpdateModal
        visible={showModal}
        config={versionConfig}
        isForced={isForced}
        onDismiss={() => setShowModal(false)}
      />
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
    paddingBottom: 140,
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
  versionContainer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  version: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(167, 139, 250, 0.1)' : 'rgba(109, 40, 217, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(109, 40, 217, 0.15)',
  },
  checkUpdateText: {
    color: colors.purpleAccent,
    fontSize: 13,
    fontWeight: '600',
  },
  upToDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  upToDateText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
