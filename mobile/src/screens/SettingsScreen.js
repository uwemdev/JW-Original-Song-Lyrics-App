import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StatusBar,
  Alert,
  Share,
  Animated,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  Palette,
  Type,
  PlayCircle,
  Wifi,
  HardDrive,
  Download,
  Bell,
  Info,
  Share2,
  MessageSquare,
  Shield,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const FONT_LABELS = ['Small', 'Medium', 'Large'];

const WhatsAppIcon = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </Svg>
);

// ─── Toast ───────────────────────────────────────────────────────
function Toast({ visible, message }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
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

// ─── Row Components ──────────────────────────────────────────────
function SectionHeader({ title }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsRow({ icon, label, subtitle, onPress, right, danger }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconWrap, danger && { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
          {icon}
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right || <ChevronRight color={colors.textMuted} size={18} />}
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, label, subtitle, value, onValueChange }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.rowTextWrap}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isDark ? '#3E3456' : '#D1D5DB', true: colors.purple }}
        thumbColor={value ? '#E9D5FF' : '#B8AFC9'}
        ios_backgroundColor={isDark ? '#3E3456' : '#D1D5DB'}
        accessibilityLabel={`${label} toggle, currently ${value ? 'on' : 'off'}`}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function SettingsScreen({ navigation }) {
  const settings = useSettings();
  const { colors, isDark } = settings;
  const styles = makeStyles(colors, isDark);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToastMessage = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out JW Original Song Lyrics — a beautiful app for browsing and reading JW Original Song lyrics! 🎵',
      });
    } catch (_) {}
  };

  const handleWhatsApp = () => {
    Alert.alert(
      'Join our Community',
      'You are about to be taken to WhatsApp. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            Linking.openURL('https://chat.whatsapp.com/FPk1mCLbseC07voLzMcPFs?s=cl&p=i&mlu=4&ilr=4').catch(() => {
              showToastMessage('Could not open WhatsApp');
            });
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your favorites, cached lyrics, recent searches, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await settings.resetAllData();
            showToastMessage('App data has been reset');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ── Appearance ── */}
        <SectionHeader title="Appearance" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Palette color={colors.purpleAccent} size={20} />}
            label="Theme"
            subtitle={settings.theme === 'system' ? 'System' : settings.theme === 'light' ? 'Light' : 'Dark'}
            onPress={() => navigation.navigate('ThemeSettings')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Type color={colors.purpleAccent} size={20} />}
            label="Lyrics Font Size"
            subtitle={FONT_LABELS[settings.fontSizeIdx]}
            onPress={() => navigation.navigate('FontSizeSettings')}
          />
        </View>

        {/* ── Playback ── */}
        <SectionHeader title="Playback" />
        <View style={styles.card}>
          <ToggleRow
            icon={<PlayCircle color={colors.purpleAccent} size={20} />}
            label="Auto-play on open"
            subtitle="Auto-play songs when opening details"
            value={settings.autoPlay}
            onValueChange={settings.setAutoPlay}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Wifi color={colors.purpleAccent} size={20} />}
            label="Data Saver"
            subtitle="Only auto-play on Wi-Fi"
            value={settings.dataSaver}
            onValueChange={settings.setDataSaver}
          />
        </View>

        {/* ── Storage & Offline ── */}
        <SectionHeader title="Storage & Offline" />
        <View style={styles.card}>
          <SettingsRow
            icon={<HardDrive color={colors.purpleAccent} size={20} />}
            label="Offline Lyrics Cache"
            subtitle="Manage cached songs"
            onPress={() => navigation.navigate('StorageSettings')}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Download color={colors.purpleAccent} size={20} />}
            label="Auto-cache favorites"
            subtitle="Cache lyrics when you favorite a song"
            value={settings.autoCacheFavorites}
            onValueChange={settings.setAutoCacheFavorites}
          />
        </View>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <ToggleRow
            icon={<Bell color={colors.purpleAccent} size={20} />}
            label="New song alerts"
            subtitle="Get notified when new songs are added"
            value={settings.newSongAlerts}
            onValueChange={settings.setNewSongAlerts}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Bell color={colors.purpleAccent} size={20} />}
            label="Notification History"
            subtitle="View past announcements and alerts"
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        {/* ── About ── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Info color={colors.purpleAccent} size={20} />}
            label="About App"
            onPress={() => navigation.navigate('AboutApp')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Share2 color={colors.purpleAccent} size={20} />}
            label="Share this app"
            onPress={handleShare}
            right={<View />}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<MessageSquare color={colors.purpleAccent} size={20} />}
            label="Contact / Feedback"
            onPress={() => navigation.navigate('FeedbackScreen')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<WhatsAppIcon color={colors.purpleAccent} size={20} />}
            label="WhatsApp Community"
            onPress={handleWhatsApp}
          />
        </View>

        {/* ── Legal & Data ── */}
        <SectionHeader title="Legal & Data" />
        <View style={styles.card}>
          <SettingsRow
            icon={<Shield color={colors.purpleAccent} size={20} />}
            label="Privacy Note"
            onPress={() => navigation.navigate('PrivacyScreen')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Trash2 color={colors.danger} size={20} />}
            label="Reset App Data"
            danger
            onPress={handleResetData}
            right={<View />}
          />
        </View>

        {/* ── Version ── */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      <Toast visible={showToast} message={toastMsg} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const makeStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.textWhite,
    fontSize: 28,
    fontWeight: '800',
  },
  sectionHeader: {
    color: colors.purpleAccent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.15)',
    marginLeft: 64,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 20,
    opacity: 0.6,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(109,40,217,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
