import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react-native';
import WhatsAppIcon from './WhatsAppIcon';
import { useSettings } from '../context/SettingsContext';
import { logSongEvent } from '../lib/analytics';

const { width, height } = Dimensions.get('window');

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.jworiginalsongslyrics.app';

// ── Google Play Icon ─────────────────────────────────────────────
const PlayStoreIcon = ({ size = 11, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M3.609 1.814L13.792 12 3.61 22.186a1.99 1.99 0 0 1-.22-.924V2.738c0-.34.08-.654.22-.924zm11.306 11.307L6.85 21.186l10.233-5.908-2.168-2.157zm0-2.242l2.168-2.157L6.85 2.814l8.065 8.065zm1.534.767l3.655 2.11a1.5 1.5 0 0 0 0-2.598l-3.655-2.11 1.05 1.299-1.05 1.299z" />
  </Svg>
);

// ── Background Themes (Executive & Dignified) ────────────────────
const CARD_THEMES = [
  {
    id: 'purple',
    name: 'Kingdom Purple',
    colors: ['#4C1D95', '#2E1065', '#1E1B4B'],
    accent: '#C4B5FD',
    titleCol: '#EDE9FE',
  },
  {
    id: 'navy',
    name: 'Classic Navy',
    colors: ['#1E3A8A', '#172554', '#0F172A'],
    accent: '#93C5FD',
    titleCol: '#DBEAFE',
  },
  {
    id: 'emerald',
    name: 'Deep Emerald',
    colors: ['#064E3B', '#022C22', '#021814'],
    accent: '#6EE7B7',
    titleCol: '#D1FAE5',
  },
  {
    id: 'burgundy',
    name: 'Royal Burgundy',
    colors: ['#831843', '#500724', '#280413'],
    accent: '#F9A8D4',
    titleCol: '#FCE7F3',
  },
  {
    id: 'slate',
    name: 'Minimal Dark',
    colors: ['#18181B', '#0F0A1A', '#09090B'],
    accent: '#E4E4E7',
    titleCol: '#FFFFFF',
  },
];

/**
 * Extracts a multi-line quote suitable for a status quote card
 */
function extractCardQuote(lyrics) {
  if (!lyrics) return 'Start your day with encouraging words.';

  const cleaned = lyrics
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00A0\u202F\uFEFF]/g, ' ')
    .replace(/<wbr\s*\/?>/gi, '')
    .replace(/&shy;/gi, '')
    .replace(/[\u00AD\u200B]/g, '');

  // 1. Look for chorus
  const chorusMatch = /(?:\(CHORUS\)|\[Chorus\])[\s\S]*?\n([\s\S]*?)(?=\n\s*(?:\d+\.|\(|\[|BRIDGE|OUTRO|$))/i.exec(cleaned);
  if (chorusMatch && chorusMatch[1]) {
    const lines = chorusMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && !/^\(.*\)$|^\[.*\]$/.test(l));
    if (lines.length > 0) {
      return lines.slice(0, 4).join('\n');
    }
  }

  // 2. Fallback to first stanza lines
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 8 && !/^\(.*\)$|^\[.*\]$/.test(l) && !/^\d+\./.test(l));

  if (lines.length > 0) {
    return lines.slice(0, 3).join('\n');
  }

  return 'Start your day with encouraging words.';
}

