import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { Sparkles, Download, ArrowUpCircle, AlertTriangle, ExternalLink, X } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { CURRENT_APP_VERSION, openStorePage, markUpdateDismissed } from '../lib/versionCheck';

export default function UpdateModal({ visible, config, isForced, onDismiss }) {
  const { colors, isDark } = useSettings();
  const styles = makeStyles(colors, isDark);

  // If forced update, prevent Android back button from closing modal
  useEffect(() => {
    if (!visible || !isForced) return;
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, isForced]);

  if (!visible || !config) return null;

  const latestVersion = config.latest_version || 'Latest';
  const title = config.title || (isForced ? 'Critical Update Required' : 'New Update Available 🎉');
  const message = config.message || 'A new update is available on the Google Play Store with important improvements.';
  const notes = config.release_notes ? config.release_notes.trim() : null;

  const handleUpdatePress = () => {
    openStorePage(config.store_url);
  };

  const handleDismissPress = async () => {
    if (isForced) return;
    await markUpdateDismissed(config.latest_version);
    if (onDismiss) onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isForced ? () => {} : handleDismissPress}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={isForced ? undefined : handleDismissPress}
        />

        {/* Modal Card */}
        <View style={styles.card}>
          {/* Header pill badge */}
          <View style={styles.topRow}>
            <View style={[styles.badge, isForced && styles.badgeForced]}>
              {isForced ? (
                <AlertTriangle size={13} color="#EF4444" strokeWidth={2.5} />
              ) : (
                <Sparkles size={13} color={colors.purpleAccent} strokeWidth={2.5} />
              )}
              <Text style={[styles.badgeText, isForced && styles.badgeTextForced]}>
                {isForced ? 'REQUIRED UPDATE' : 'GOOGLE PLAY UPDATE'}
              </Text>
            </View>

            {!isForced && (
              <TouchableOpacity
                onPress={handleDismissPress}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close update modal"
              >
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Icon Circle */}
          <View style={[styles.iconWrap, isForced && styles.iconWrapForced]}>
            {isForced ? (
              <ArrowUpCircle size={36} color="#EF4444" strokeWidth={2} />
            ) : (
              <Download size={34} color={colors.purpleAccent} strokeWidth={2.2} />
            )}
          </View>

          {/* Version Pill */}
          <View style={styles.versionRow}>
            <Text style={styles.currentVersionLabel}>v{CURRENT_APP_VERSION}</Text>
            <Text style={styles.versionArrow}>→</Text>
            <View style={styles.newVersionBadge}>
              <Text style={styles.newVersionText}>v{latestVersion}</Text>
            </View>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Release Notes */}
          {notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesHeader}>What's New in this version:</Text>
              <ScrollView
                style={styles.notesScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.notesText}>{notes}</Text>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, isForced && styles.primaryBtnForced]}
              onPress={handleUpdatePress}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {isForced ? 'Update on Google Play' : 'Update Now'}
              </Text>
              <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            {!isForced && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleDismissPress}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: isDark ? '#181226' : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(109, 40, 217, 0.12)',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.45,
          shadowRadius: 24,
        },
        android: {
          elevation: 16,
        },
      }),
    },
    topRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.12)' : 'rgba(109, 40, 217, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.25)' : 'rgba(109, 40, 217, 0.2)',
    },
    badgeForced: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: colors.purpleAccent,
    },
    badgeTextForced: {
      color: '#EF4444',
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: isDark ? 'rgba(109, 40, 217, 0.18)' : 'rgba(109, 40, 217, 0.1)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(109, 40, 217, 0.25)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    iconWrapForced: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
    },
    versionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    currentVersionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    versionArrow: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    newVersionBadge: {
      backgroundColor: colors.purple,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    newVersionText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 16,
    },
    notesBox: {
      width: '100%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
      marginBottom: 20,
    },
    notesHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    notesScroll: {
      maxHeight: 100,
    },
    notesText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textWhite,
    },
    actions: {
      width: '100%',
      gap: 10,
    },
    primaryBtn: {
      width: '100%',
      backgroundColor: colors.purple,
      borderRadius: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: colors.purple,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    primaryBtnForced: {
      backgroundColor: '#EF4444',
      shadowColor: '#EF4444',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryBtn: {
      width: '100%',
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
  });
