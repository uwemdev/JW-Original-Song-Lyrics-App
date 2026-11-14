import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Users,
  MessageSquare,
  Send,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  Star,
  Ban,
  Flag,
  Globe,
  RefreshCw,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import {
  validateCleanMessage,
  getOrCreateCommunityProfile,
  checkBanStatus,
  AVATAR_OPTIONS,
} from '../lib/community';

const ONBOARDED_KEY = '@community_terms_accepted_v1';

export default function CommunityScreen({ navigation }) {
  const { colors, isDark, deviceId } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, isDark);

  // Profile & Ban state
  const [profile, setProfile] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Onboarding Gatekeeper Modal
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [gatekeeperStep, setGatekeeperStep] = useState(1); // 1: Terms, 2: Math, 3: Avatar
  const [mathQuestion, setMathQuestion] = useState({ a: 7, b: 5, answer: 12 });
  const [userMathInput, setUserMathInput] = useState('');
  const [mathError, setMathError] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(1);
  const [optInPush, setOptInPush] = useState(true);

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState('lounge'); // 'lounge' (group), 'direct' (private)
  const [onlineCount, setOnlineCount] = useState(1);

  // Group Lounge State
  const [groupMessages, setGroupMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [validationWarning, setValidationWarning] = useState('');
  const groupListRef = useRef(null);

  // Direct Messaging State
  const [directThreads, setDirectThreads] = useState([]);
  const [activeDirectThread, setActiveDirectThread] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);
  const [directInputText, setDirectInputText] = useState('');
  const directListRef = useRef(null);

  // User Action Sheet Modal (when tapping a user in group chat)
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('Sharing private contact information');

  // Generate random math problem
  const generateMathProblem = () => {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 8) + 1;
    setMathQuestion({ a, b, answer: a + b });
    setUserMathInput('');
    setMathError('');
  };

  // 1. Initial Load & Onboarding Check
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (!deviceId) return;

        // Check active bans
        const banCheck = await checkBanStatus(deviceId);
        if (banCheck.isBanned) {
          setIsBanned(true);
          setBanInfo(banCheck);
          setLoading(false);
          return;
        }

        // Check onboarding completion
        const hasAccepted = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (!hasAccepted) {
          generateMathProblem();
          setShowGatekeeper(true);
          setLoading(false);
          return;
        }

        // Load profile
        const prof = await getOrCreateCommunityProfile(deviceId);
        setProfile(prof);
        loadGroupMessages();
        loadDirectThreads();
        setupRealtime(prof);
      } catch (err) {
        console.warn('Community init error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [deviceId]);

  // Realtime Presence & Group Chat Subscription
  const setupRealtime = (userProf) => {
    try {
      const channel = supabase.channel('community_room', {
        config: { presence: { key: userProf.device_id } },
      });

      // Presence: track online users
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(Math.max(1, count));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              device_id: userProf.device_id,
              handle: userProf.handle,
              online_at: new Date().toISOString(),
            });
          }
        });

      // Group Messages Realtime broadcast
      const msgSub = supabase
        .channel('public:community_group_messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'community_group_messages' },
          (payload) => {
            setGroupMessages((prev) => {
              if (prev.find((m) => m.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(msgSub);
      };
    } catch (_) {}
  };

  // Load recent Group Lounge messages
  const loadGroupMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('community_group_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error && error.code !== '42P01') throw error;
      setGroupMessages(data || []);
    } catch (err) {
      console.warn('Error loading group messages:', err);
    }
  };

  // Load Direct Message Threads
  const loadDirectThreads = async () => {
    try {
      if (!deviceId) return;
      const { data, error } = await supabase
        .from('community_direct_threads')
        .select('*, requester:community_profiles!requester_device_id(handle, star_level, avatar_id, country_code), recipient:community_profiles!recipient_device_id(handle, star_level, avatar_id, country_code)')
        .or(`requester_device_id.eq.${deviceId},recipient_device_id.eq.${deviceId}`)
        .order('last_message_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      setDirectThreads(data || []);
    } catch (err) {
      console.warn('Error loading direct threads:', err);
    }
  };

  // Load Direct Messages inside selected thread
  const openDirectThread = async (thread) => {
    setActiveDirectThread(thread);
    try {
      const { data, error } = await supabase
        .from('community_direct_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setDirectMessages(data || []);

      // Mark unread as read
      await supabase
        .from('community_direct_messages')
        .update({ is_read: true })
        .eq('thread_id', thread.id)
        .neq('sender_device_id', deviceId)
        .eq('is_read', false);
    } catch (err) {
      console.warn('Error opening thread:', err);
    }
  };

  // Send Group Lounge Message
  const handleSendGroupMessage = async () => {
    if (!inputText.trim() || sending || !profile) return;

    // Contact info & privacy validation
    const check = validateCleanMessage(inputText);
    if (!check.isValid) {
      setValidationWarning(check.error);
      return;
    }
    setValidationWarning('');

    const text = check.cleanText;
    setInputText('');
    setSending(true);

    try {
      const payload = {
        sender_device_id: profile.device_id,
        sender_handle: profile.handle,
        sender_star_level: profile.star_level || 1,
        sender_avatar_id: profile.avatar_id || 1,
        sender_country_code: profile.country_code || 'US',
        message: text,
      };

      const { data, error } = await supabase
        .from('community_group_messages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setGroupMessages((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.warn('Failed to send group message:', err);
    } finally {
      setSending(false);
    }
  };

  // Send Direct Message
  const handleSendDirectMessage = async () => {
    if (!directInputText.trim() || !activeDirectThread || !profile) return;

    const check = validateCleanMessage(directInputText);
    if (!check.isValid) {
      Alert.alert('Safety Restriction', check.error);
      return;
    }

    const text = check.cleanText;
    setDirectInputText('');

    try {
      const payload = {
        thread_id: activeDirectThread.id,
        sender_device_id: profile.device_id,
        message: text,
        is_read: false,
      };

      const { data, error } = await supabase
        .from('community_direct_messages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDirectMessages((prev) => [...prev, data]);
        // Update thread timestamp
        await supabase
          .from('community_direct_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', activeDirectThread.id);
      }
    } catch (err) {
      console.warn('Failed to send direct message:', err);
    }
  };

  // Send Direct Message Request to another user
  const handleInitiateMessageRequest = async (targetUser) => {
    if (!targetUser || targetUser.device_id === profile.device_id) return;
    setSelectedUserModal(null);

    try {
      // Check if thread already exists
      const existing = directThreads.find(
        (t) =>
          (t.requester_device_id === profile.device_id && t.recipient_device_id === targetUser.device_id) ||
          (t.recipient_device_id === profile.device_id && t.requester_device_id === targetUser.device_id)
      );

      if (existing) {
        setActiveTab('direct');
        openDirectThread(existing);
        return;
      }

      // Create new pending thread
      const { data, error } = await supabase
        .from('community_direct_threads')
        .insert([
          {
            requester_device_id: profile.device_id,
            recipient_device_id: targetUser.device_id,
            status: 'pending',
          },
        ])
        .select('*, requester:community_profiles!requester_device_id(handle, star_level, avatar_id, country_code), recipient:community_profiles!recipient_device_id(handle, star_level, avatar_id, country_code)')
        .single();

      if (error) throw error;

      if (data) {
        setDirectThreads((prev) => [data, ...prev]);
        setActiveTab('direct');
        openDirectThread(data);
        Alert.alert('Request Sent', `Message request sent to ${targetUser.handle}. They can accept to begin chatting.`);
      }
    } catch (err) {
      Alert.alert('Notice', 'Unable to initiate request: ' + (err.message || 'Unknown'));
    }
  };

  // Respond to Direct Message Request (Accept, Decline, Block)
  const handleRespondToRequest = async (threadId, newStatus) => {
    try {
      const { error } = await supabase
        .from('community_direct_threads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;

      setDirectThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, status: newStatus } : t))
      );

      if (newStatus === 'accepted') {
        const updated = directThreads.find((t) => t.id === threadId);
        if (updated) openDirectThread({ ...updated, status: 'accepted' });
      } else {
        setActiveDirectThread(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update request: ' + err.message);
    }
  };

  // Submit report to Admin panel
  const handleSubmitReport = async () => {
    if (!reportTarget) return;
    try {
      await supabase.from('community_reports').insert([
        {
          reporter_device_id: deviceId,
          reported_device_id: reportTarget.device_id,
          reported_handle: reportTarget.handle,
          message_id: reportTarget.message_id || null,
          message_text: reportTarget.message_text || 'Reported user behavior',
          chat_type: reportTarget.chat_type || 'group',
          reason: reportReason,
        },
      ]);
      setShowReportModal(false);
      Alert.alert('Report Received', 'Thank you. The admin team has received your report and will take action if guidelines were violated.');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  // Complete Onboarding Gatekeeper
  const handleCompleteGatekeeper = async () => {
    // Verify Math Answer
    if (parseInt(userMathInput.trim(), 10) !== mathQuestion.answer) {
      setMathError('Incorrect answer. Please solve the simple math problem.');
      generateMathProblem();
      return;
    }

    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, new Date().toISOString());
      setShowGatekeeper(false);

      const prof = await getOrCreateCommunityProfile(deviceId);
      // Update selected avatar
      await supabase
        .from('community_profiles')
        .update({ avatar_id: selectedAvatarId })
        .eq('device_id', deviceId);

      prof.avatar_id = selectedAvatarId;
      setProfile(prof);
      loadGroupMessages();
      loadDirectThreads();
      setupRealtime(prof);
    } catch (err) {
      console.warn('Gatekeeper error:', err);
    }
  };

  // Render Stars
  const renderStarBadges = (level) => {
    const count = Math.max(1, Math.min(5, level || 1));
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[...Array(count)].map((_, i) => (
          <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />
        ))}
      </View>
    );
  };

  // Avatar helper
  const getAvatarInfo = (id) => {
    return AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];
  };

  // ── BANNED SCREEN ──
  if (isBanned) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ban size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textWhite, textAlign: 'center' }}>
          Access Suspended
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          Your access to the community has been temporarily restricted for violating wholesome fellowship rules.
        </Text>
        {banInfo?.reason && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, marginTop: 16, width: '100%' }}>
            <Text style={{ fontSize: 12, color: '#EF4444', textAlign: 'center' }}>
              Reason: {banInfo.reason}
            </Text>
          </View>
        )}
        {banInfo?.bannedUntil && (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 12 }}>
            Expires: {new Date(banInfo.bannedUntil).toLocaleDateString()}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.primaryBtn, { marginTop: 24, width: '100%' }]}
        >
          <Text style={styles.primaryBtnText}>Return to App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── LOADING SCREEN ──
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.purpleAccent} />
        <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 13 }}>
          Connecting to Fellowship Lounge...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── TOP HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (activeDirectThread) {
              setActiveDirectThread(null);
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color={colors.textWhite} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>
              {activeDirectThread
                ? activeDirectThread.requester_device_id === deviceId
                  ? activeDirectThread.recipient?.handle || 'User'
                  : activeDirectThread.requester?.handle || 'User'
                : 'Fellowship Lounge'}
            </Text>
            {activeDirectThread && (
              <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
            )}
          </View>

          {/* Subtitle / Presence Indicator */}
          {!activeDirectThread && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
              <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>
                {onlineCount} Online
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>·</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Global Community</Text>
            </View>
          )}
        </View>

        {/* User Handle Badge (e.g. U71234) */}
        {profile && !activeDirectThread && (
          <View style={styles.myProfileBadge}>
            <View style={[styles.avatarCircle, { backgroundColor: getAvatarInfo(profile.avatar_id).bg }]}>
              <Text style={styles.avatarInitial}>{getAvatarInfo(profile.avatar_id).initial}</Text>
            </View>
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.myHandleText}>{profile.handle}</Text>
              {renderStarBadges(profile.star_level)}
            </View>
          </View>
        )}
      </View>

      {/* ── SUB-TABS (Group Lounge vs Direct Messages) ── */}
      {!activeDirectThread && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('lounge')}
            style={[styles.tabItem, activeTab === 'lounge' && styles.tabItemActive]}
          >
            <Users size={16} color={activeTab === 'lounge' ? colors.purpleAccent : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'lounge' && styles.tabTextActive]}>
              Group Lounge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('direct');
              loadDirectThreads();
            }}
            style={[styles.tabItem, activeTab === 'direct' && styles.tabItemActive]}
          >
            <MessageSquare size={16} color={activeTab === 'direct' ? colors.purpleAccent : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
              Direct Messages
            </Text>
            {directThreads.some((t) => t.status === 'pending' && t.recipient_device_id === deviceId) && (
              <View style={styles.unreadDot} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── VIEW 1: GROUP LOUNGE ── */}
      {!activeDirectThread && activeTab === 'lounge' && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={groupListRef}
            data={groupMessages}
            keyExtractor={(item) => String(item.id)}
            inverted
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isMe = item.sender_device_id === deviceId;
              const avatar = getAvatarInfo(item.sender_avatar_id);
              return (
                <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
                  {/* Avatar (tap to open profile modal) */}
                  {!isMe && (
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedUserModal({
                          device_id: item.sender_device_id,
                          handle: item.sender_handle,
                          star_level: item.sender_star_level,
                          avatar_id: item.sender_avatar_id,
                          country_code: item.sender_country_code,
                          message_id: item.id,
                          message_text: item.message,
                        })
                      }
                      style={[styles.avatarCircleSmall, { backgroundColor: avatar.bg }]}
                    >
                      <Text style={styles.avatarInitialSmall}>{avatar.initial}</Text>
                    </TouchableOpacity>
                  )}

                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {/* Header info (Handle + Stars + Country) */}
                    {!isMe && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={styles.senderHandle}>{item.sender_handle}</Text>
                        {renderStarBadges(item.sender_star_level)}
                        {item.sender_country_code && (
                          <Text style={styles.countryBadge}>{item.sender_country_code}</Text>
                        )}
                      </View>
                    )}

                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                      {item.message}
                    </Text>

                    <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Validation Warning Notice */}
          {validationWarning ? (
            <View style={styles.warningBox}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.warningText}>{validationWarning}</Text>
            </View>
          ) : null}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Send an encouraging thought..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (validationWarning) setValidationWarning('');
              }}
              multiline
              maxLength={280}
            />
            <TouchableOpacity
              onPress={handleSendGroupMessage}
              disabled={!inputText.trim() || sending}
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            >
              <Send size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── VIEW 2: DIRECT MESSAGES INBOX ── */}
      {!activeDirectThread && activeTab === 'direct' && (
        <View style={{ flex: 1, padding: 16 }}>
          {directThreads.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <MessageSquare size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textWhite }}>
                No Direct Messages Yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, maxWidth: 260 }}>
                Tap on any user's avatar in the Group Lounge to send them a private message request.
              </Text>
            </View>
          ) : (
            <FlatList
              data={directThreads}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isRequester = item.requester_device_id === deviceId;
                const otherUser = isRequester ? item.recipient : item.requester;
                const otherHandle = otherUser?.handle || 'Fellow Believer';
                const avatar = getAvatarInfo(otherUser?.avatar_id || 1);
                const isPendingForMe = item.status === 'pending' && !isRequester;

                return (
                  <TouchableOpacity
                    onPress={() => openDirectThread(item)}
                    style={styles.threadCard}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={styles.avatarInitial}>{avatar.initial}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textWhite }}>
                            {otherHandle}
                          </Text>
                          {renderStarBadges(otherUser?.star_level || 1)}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {new Date(item.last_message_at).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Status / Request banner */}
                      {isPendingForMe ? (
                        <View style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600' }}>
                            Wants to connect with you
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleRespondToRequest(item.id, 'accepted')}
                              style={[styles.reqBtn, { backgroundColor: '#22C55E' }]}
                            >
                              <Text style={styles.reqBtnText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRespondToRequest(item.id, 'declined')}
                              style={[styles.reqBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}
                            >
                              <Text style={[styles.reqBtnText, { color: '#EF4444' }]}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : item.status === 'pending' ? (
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                          Request pending approval...
                        </Text>
                      ) : item.status === 'declined' ? (
                        <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                          Request declined
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                          Tap to open conversation
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ── VIEW 3: ACTIVE DIRECT CHAT ── */}
      {activeDirectThread && (
        <View style={{ flex: 1 }}>
          {/* If pending, notice */}
          {activeDirectThread.status === 'pending' ? (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', padding: 12, margin: 16, borderRadius: 8 }}>
              <Text style={{ color: '#F59E0B', fontSize: 12, textAlign: 'center' }}>
                {activeDirectThread.requester_device_id === deviceId
                  ? 'Waiting for recipient to accept your message request.'
                  : 'Accept this request to enable two-way messaging.'}
              </Text>
            </View>
          ) : null}

          <FlatList
            ref={directListRef}
            data={directMessages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isMe = item.sender_device_id === deviceId;
              return (
                <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                      {item.message}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {/* BBM status: Delivered (D) and Read (R) */}
                      {isMe && (
                        <Text style={{ fontSize: 10, color: item.is_read ? '#60A5FA' : 'rgba(255,255,255,0.7)', fontWeight: '700' }}>
                          {item.is_read ? 'R' : 'D'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Direct Input Bar */}
          {activeDirectThread.status === 'accepted' ? (
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a private message..."
                placeholderTextColor={colors.textMuted}
                value={directInputText}
                onChangeText={setDirectInputText}
                multiline
                maxLength={280}
              />
              <TouchableOpacity
                onPress={handleSendDirectMessage}
                disabled={!directInputText.trim()}
                style={[styles.sendBtn, !directInputText.trim() && { opacity: 0.5 }]}
              >
                <Send size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* ── MODAL: User Action Sheet (when tapping avatar in group chat) ── */}
      {selectedUserModal && (
        <Modal transparent animationType="fade" visible={Boolean(selectedUserModal)} onRequestClose={() => setSelectedUserModal(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.actionSheetCard, { backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF' }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.avatarCircleLarge, { backgroundColor: getAvatarInfo(selectedUserModal.avatar_id).bg }]}>
                  <Text style={styles.avatarInitialLarge}>{getAvatarInfo(selectedUserModal.avatar_id).initial}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textWhite, marginTop: 8 }}>
                  {selectedUserModal.handle}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {renderStarBadges(selectedUserModal.star_level)}
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>·</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{selectedUserModal.country_code || 'Global'}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleInitiateMessageRequest(selectedUserModal)}
                style={styles.actionBtnPrimary}
              >
                <MessageSquare size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Send Message Request</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setReportTarget(selectedUserModal);
                  setSelectedUserModal(null);
                  setShowReportModal(true);
                }}
                style={[styles.actionBtnSecondary, { marginTop: 8 }]}
              >
                <Flag size={16} color="#EF4444" />
                <Text style={[styles.actionBtnTextSecondary, { color: '#EF4444' }]}>Report Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedUserModal(null)}
                style={{ padding: 12, alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── MODAL: Report Message ── */}
      {showReportModal && (
        <Modal transparent animationType="fade" visible={showReportModal} onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.actionSheetCard, { backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF' }]}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textWhite, marginBottom: 12 }}>
                Report Content to Admin
              </Text>

              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
                Select reason for reporting {reportTarget?.handle}:
              </Text>

              {[
                'Sharing prohibited phone numbers / contact info',
                'Unwholesome or disrespectful speech',
                'Spam or repetitive messages',
                'Harassment or unwanted requests',
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={[styles.reasonOption, reportReason === reason && styles.reasonOptionSelected]}
                >
                  <Text style={{ fontSize: 13, color: reportReason === reason ? colors.purpleAccent : colors.textWhite }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowReportModal(false)}
                  style={[styles.actionBtnSecondary, { flex: 1 }]}
                >
                  <Text style={styles.actionBtnTextSecondary}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmitReport}
                  style={[styles.actionBtnPrimary, { flex: 1, backgroundColor: '#EF4444' }]}
                >
                  <Text style={styles.actionBtnText}>Submit Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── MODAL: First-Time Onboarding Gatekeeper ── */}
      {showGatekeeper && (
        <Modal transparent animationType="slide" visible={showGatekeeper}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.gatekeeperCard, { backgroundColor: isDark ? '#181424' : '#FFFFFF' }]}>
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ShieldCheck size={36} color={colors.purpleAccent} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textWhite, marginTop: 8 }}>
                  Fellowship Lounge Guidelines
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  A safe, upbuilding space for believers worldwide
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 220, marginBottom: 16 }}>
                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#22C55E" style={{ marginTop: 2 }} />
                  <Text style={styles.ruleText}>Wholesome, encouraging speech only (Colossians 4:6).</Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#22C55E" style={{ marginTop: 2 }} />
                  <Text style={styles.ruleText}>No phone numbers, physical addresses, or personal contact info.</Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#22C55E" style={{ marginTop: 2 }} />
                  <Text style={styles.ruleText}>Strictly text-only. No external links, advertisements, or spam.</Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#22C55E" style={{ marginTop: 2 }} />
                  <Text style={styles.ruleText}>Your anonymous ID will be randomly assigned (e.g. U71234).</Text>
                </View>
              </ScrollView>

              {/* Math Verification Problem */}
              <View style={styles.mathBox}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textWhite }}>
                  Human Verification: What is {mathQuestion.a} + {mathQuestion.b} ?
                </Text>
                <TextInput
                  style={styles.mathInput}
                  placeholder="Enter number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={userMathInput}
                  onChangeText={(val) => {
                    setUserMathInput(val);
                    if (mathError) setMathError('');
                  }}
                  maxLength={4}
                />
                {mathError ? (
                  <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{mathError}</Text>
                ) : null}
              </View>

              {/* Avatar Selector */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>
                Choose Your Avatar Symbol
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {AVATAR_OPTIONS.map((av) => (
                    <TouchableOpacity
                      key={av.id}
                      onPress={() => setSelectedAvatarId(av.id)}
                      style={[
                        styles.avatarChoice,
                        { backgroundColor: av.bg },
                        selectedAvatarId === av.id && styles.avatarChoiceSelected,
                      ]}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{av.initial}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={handleCompleteGatekeeper}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Agree & Enter Lounge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    backBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textWhite,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    myProfileBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    avatarCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 12,
    },
    myHandleText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textWhite,
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      position: 'relative',
    },
    tabItemActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.purpleAccent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.purpleAccent,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#EF4444',
      position: 'absolute',
      top: 10,
      right: 20,
    },
    messageRow: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-end',
      gap: 8,
    },
    messageRowMe: {
      justifyContent: 'flex-end',
    },
    avatarCircleSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    avatarInitialSmall: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
    },
    bubble: {
      maxWidth: '75%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
    },
    bubbleMe: {
      backgroundColor: colors.purpleAccent,
      borderBottomRightRadius: 2,
    },
    bubbleThem: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
      borderBottomLeftRadius: 2,
    },
    senderHandle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.purpleAccent,
    },
    countryBadge: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: '700',
      paddingHorizontal: 4,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    messageText: {
      fontSize: 14,
      color: colors.textWhite,
      lineHeight: 19,
    },
    messageTextMe: {
      color: '#FFFFFF',
    },
    messageTime: {
      fontSize: 9,
      color: colors.textMuted,
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    messageTimeMe: {
      color: 'rgba(255,255,255,0.7)',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(239,68,68,0.1)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginHorizontal: 16,
      borderRadius: 6,
      marginBottom: 6,
    },
    warningText: {
      fontSize: 11,
      color: '#EF4444',
      flex: 1,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      gap: 8,
    },
    textInput: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.textWhite,
      maxHeight: 90,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.purpleAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    threadCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
      marginBottom: 10,
    },
    reqBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    reqBtnText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    actionSheetCard: {
      width: '100%',
      maxWidth: 340,
      borderRadius: 16,
      padding: 20,
    },
    avatarCircleLarge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitialLarge: {
      color: '#FFF',
      fontSize: 22,
      fontWeight: '700',
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.purpleAccent,
      paddingVertical: 12,
      borderRadius: 10,
    },
    actionBtnText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 13,
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
    },
    actionBtnTextSecondary: {
      color: colors.textWhite,
      fontWeight: '600',
      fontSize: 13,
    },
    reasonOption: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
      marginBottom: 6,
    },
    reasonOptionSelected: {
      borderColor: colors.purpleAccent,
      backgroundColor: 'rgba(139,92,246,0.1)',
    },
    gatekeeperCard: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 20,
      padding: 24,
    },
    ruleItem: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
      alignItems: 'flex-start',
    },
    ruleText: {
      fontSize: 12,
      color: colors.textWhite,
      flex: 1,
      lineHeight: 17,
    },
    mathBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      padding: 12,
      borderRadius: 10,
      marginBottom: 14,
    },
    mathInput: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      color: colors.textWhite,
      fontSize: 14,
      marginTop: 8,
    },
    avatarChoice: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarChoiceSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    primaryBtn: {
      backgroundColor: colors.purpleAccent,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
