import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Share,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Share2,
  Copy,
  Check,
  Sparkles,
  Download,
  ExternalLink,
  MessageCircle,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';

const { width, height } = Dimensions.get('window');

// ─── Beautiful Background Themes ─────────────────────────────────
const CARD_THEMES = [
  {
    id: 'purple',
    name: 'Kingdom Purple',
    colors: ['#581C87', '#3B0764', '#1E1B4B'],
    accent: '#A78BFA',
    titleCol: '#F3E8FF',
  },
  {
    id: 'gold',
    name: 'Golden Sunrise',
    colors: ['#92400E', '#78350F', '#451A03'],
    accent: '#FDE047',
    titleCol: '#FEF08A',
  },
  {
    id: 'blue',
    name: 'Peaceful Waters',
    colors: ['#1E40AF', '#1E3A8A', '#0F172A'],
    accent: '#60A5FA',
    titleCol: '#DBEAFE',
  },
  {
    id: 'emerald',
    name: 'Paradise Emerald',
    colors: ['#065F46', '#064E3B', '#022C22'],
    accent: '#34D399',
    titleCol: '#D1FAE5',
  },
  {
    id: 'midnight',
    name: 'Midnight Star',
    colors: ['#18181B', '#0F0A1A', '#000000'],
    accent: '#E4E4E7',
    titleCol: '#FFFFFF',
  },
];

/**
 * Extracts a multi-line quote suitable for a WhatsApp status card
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
  const { colors, isDark } = useSettings();
  const [selectedThemeId, setSelectedThemeId] = useState('purple');
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const cardRef = useRef(null);

  const activeTheme = CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0];
  const quoteText = song ? extractCardQuote(song.lyrics) : '';
  const shareUrl = 'https://originalsongs.vercel.app';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  if (!visible || !song) return null;

  // ── Share Image to WhatsApp Status ──
  const handleShareImage = async () => {
    setIsSharing(true);
    try {
      // Dynamically load view-shot and expo-sharing
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
    const formatted = `“${quoteText}”\n\n— “${song.title}” (JW Original Song)\n\n📲 Read lyrics in the app:\n${shareUrl}`;
    const url = `whatsapp://send?text=${encodeURIComponent(formatted)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to system share sheet
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
    const formatted = `“${quoteText}”\n\n— “${song.title}” (JW Original Song)\n\n📲 Shared via Original Song Lyrics App: ${shareUrl}`;
    await Clipboard.setStringAsync(formatted);
    showToast('Quote copied to clipboard! 📋');
  };

  // ── System Share Sheet ──
  const handleMoreShare = async () => {
    const formatted = `“${quoteText}”\n\n— “${song.title}”\n\n📲 Get the app: ${shareUrl}`;
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
                <MessageCircle size={15} color="#25D366" />
                <Text style={styles.statusBadgeText}>WhatsApp Status Card</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textMuted} />
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
                  {/* Decorative big quotation mark */}
                  <Text style={styles.bigQuoteMark}>“</Text>

                  {/* Top Branding Pill */}
                  <View style={styles.cardTopBranding}>
                    <Sparkles size={11} color={activeTheme.accent} style={{ marginRight: 5 }} />
                    <Text style={[styles.cardTopBrandingText, { color: activeTheme.accent }]}>
                      JW Original Songs
                    </Text>
                  </View>

                  {/* Main Lyric Quote */}
                  <View style={styles.quoteBody}>
                    <Text style={styles.quoteText}>{quoteText}</Text>
                  </View>

                  {/* Bottom Song Attribution & Viral Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardDivider} />
                    <Text style={[styles.cardSongTitle, { color: activeTheme.titleCol }]} numberOfLines={1}>
                      — “{song.title}”
                    </Text>
                    <Text style={styles.cardAppWatermark}>
                      📲 Get the App: originalsongs.vercel.app
                    </Text>
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
                  <MessageCircle size={20} color="#FFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.whatsAppBtnText}>
                  {isSharing ? 'Generating Card...' : 'Share to WhatsApp Status'}
                </Text>
              </TouchableOpacity>

              {/* Secondary Options Row */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleShareTextWhatsApp}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.textWhite }]}>
                    💬 Text to WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleCopyQuote}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color={colors.textWhite} style={{ marginRight: 4 }} />
                  <Text style={[styles.secondaryActionText, { color: colors.textWhite }]}>
                    Copy Quote
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}
                  onPress={handleMoreShare}
                  activeOpacity={0.7}
                >
                  <Share2 size={16} color={colors.textWhite} />
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
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
  },
  bigQuoteMark: {
    position: 'absolute',
    top: -10,
    left: 12,
    fontSize: 84,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: 'rgba(255, 255, 255, 0.12)',
    fontWeight: 'bold',
  },
  cardTopBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 2,
  },
  cardTopBrandingText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    lineHeight: 25,
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardFooter: {
    alignItems: 'center',
    zIndex: 2,
  },
  cardDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 8,
  },
  cardSongTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardAppWatermark: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 42,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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

