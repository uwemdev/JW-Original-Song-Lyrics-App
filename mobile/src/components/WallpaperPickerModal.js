import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ArrowLeft } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { WALLPAPERS, THEME_CATEGORIES, getWallpaperById } from '../lib/wallpapers';
import ChatWallpaperBackground from './ChatWallpaperBackground';

export default function WallpaperPickerModal({ visible, onClose }) {
  const { colors, isDark, chatWallpaper, setChatWallpaper } = useSettings();
  const insets = useSafeAreaInsets();
  const currentWallpaper = getWallpaperById(chatWallpaper);
  const selectedWallpaperId = currentWallpaper.id;

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#110D1D' : '#FFFFFF', paddingTop: insets.top + 8 }]}>
          {/* Header styled like WhatsApp */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ArrowLeft size={18} color={colors.textWhite} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.textWhite }]}>Chat theme</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.doneHeaderBtn, { backgroundColor: currentWallpaper.bubbleColor }]}
              activeOpacity={0.8}
            >
              <Text style={styles.doneHeaderBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* WhatsApp-style Live Interactive Preview Card */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewFrame, { borderColor: colors.divider }]}>
              {/* Wallpaper behind preview */}
              <ChatWallpaperBackground
                wallpaperId={selectedWallpaperId}
                isDark={isDark}
                colors={colors}
                preview
              />

              {/* Simulated chat bubbles that change with the theme */}
              <View style={styles.previewChatContent}>
                {/* Incoming bubble (grey) */}
                <View
                  style={[
                    styles.previewBubbleThem,
                    {
                      backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  <Text style={[styles.previewHandle, { color: isDark ? '#C4B5FD' : '#5B21B6' }]}>
                    Community Brother
                  </Text>
                  <Text style={[styles.previewMsgText, { color: colors.textWhite }]}>
                    May your day be filled with peace and joyful songs.
                  </Text>
                  <Text style={[styles.previewTime, { color: colors.textMuted }]}>
                    8:15 AM
                  </Text>
                </View>

                {/* Outgoing bubble matching theme's vibrant color */}
                <View
                  style={[
                    styles.previewBubbleMe,
                    { backgroundColor: currentWallpaper.bubbleColor },
                  ]}
                >
                  <Text style={[styles.previewMsgText, { color: currentWallpaper.bubbleTextColor || '#FFFFFF' }]}>
                    Thank you! The melodies always bring comfort.
                  </Text>
                  <Text style={[styles.previewTime, { color: '#FFFFFF' }]}>
                    8:16 AM
                  </Text>
                </View>
              </View>

              {/* Theme Badge */}
              <View style={styles.previewBadge}>
                <View style={[styles.previewDot, { backgroundColor: currentWallpaper.bubbleColor }]} />
                <Text style={styles.previewBadgeText}>{currentWallpaper.name}</Text>
              </View>
            </View>
          </View>

          {/* Helper caption like WhatsApp */}
          <View style={styles.captionRow}>
            <Text style={[styles.captionText, { color: colors.textMuted }]}>
              Only you can see this theme. Outgoing bubbles match the wallpaper.
            </Text>
          </View>

          {/* Categorized WhatsApp-style Phone Themes */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {THEME_CATEGORIES.map((category) => {
              const themes = WALLPAPERS.filter((w) => w.category === category);
              if (themes.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.sectionHeading, { color: colors.textWhite }]}>
                    {category}
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRow}
                  >
                    {themes.map((wp) => {
                      const isSelected = wp.id === selectedWallpaperId;
                      return (
                        <TouchableOpacity
                          key={wp.id}
                          onPress={() => setChatWallpaper(wp.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`${wp.name}. ${wp.subtitle}`}
                          style={[
                            styles.phoneCard,
                            {
                              borderColor: isSelected ? wp.bubbleColor : colors.divider,
                              borderWidth: isSelected ? 2.5 : 1,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          {/* Miniature Phone Wallpaper Background */}
                          <ChatWallpaperBackground
                            wallpaperId={wp.id}
                            isDark={isDark}
                            colors={colors}
                            preview
                          />

                          {/* Mini Speech Bubbles inside Card */}
                          <View style={styles.miniChatContainer} pointerEvents="none">
                            {/* Incoming grey bubble */}
                            <View
                              style={[
                                styles.miniBubbleThem,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.22)'
                                    : 'rgba(0,0,0,0.15)',
                                },
                              ]}
                            />
                            {/* Outgoing colored bubble */}
                            <View
                              style={[
                                styles.miniBubbleMe,
                                { backgroundColor: wp.bubbleColor },
                              ]}
                            />
                          </View>

                          {/* Selection Badge like WhatsApp */}
                          {isSelected && (
                            <View style={[styles.selectedCircleBadge, { backgroundColor: wp.bubbleColor }]}>
                              <Check size={11} color="#FFFFFF" strokeWidth={3.5} />
                            </View>
                          )}

                          <View style={styles.cardFooter} pointerEvents="none">
                            <Text
                              style={styles.phoneCardLabel}
                              numberOfLines={1}
                            >
                              {wp.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 7,
    borderRadius: 20,
  },
  doneHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  doneHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  previewFrame: {
    height: 156,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  previewChatContent: {
    padding: 12,
    gap: 8,
    zIndex: 10,
  },
  previewBubbleThem: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderBottomLeftRadius: 3,
    borderWidth: 1,
  },
  previewBubbleMe: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderBottomRightRadius: 3,
  },
  previewHandle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewMsgText: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewTime: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  previewBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 11,
  },
  previewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  captionRow: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  captionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 6,
    gap: 18,
  },
  categorySection: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  categoryRow: {
    gap: 12,
    paddingVertical: 2,
  },
  phoneCard: {
    width: 86,
    height: 136,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 6,
  },
  miniChatContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  miniBubbleThem: {
    width: 44,
    height: 18,
    borderRadius: 9,
    borderBottomLeftRadius: 2,
    alignSelf: 'flex-start',
  },
  miniBubbleMe: {
    width: 44,
    height: 18,
    borderRadius: 9,
    borderBottomRightRadius: 2,
    alignSelf: 'flex-end',
  },
  selectedCircleBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 12,
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1B2E',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  phoneCardLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