export default function WhatsAppStatusCardModal({ visible, onClose, song }) {
  const { colors, isDark, deviceId } = useSettings();
  const [selectedThemeId, setSelectedThemeId] = useState('purple');
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const cardRef = useRef(null);

  const activeTheme = CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0];
  const quoteText = song ? extractCardQuote(song.lyrics) : '';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (!visible || !song) return null;

  // ── Share Image to WhatsApp Status ──
  const handleShareImage = async () => {
    if (song?.id) logSongEvent(song.id, 'share_status', deviceId);
    setIsSharing(true);
    try {
      const { captureRef } = require('react-native-view-shot');
      const Sharing = require('expo-sharing');

      if (cardRef.current) {
        const uri = await captureRef(cardRef.current, {
          format: 'png',
          quality: 1.0,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share to WhatsApp Status',
            UTI: 'public.png',
          });
          setIsSharing(false);
          return;
        }
      }
    } catch (err) {
      console.log('Image share fallback:', err);
    }

    // Fallback if image capture is not available: open WhatsApp directly with text quote
    handleShareTextWhatsApp();
    setIsSharing(false);
  };

  // ── Share formatted text to WhatsApp ──
  const handleShareTextWhatsApp = async () => {
    if (song?.id) logSongEvent(song.id, 'share_status', deviceId);
    const formatted = `“${quoteText}”\n\n— “${song.title}”\n\nGet the app on Google Play Store:\n${PLAY_STORE_URL}`;
    const url = `whatsapp://send?text=${encodeURIComponent(formatted)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Share.share({
          message: formatted,
          title: song.title,
        });
      }
    } catch (err) {
      await Share.share({
        message: formatted,
        title: song.title,
      });
    }
  };

  // ── Copy text & app link ──
  const handleCopyQuote = async () => {
    const formatted = `“${quoteText}”\n\n— “${song.title}”\n\nGet the app on Google Play Store:\n${PLAY_STORE_URL}`;
    await Clipboard.setStringAsync(formatted);
    showToast('Quote copied to clipboard');
  };

  // ── System Share Sheet ──
  const handleMoreShare = async () => {
    if (song?.id) logSongEvent(song.id, 'share_status', deviceId);
    const formatted = `“${quoteText}”\n\n— “${song.title}”\n\nGet the app on Google Play Store:\n${PLAY_STORE_URL}`;
    try {
      await Share.share({
        message: formatted,
        title: song.title,
      });
    } catch (_) {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#110D1D' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.statusBadge}>
                <WhatsAppIcon size={16} color="#25D366" />
                <Text style={styles.statusBadgeText}>WhatsApp Status Card</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ── Status Card Preview (9:16 aspect) ── */}
            <View style={styles.cardShadowWrap}>
              <View ref={cardRef} collapsable={false} style={styles.cardContainer}>
                <LinearGradient
                  colors={activeTheme.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  {/* Faint Logo Watermark in the middle */}
                  <View style={styles.cardWatermarkCenter} pointerEvents="none">
                    <Image
                      source={require('../../assets/icon.png')}
                      style={styles.cardWatermarkLogo}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Decorative quote mark */}
                  <Text style={styles.bigQuoteMark}>“</Text>

                  {/* Main Lyric Quote */}
                  <View style={styles.quoteBody}>
                    <Text style={styles.quoteText}>{quoteText}</Text>
                  </View>

                  {/* Bottom Song Attribution & Google Play Store Badge */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardDivider} />
                    <Text style={[styles.cardSongTitle, { color: activeTheme.titleCol }]} numberOfLines={1}>
                      — “{song.title}”
                    </Text>
                    <View style={styles.cardPlayBadge}>
                      <PlayStoreIcon size={10} color={activeTheme.titleCol} />
                      <Text style={[styles.cardAppWatermark, { color: activeTheme.titleCol }]}>
                        Get the app on Google Play Store
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* ── Theme Swatches ── */}
            <View style={styles.themeSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Choose Background Theme:
              </Text>
              <View style={styles.swatchRow}>
                {CARD_THEMES.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <TouchableOpacity
                      key={theme.id}
                      onPress={() => setSelectedThemeId(theme.id)}
                      style={[
                        styles.swatchBtn,
                        isSelected && styles.swatchBtnSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={theme.colors}
                        style={styles.swatchGradient}
                      >
                        {isSelected && <Check size={14} color="#FFF" />}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Action Buttons ── */}
            <View style={styles.actionsWrap}>
              {/* Primary: Share Image to WhatsApp Status */}
              <TouchableOpacity
                style={styles.whatsAppBtn}
                onPress={handleShareImage}
                activeOpacity={0.85}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                ) : (
                  <WhatsAppIcon size={20} color="#FFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.whatsAppBtnText}>
                  {isSharing ? 'Preparing Card...' : 'Share to WhatsApp Status'}
                </Text>
              </TouchableOpacity>

              {/* Secondary Options Row */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleShareTextWhatsApp}
                  activeOpacity={0.7}
                >
                  <MessageSquare size={14} color={colors.textWhite} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: colors.textWhite }]}>
                    Send as Text
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleCopyQuote}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color={colors.textWhite} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryActionText, { color: colors.textWhite }]}>
                    Copy Quote
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleMoreShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={15} color={colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Toast feedback */}
            {toastMessage && (
              <View style={styles.toast}>
                <Text style={styles.toastText}>{toastMessage}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.9,
    borderRadius: 24,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    gap: 6,
  },
  statusBadgeText: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },

  // ── Card Shadow & Container (9:16 Aspect) ──
  cardShadowWrap: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    marginBottom: 16,
  },
  cardContainer: {
    width: width > 360 ? 280 : 250,
    height: width > 360 ? 380 : 340,
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardWatermarkCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardWatermarkLogo: {
    width: 124,
    height: 124,
    borderRadius: 26,
    opacity: 0.11,
  },
  bigQuoteMark: {
    position: 'absolute',
    top: -12,
    left: 12,
    fontSize: 84,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: 'rgba(255, 255, 255, 0.10)',
    fontWeight: 'bold',
    zIndex: 1,
  },
  quoteBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  cardFooter: {
    alignItems: 'center',
    zIndex: 2,
  },
  cardDivider: {
    width: 36,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 8,
  },
  cardSongTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  cardPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 5,
  },
  cardAppWatermark: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Swatches ──
  themeSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatchBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchBtnSelected: {
    borderColor: '#25D366',
  },
  swatchGradient: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Actions ──
  actionsWrap: {
    width: '100%',
    gap: 10,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 44,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
