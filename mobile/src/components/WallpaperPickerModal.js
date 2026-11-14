import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Image as ImageIcon, Sparkles } from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { WALLPAPERS, getWallpaperById } from '../lib/wallpapers';
import ChatWallpaperBackground from './ChatWallpaperBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WallpaperPickerModal({ visible, onClose }) {
  const { colors, isDark, chatWallpaper, setChatWallpaper } = useSettings();
  const currentWallpaper = getWallpaperById(chatWallpaper);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#161324' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View>
              <Text style={[styles.title, { color: colors.textWhite }]}>Chat Wallpaper</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choose a soothing background for your community chats
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.textWhite} />
            </TouchableOpacity>
          </View>

          {/* Live Preview Card */}
          <View style={styles.previewContainer}>
            <View style={[styles.previewFrame, { borderColor: colors.divider }]}>
              {/* Wallpaper behind preview */}
              <ChatWallpaperBackground
                wallpaperId={chatWallpaper}
                isDark={isDark}
                colors={colors}
              />

              {/* Simulated chat bubbles */}
              <View style={styles.previewChatContent}>
                {/* Incoming bubble */}
                <View
                  style={[
                    styles.previewBubbleThem,
                    {
                      backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Text style={[styles.previewHandle, { color: colors.purpleAccent }]}>
                    Grace M.
                  </Text>
                  <Text style={[styles.previewMsgText, { color: colors.textWhite }]}>
                    May your day be filled with peace and joyful songs.
                  </Text>
                  <Text style={[styles.previewTime, { color: colors.textMuted }]}>
                    8:15 AM
                  </Text>
                </View>

                {/* Outgoing bubble */}
                <View
                  style={[
                    styles.previewBubbleMe,
                    { backgroundColor: isDark ? '#6D28D9' : '#7C3AED' },
                  ]}
                >
                  <Text style={[styles.previewMsgText, { color: '#FFFFFF' }]}>
                    Thank you! The melodies always bring comfort.
                  </Text>
                  <Text style={[styles.previewTime, { color: 'rgba(255,255,255,0.75)' }]}>
                    8:16 AM
                  </Text>
                </View>
              </View>

              <View style={styles.previewBadge}>
                <Sparkles size={11} color="#A78BFA" />
                <Text style={styles.previewBadgeText}>{currentWallpaper.name}</Text>
              </View>
            </View>
          </View>

          {/* Wallpapers Grid List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
              SELECT A WALLPAPER
            </Text>

            <View style={styles.grid}>
              {WALLPAPERS.map((wp) => {
                const isSelected = wp.id === (chatWallpaper || 'default');
                const gradientColors = isDark ? wp.darkGradient : wp.lightGradient;

                return (
                  <TouchableOpacity
                    key={wp.id}
                    onPress={() => setChatWallpaper(wp.id)}
                    style={[
                      styles.wallpaperCard,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderColor: isSelected ? colors.purpleAccent : colors.divider,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    {/* Swatch */}
                    <View style={styles.swatchWrap}>
                      <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.swatchGradient}
                      />
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: colors.purple }]}>
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>

                    {/* Meta */}
                    <Text
                      style={[
                        styles.wpName,
                        { color: isSelected ? colors.purpleAccent : colors.textWhite },
                      ]}
                      numberOfLines={1}
                    >
                      {wp.name}
                    </Text>
                    <Text style={[styles.wpSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {wp.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: colors.purple }]}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
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
    height: '84%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  previewFrame: {
    height: 145,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  previewChatContent: {
    padding: 10,
    gap: 8,
  },
  previewBubbleThem: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  previewBubbleMe: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderBottomRightRadius: 2,
  },
  previewHandle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewMsgText: {
    fontSize: 11,
    lineHeight: 14,
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
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  wallpaperCard: {
    width: '48%',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
  },
  swatchWrap: {
    width: '100%',
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  swatchGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  checkCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  wpName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  wpSub: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 1,
    width: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
