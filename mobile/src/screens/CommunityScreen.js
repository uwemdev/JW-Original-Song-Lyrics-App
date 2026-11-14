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
  Image,
  Keyboard,
  Dimensions,
  Switch,
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
  CheckCheck,
  Lock,
  Bell,
  Settings,
  Music,
  VolumeX,
  Sparkles,
} from 'lucide-react-native';
import { useSettings } from '../context/SettingsContext';
import { useAudio } from '../context/AudioContext';
import {
  validateCleanMessage,
  getOrCreateCommunityProfile,
  updateCommunityProfile,
  updateCommunityNowPlaying,
  checkBanStatus,
  getCountryFlag,
  getUserJoinedAt,
  pingCommunityActive,
  fetchOnlineUsersCount,
  AVATAR_OPTIONS,
  getAvatarInfo,
  generateUserHandle,
} from '../lib/community';

const ONBOARDED_KEY = '@community_terms_accepted_v1';

const formatMessageTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return '';
  }
};

export default function CommunityScreen({ navigation, route }) {
  const { colors, isDark, deviceId } = useSettings();
  const { currentSong, isMiniPlayerVisible, isPlaying } = useAudio();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, isDark);

  // Keyboard height and container resize detection for flawless Android & iOS handling
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contentLayoutHeight, setContentLayoutHeight] = useState(0);
  const maxContentHeightRef = useRef(0);

  const handleContainerLayout = (e) => {
    const h = e.nativeEvent.layout.height;
    setContentLayoutHeight(h);
    if (!isKeyboardVisible) {
      maxContentHeightRef.current = Math.max(maxContentHeightRef.current, h);
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setIsKeyboardVisible(true);
      const kh = e?.endCoordinates?.height || 0;
      setKeyboardHeight(kh);
    };

    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const tabHeight = (Platform.OS === 'ios' ? 88 : 72) + insets.bottom;
  const isPlayerUp = isMiniPlayerVisible && Boolean(currentSong);
  const restingBottom = isPlayerUp ? tabHeight + 64 : tabHeight + 8;

  // Accurate detection: if layout height shrank by > 150px, Android OS already resized the window
  const didWindowResize =
    isKeyboardVisible &&
    maxContentHeightRef.current > 0 &&
    maxContentHeightRef.current - contentLayoutHeight > 150;

  // Adaptive bottom padding:
  // On Android: if window did not resize, lift the input bar by keyboardHeight
  // On iOS: KeyboardAvoidingView handles the lift smoothly
  const keyboardOffset =
    Platform.OS === 'android'
      ? didWindowResize
        ? 8
        : keyboardHeight > 0
        ? keyboardHeight
        : 8
      : Math.max(8, insets.bottom);

  const currentBottomPadding = isKeyboardVisible ? keyboardOffset : restingBottom;

  // Profile & Ban state
  const [profile, setProfile] = useState(null);
  const [userJoinedAt, setUserJoinedAt] = useState(null);
  const userJoinedAtRef = useRef(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep ref updated without causing effects to re-fire
  useEffect(() => {
    userJoinedAtRef.current = userJoinedAt;
  }, [userJoinedAt]);

  // Onboarding Gatekeeper Modal
  const [showGatekeeper, setShowGatekeeper] = useState(false);
  const [mathQuestion, setMathQuestion] = useState({ a: 7, b: 5, answer: 12 });
  const [userMathInput, setUserMathInput] = useState('');
  const [mathError, setMathError] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(1);

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
  const activeThreadRef = useRef(null);
  useEffect(() => {
    activeThreadRef.current = activeDirectThread;
  }, [activeDirectThread]);
  const [directMessages, setDirectMessages] = useState([]);
  const [directInputText, setDirectInputText] = useState('');
  const directListRef = useRef(null);

  // User Action Sheet Modal
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('Sharing prohibited phone numbers / contact info');

  // Community Profile & Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsAvatarId, setSettingsAvatarId] = useState(1);
  const [settingsHandle, setSettingsHandle] = useState('');
  const [settingsShareMusic, setSettingsShareMusic] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Live Now-Playing states
  const [selectedUserNowPlaying, setSelectedUserNowPlaying] = useState(null);
  const [chatPartnerNowPlaying, setChatPartnerNowPlaying] = useState(null);

  // Open settings helper
  const openSettingsModal = () => {
    if (!profile) return;
    setSettingsAvatarId(profile.avatar_id || 1);
    setSettingsHandle(profile.handle || '');
    setSettingsShareMusic(profile.share_now_playing !== false);
    setShowSettingsModal(true);
  };

  // Check if routed with openSettings request
  useEffect(() => {
    if (route?.params?.openSettings && profile) {
      openSettingsModal();
    }
  }, [route?.params?.openSettings, profile]);

  // Save Community Profile Settings
  const handleSaveSettings = async () => {
    if (!profile?.device_id || isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      const updates = {
        avatar_id: settingsAvatarId,
        handle: settingsHandle.trim() || profile.handle,
        share_now_playing: settingsShareMusic,
      };
      const updated = await updateCommunityProfile(profile.device_id, updates);
      if (updated) {
        setProfile(updated);
        setToastMsg('Profile preferences updated.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      }
      setShowSettingsModal(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Broadcast currently playing song for community presence
  useEffect(() => {
    if (!profile?.device_id) return;
    if (profile.share_now_playing === false) {
      updateCommunityNowPlaying(profile.device_id, null, false);
      return;
    }
    updateCommunityNowPlaying(profile.device_id, currentSong, isPlaying);
  }, [profile?.device_id, profile?.share_now_playing, currentSong?.id, isPlaying]);

  // Fetch now-playing song when a user is tapped on in Group Lounge
  useEffect(() => {
    if (!selectedUserModal?.device_id) {
      setSelectedUserNowPlaying(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('community_profiles')
          .select('current_song_title, is_playing, share_now_playing')
          .eq('device_id', selectedUserModal.device_id)
          .maybeSingle();

        if (isMounted) {
          if (data?.is_playing && data?.current_song_title && data?.share_now_playing !== false) {
            setSelectedUserNowPlaying(data.current_song_title);
          } else {
            setSelectedUserNowPlaying(null);
          }
        }
      } catch (_) {
        if (isMounted) setSelectedUserNowPlaying(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedUserModal?.device_id]);

  // Fetch and monitor now-playing song for 1-on-1 direct chat partner
  useEffect(() => {
    if (!activeDirectThread || !deviceId) {
      setChatPartnerNowPlaying(null);
      return;
    }

    const otherDeviceId =
      activeDirectThread.requester_device_id === deviceId
        ? activeDirectThread.recipient_device_id
        : activeDirectThread.requester_device_id;

    if (!otherDeviceId) return;

    let isMounted = true;
    const fetchPartnerSong = async () => {
      try {
        const { data } = await supabase
          .from('community_profiles')
          .select('current_song_title, is_playing, share_now_playing')
          .eq('device_id', otherDeviceId)
          .maybeSingle();

        if (isMounted) {
          if (data?.is_playing && data?.current_song_title && data?.share_now_playing !== false) {
            setChatPartnerNowPlaying(data.current_song_title);
          } else {
            setChatPartnerNowPlaying(null);
          }
        }
      } catch (_) {
        if (isMounted) setChatPartnerNowPlaying(null);
      }
    };

    fetchPartnerSong();

    // Live subscription for partner song change
    const partnerChannel = supabase
      .channel(`partner_presence_${otherDeviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_profiles',
          filter: `device_id=eq.${otherDeviceId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated && isMounted) {
            if (updated.is_playing && updated.current_song_title && updated.share_now_playing !== false) {
              setChatPartnerNowPlaying(updated.current_song_title);
            } else {
              setChatPartnerNowPlaying(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(partnerChannel);
    };
  }, [activeDirectThread?.id, deviceId]);

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
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
        if (!deviceId) return;

        // Check active bans
        const banCheck = await checkBanStatus(deviceId);
        if (banCheck.isBanned) {
          if (isMounted) {
            setIsBanned(true);
            setBanInfo(banCheck);
            setLoading(false);
          }
          return;
        }

        // Check onboarding completion
        const hasAccepted = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (!hasAccepted) {
          generateMathProblem();
          if (isMounted) {
            setShowGatekeeper(true);
            setLoading(false);
          }
          return;
        }

        // Load or create profile
        const prof = await getOrCreateCommunityProfile(deviceId);
        const joinedAt = await getUserJoinedAt(prof);

        if (isMounted) {
          setProfile(prof);
          setUserJoinedAt(joinedAt);
          userJoinedAtRef.current = joinedAt;
          loadGroupMessages(joinedAt);
          loadDirectThreads();
        }
      } catch (err) {
        console.warn('Community init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  // 2. Realtime Subscriptions & Online Presence Heartbeat
  useEffect(() => {
    if (!profile?.device_id) return;

    let heartbeatTimer = null;

    // Heartbeat ping & accurate online counter
    const runHeartbeat = async () => {
      await pingCommunityActive(profile.device_id);
      const dbCount = await fetchOnlineUsersCount();
      setOnlineCount((prev) => Math.max(1, dbCount, prev));
    };

    runHeartbeat();
    heartbeatTimer = setInterval(runHeartbeat, 30000);

    // Supabase Presence channel
    const presenceChannel = supabase.channel('community_presence', {
      config: { presence: { key: profile.device_id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const pCount = Object.keys(state).length;
        setOnlineCount((prev) => Math.max(1, pCount, prev));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            device_id: profile.device_id,
            handle: profile.handle,
            country_code: profile.country_code || 'US',
            online_at: new Date().toISOString(),
          });
        }
      });

    // Realtime Database Broadcasts: Group messages, direct messages, and direct threads
    const liveChannel = supabase
      .channel('community_live_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_group_messages' },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          // Newer members rule: only show messages created at or after the user joined
          const joinedAt = userJoinedAtRef.current;
          if (joinedAt && new Date(newMsg.created_at) < new Date(joinedAt)) return;

          setGroupMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(newMsg.id))) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_group_messages' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setGroupMessages((prev) => prev.filter((m) => String(m.id) !== String(deletedId)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_direct_messages' },
        (payload) => {
          const newDm = payload.new;
          if (!newDm) return;

          // If currently inside this active thread, append message
          setActiveDirectThread((currentActive) => {
            if (currentActive && currentActive.id === newDm.thread_id) {
              setDirectMessages((prev) => {
                if (prev.some((m) => String(m.id) === String(newDm.id))) return prev;
                return [...prev, newDm];
              });
              // Mark as read if received from other person
              if (newDm.sender_device_id !== profile.device_id) {
                supabase
                  .from('community_direct_messages')
                  .update({ is_read: true })
                  .eq('id', newDm.id)
                  .then(() => {});
              }
            }
            return currentActive;
          });

          // Update thread list preview in real time
          setDirectThreads((prev) =>
            prev.map((t) =>
              t.id === newDm.thread_id ? { ...t, last_message_at: newDm.created_at } : t
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_direct_messages' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setDirectMessages((prev) => prev.filter((m) => String(m.id) !== String(deletedId)));
          } else {
            if (activeThreadRef.current) {
              loadDirectMessages(activeThreadRef.current.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_direct_threads' },
        () => {
          loadDirectThreads();
        }
      )
      .subscribe();

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(liveChannel);
    };
  }, [profile?.device_id]);

  // Load Group Messages (filtered so newer members only see from their join timestamp onwards)
  const loadGroupMessages = async (joinedAt) => {
    try {
      const filterTime = joinedAt || userJoinedAtRef.current || new Date().toISOString();
      const { data, error } = await supabase
        .from('community_group_messages')
        .select('*')
        .gte('created_at', filterTime)
        .order('created_at', { ascending: false })
        .limit(80);

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
        .select(
          '*, requester:community_profiles!requester_device_id(handle, star_level, avatar_id, country_code), recipient:community_profiles!recipient_device_id(handle, star_level, avatar_id, country_code)'
        )
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
        setGroupMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(data.id))) return prev;
          return [data, ...prev];
        });
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

      const { data, error } = await supabase
        .from('community_direct_threads')
        .insert([
          {
            requester_device_id: profile.device_id,
            recipient_device_id: targetUser.device_id,
            status: 'pending',
          },
        ])
        .select(
          '*, requester:community_profiles!requester_device_id(handle, star_level, avatar_id, country_code), recipient:community_profiles!recipient_device_id(handle, star_level, avatar_id, country_code)'
        )
        .single();

      if (error) throw error;

      if (data) {
        setDirectThreads((prev) => [data, ...prev]);
        setActiveTab('direct');
        openDirectThread(data);
        Alert.alert(
          'Request Sent',
          `Message request sent to ${targetUser.handle}. They can accept to begin chatting.`
        );
      }
    } catch (err) {
      Alert.alert('Notice', 'Unable to initiate request: ' + (err.message || 'Unknown'));
    }
  };

  // Respond to Direct Message Request
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
      Alert.alert(
        'Report Received',
        'Thank you. The admin team has received your report and will take action if guidelines were violated.'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  // Complete Onboarding Gatekeeper
  const handleCompleteGatekeeper = async () => {
    if (parseInt(userMathInput.trim(), 10) !== mathQuestion.answer) {
      setMathError('Incorrect answer. Please solve the simple math problem.');
      generateMathProblem();
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      await AsyncStorage.setItem(ONBOARDED_KEY, nowIso);
      setShowGatekeeper(false);

      const prof = await getOrCreateCommunityProfile(deviceId);
      const updatedProf = await updateCommunityProfile(deviceId, {
        avatar_id: selectedAvatarId,
        last_active_at: nowIso,
      });

      const finalProf = updatedProf || { ...prof, avatar_id: selectedAvatarId };
      setProfile(finalProf);
      setUserJoinedAt(finalProf.created_at || nowIso);
      userJoinedAtRef.current = finalProf.created_at || nowIso;
      loadGroupMessages(finalProf.created_at || nowIso);
      loadDirectThreads();
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

  // ── BANNED SCREEN ──
  if (isBanned) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 },
        ]}
      >
        <Ban size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textWhite, textAlign: 'center' }}>
          Access Suspended
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          Your access to the community has been temporarily restricted for violating wholesome community rules.
        </Text>
        {banInfo?.reason && (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              padding: 12,
              borderRadius: 8,
              marginTop: 16,
              width: '100%',
            }}
          >
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
          Connecting to Community...
        </Text>
      </View>
    );
  }

  // Inner Chat Content
  const renderChatContent = () => (
    <>
      {/* ── VIEW 1: GROUP LOUNGE ── */}
      {!activeDirectThread && activeTab === 'lounge' && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={groupListRef}
            data={groupMessages}
            keyExtractor={(item) => String(item.id)}
            inverted
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 14 }}
            ListEmptyComponent={
              <View style={styles.emptyLoungeContainer}>
                <Users size={36} color={colors.purpleAccent} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyLoungeTitle}>Welcome to Community Lounge</Text>
                <Text style={styles.emptyLoungeSub}>
                  You joined successfully. New messages from members worldwide will appear here in real time.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_device_id === deviceId;
              const avatar = getAvatarInfo(item.sender_avatar_id, item.sender_handle || item.sender_device_id);
              return (
                <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
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
                    {!isMe && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Text style={[styles.senderHandle, { color: avatar.text || avatar.bg }]}>
                          {item.sender_handle}
                        </Text>
                        {renderStarBadges(item.sender_star_level)}
                        {item.sender_country_code ? (
                          <Text style={styles.countryFlagText}>
                            {getCountryFlag(item.sender_country_code)}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                      {item.message}
                    </Text>

                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {formatMessageTime(item.created_at)}
                      </Text>
                      {isMe && (
                        <View style={{ marginLeft: 3, marginBottom: 1 }}>
                          <CheckCheck size={13} color="rgba(255,255,255,0.7)" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Validation Warning */}
          {validationWarning ? (
            <View style={styles.warningBox}>
              <AlertCircle size={14} color="#EF4444" />
              <Text style={styles.warningText}>{validationWarning}</Text>
            </View>
          ) : null}

          {/* Input Bar */}
          <View style={[styles.inputBar, { paddingBottom: currentBottomPadding }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Send an encouraging thought..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (validationWarning) setValidationWarning('');
              }}
              onFocus={() => {
                setTimeout(() => {
                  groupListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }, 100);
              }}
              multiline
              maxLength={280}
            />
            <TouchableOpacity
              onPress={handleSendGroupMessage}
              disabled={!inputText.trim() || sending}
              style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.5 }]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── VIEW 2: DIRECT MESSAGE THREADS LIST ── */}
      {!activeDirectThread && activeTab === 'direct' && (
        <View style={{ flex: 1, paddingBottom: restingBottom }}>
          {directThreads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color={colors.purpleAccent} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Private Conversations Yet</Text>
              <Text style={styles.emptySub}>
                Tap any member avatar in the Group Lounge to send them a private message request.
              </Text>
            </View>
          ) : (
            <FlatList
              data={directThreads}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isRequester = item.requester_device_id === deviceId;
                const otherUser = isRequester ? item.recipient : item.requester;
                const otherHandle = otherUser?.handle || 'User';
                const avatar = getAvatarInfo(otherUser?.avatar_id, otherHandle || otherUser?.device_id);
                const isPendingForMe = item.status === 'pending' && item.recipient_device_id === deviceId;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (item.status === 'accepted') {
                        openDirectThread(item);
                      }
                    }}
                    style={styles.threadCard}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: avatar.bg }]}>
                      <Text style={styles.avatarInitial}>{avatar.initial}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textWhite }}>
                            {otherHandle}
                          </Text>
                          {renderStarBadges(otherUser?.star_level || 1)}
                          {otherUser?.country_code ? (
                            <Text style={styles.countryFlagText}>
                              {getCountryFlag(otherUser.country_code)}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {formatMessageTime(item.last_message_at)}
                        </Text>
                      </View>

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
          {/* WhatsApp-style Private & Encrypted Lock Notice */}
          <View style={styles.privateNoticeCard}>
            <Lock size={13} color="#F59E0B" style={{ marginTop: 1 }} />
            <Text style={styles.privateNoticeText}>
              Direct 1-on-1 private conversation. Text messages are private between both members and moderated under community safety guidelines.
            </Text>
          </View>

          {activeDirectThread.status === 'pending' ? (
            <View style={{ backgroundColor: 'rgba(245,158,11,0.12)', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 10 }}>
              <Text style={{ color: '#F59E0B', fontSize: 12, textAlign: 'center', fontWeight: '600' }}>
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
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 14 }}
            onContentSizeChange={() => directListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => directListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMe = item.sender_device_id === deviceId;
              return (
                <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                      {item.message}
                    </Text>
                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {formatMessageTime(item.created_at)}
                      </Text>
                      {isMe && (
                        <View style={{ marginLeft: 3, marginBottom: 1 }}>
                          {item.is_read ? (
                            <CheckCheck size={13} color="#38BDF8" />
                          ) : (
                            <CheckCheck size={13} color="rgba(255,255,255,0.7)" />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {activeDirectThread.status === 'accepted' ? (
            <View style={[styles.inputBar, { paddingBottom: currentBottomPadding }]}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a private message..."
                placeholderTextColor={colors.textMuted}
                value={directInputText}
                onChangeText={setDirectInputText}
                onFocus={() => {
                  setTimeout(() => {
                    directListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
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
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── CONSTANT TOP NAV HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              if (activeDirectThread) {
                setActiveDirectThread(null);
              } else {
                navigation.goBack();
              }
            }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={colors.textWhite} />
          </TouchableOpacity>

          {!activeDirectThread ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerLogo}>
                <Image
                  source={require('../../assets/logo-circle.png')}
                  style={styles.headerLogoImg}
                  resizeMode="cover"
                />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.headerTitle}>Community</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <View style={[styles.statusDot, { backgroundColor: '#10B981', width: 6, height: 6 }]} />
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }}>
                    {profile?.country_code ? `${getCountryFlag(profile.country_code)} ` : ''}
                    {onlineCount} Online
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ marginLeft: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerTitle}>
                  {activeDirectThread.requester_device_id === deviceId
                    ? activeDirectThread.recipient?.handle || 'User'
                    : activeDirectThread.requester?.handle || 'User'}
                </Text>
                <Text style={styles.countryFlagText}>
                  {getCountryFlag(
                    activeDirectThread.requester_device_id === deviceId
                      ? activeDirectThread.recipient?.country_code
                      : activeDirectThread.requester?.country_code
                  )}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: '#10B981', width: 6, height: 6 }]} />
              </View>
              {chatPartnerNowPlaying ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <Music size={11} color="#10B981" />
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700' }} numberOfLines={1}>
                    Listening to: {chatPartnerNowPlaying}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>Direct Chat</Text>
              )}
            </View>
          )}
        </View>

        {/* Top Right Constant Action Icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Community Profile & Settings Button */}
          <TouchableOpacity
            style={[styles.headerProfileBtn, { marginRight: 10 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={openSettingsModal}
            accessibilityLabel="Community Profile and Settings"
          >
            {profile ? (
              <View
                style={[
                  styles.headerAvatarCircle,
                  { backgroundColor: getAvatarInfo(profile.avatar_id, profile.handle).bg },
                ]}
              >
                <Text style={styles.headerAvatarInitial}>
                  {getAvatarInfo(profile.avatar_id, profile.handle).initial}
                </Text>
                <View style={styles.headerAvatarCogBadge}>
                  <Settings size={9} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.headerIconBtn}>
                <Settings color={colors.textWhite} size={19} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { marginRight: 10 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell color={colors.textWhite} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => navigation.navigate('Search')}
          >
            <Search color={colors.textWhite} size={20} />
          </TouchableOpacity>
        </View>
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

      {/* ── CONTENT CONTAINER WITH DUAL KEYBOARD AVOIDANCE ── */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={insets.top}
          onLayout={handleContainerLayout}
        >
          {renderChatContent()}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
          {renderChatContent()}
        </View>
      )}

      {/* ── MODAL: User Action Sheet ── */}
      {selectedUserModal && (
        <Modal
          transparent
          animationType="fade"
          visible={Boolean(selectedUserModal)}
          onRequestClose={() => setSelectedUserModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.actionSheetCard, { backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF' }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={[
                    styles.avatarCircleLarge,
                    { backgroundColor: getAvatarInfo(selectedUserModal.avatar_id, selectedUserModal.handle).bg },
                  ]}
                >
                  <Text style={styles.avatarInitialLarge}>
                    {getAvatarInfo(selectedUserModal.avatar_id, selectedUserModal.handle).initial}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textWhite, marginTop: 8 }}>
                  {selectedUserModal.handle}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {renderStarBadges(selectedUserModal.star_level)}
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>·</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    {getCountryFlag(selectedUserModal.country_code)} {selectedUserModal.country_code || 'Global'}
                  </Text>
                </View>
              </View>

              {/* Live Now Playing status if user is listening to music */}
              {selectedUserNowPlaying ? (
                <View style={styles.nowPlayingCardModal}>
                  <View style={styles.nowPlayingPulseIcon}>
                    <Music size={15} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nowPlayingCardLabel}>CURRENTLY LISTENING TO</Text>
                    <Text style={styles.nowPlayingCardTitle} numberOfLines={2}>
                      {selectedUserNowPlaying}
                    </Text>
                  </View>
                </View>
              ) : null}

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
        <Modal
          transparent
          animationType="fade"
          visible={showReportModal}
          onRequestClose={() => setShowReportModal(false)}
        >
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
                  <Text
                    style={{
                      fontSize: 13,
                      color: reportReason === reason ? colors.purpleAccent : colors.textWhite,
                    }}
                  >
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

      {/* ── MODAL: Community Profile & Settings ── */}
      {showSettingsModal && (
        <Modal
          transparent
          animationType="slide"
          visible={showSettingsModal}
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.settingsModalCard, { maxHeight: '88%' }]}>
              {/* Header */}
              <View style={styles.settingsModalHeader}>
                <View>
                  <Text style={styles.settingsModalTitle}>Community Settings</Text>
                  <Text style={styles.settingsModalSubtitle}>
                    Customize your persona, avatar motif, and sharing
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSettingsModal(false)}
                  style={styles.settingsCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={colors.textWhite} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              >
                {/* 1. Current Profile Preview Card */}
                <View style={styles.settingsProfileCard}>
                  <View
                    style={[
                      styles.avatarCircleLarge,
                      { backgroundColor: getAvatarInfo(settingsAvatarId, settingsHandle).bg },
                    ]}
                  >
                    <Text style={styles.avatarInitialLarge}>
                      {getAvatarInfo(settingsAvatarId, settingsHandle).initial}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textWhite }}>
                        {settingsHandle}
                      </Text>
                      {renderStarBadges(profile?.star_level || 1)}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {profile?.country_name || 'Global'} {getCountryFlag(profile?.country_code)}
                    </Text>
                    {currentSong && isPlaying && settingsShareMusic ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Music size={11} color="#10B981" />
                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }} numberOfLines={1}>
                          Listening: {currentSong.title}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 2. Choose Avatar */}
                <Text style={styles.settingsSectionTitle}>Choose Your Avatar Motif</Text>
                <Text style={styles.settingsSectionSub}>
                  Select the color and musical motif that represents you across conversations.
                </Text>
                <View style={styles.avatarGrid}>
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = Number(settingsAvatarId) === Number(av.id);
                    return (
                      <TouchableOpacity
                        key={av.id}
                        onPress={() => setSettingsAvatarId(av.id)}
                        style={[
                          styles.avatarGridItem,
                          isSelected && styles.avatarGridItemSelected,
                        ]}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.avatarCircleSmall, { backgroundColor: av.bg }]}>
                          <Text style={styles.avatarInitialSmall}>{av.initial}</Text>
                        </View>
                        <Text
                          style={[
                            styles.avatarGridName,
                            isSelected && { color: colors.purpleAccent, fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {av.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Handle Identity */}
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.settingsSectionTitle}>Community Handle</Text>
                  <Text style={styles.settingsSectionSub}>
                    Handles are dignified anonymous identifiers to protect your personal identity.
                  </Text>
                  <View style={styles.handleRow}>
                    <View style={styles.handleBox}>
                      <Text style={styles.handleBoxText}>{settingsHandle}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSettingsHandle(generateUserHandle())}
                      style={styles.handleRegenBtn}
                      activeOpacity={0.75}
                    >
                      <RefreshCw size={14} color="#FFFFFF" />
                      <Text style={styles.handleRegenText}>New Handle</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Live Music Sharing Toggle */}
                <View style={styles.settingToggleCard}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <Music size={15} color={colors.purpleAccent} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textWhite }}>
                        Share Live Song Playback
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
                      When you are listening to Kingdom songs, other brothers and sisters can see what is currently playing when chatting or viewing your profile.
                    </Text>
                  </View>
                  <Switch
                    value={settingsShareMusic}
                    onValueChange={setSettingsShareMusic}
                    trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#8B5CF6' }}
                    thumbColor={settingsShareMusic ? '#FFFFFF' : '#94A3B8'}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveSettings}
                  disabled={isSavingSettings}
                  style={[styles.actionBtnPrimary, { marginTop: 22 }]}
                  activeOpacity={0.8}
                >
                  {isSavingSettings ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Save Preferences</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ── MODAL: First-Time Onboarding Gatekeeper ── */}
      {showGatekeeper && (
        <Modal transparent animationType="slide" visible={showGatekeeper}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.gatekeeperCard, { backgroundColor: isDark ? '#181424' : '#FFFFFF' }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ShieldCheck size={36} color={colors.purpleAccent} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textWhite, marginTop: 8 }}>
                  Community Guidelines
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  A safe, upbuilding space for users worldwide
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
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.textMuted,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
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

              <TouchableOpacity onPress={handleCompleteGatekeeper} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Agree & Enter Lounge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Toast Notice */}
      {showToast && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={15} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </View>
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
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      backgroundColor: colors.bg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
    headerLogoImg: {
      width: '100%',
      height: '100%',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
    },
    statusDot: {
      borderRadius: 3,
    },
    headerCommunityBtnActive: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.purpleAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
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
      fontWeight: '700',
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#EF4444',
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 8,
      gap: 8,
    },
    messageRowMe: {
      justifyContent: 'flex-end',
    },
    avatarCircleSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitialSmall: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 11,
    },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 6,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 1.5,
      elevation: 1,
    },
    bubbleThem: {
      backgroundColor: isDark ? '#1F1B2E' : '#FFFFFF',
      borderBottomLeftRadius: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    bubbleMe: {
      backgroundColor: isDark ? '#6D28D9' : '#7C3AED',
      borderBottomRightRadius: 3,
    },
    senderHandle: {
      fontSize: 12,
      fontWeight: '700',
    },
    countryFlagText: {
      fontSize: 13,
      marginLeft: 2,
    },
    messageText: {
      fontSize: 14,
      color: colors.textWhite,
      lineHeight: 20,
    },
    messageTextMe: {
      color: '#FFFFFF',
    },
    bubbleFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      alignSelf: 'flex-end',
      marginTop: 2,
    },
    messageTime: {
      fontSize: 10,
      color: colors.textMuted,
    },
    messageTimeMe: {
      color: 'rgba(255,255,255,0.75)',
    },
    privateNoticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.2)',
      gap: 8,
    },
    privateNoticeText: {
      flex: 1,
      fontSize: 11,
      color: isDark ? '#FDE68A' : '#B45309',
      lineHeight: 16,
      fontWeight: '500',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 8,
      gap: 8,
    },
    warningText: {
      color: '#EF4444',
      fontSize: 12,
      flex: 1,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      gap: 10,
    },
    textInput: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textWhite,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyLoungeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
      transform: [{ scaleY: -1 }],
    },
    emptyLoungeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptyLoungeSub: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingTop: 64,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 6,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    threadCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      padding: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    avatarCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 16,
    },
    reqBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reqBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    actionSheetCard: {
      width: '100%',
      borderRadius: 18,
      padding: 20,
    },
    avatarCircleLarge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitialLarge: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 22,
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.purple,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    actionBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    actionBtnTextSecondary: {
      color: colors.textWhite,
      fontSize: 14,
      fontWeight: '600',
    },
    reasonOption: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      marginBottom: 6,
    },
    reasonOptionSelected: {
      borderWidth: 1,
      borderColor: colors.purpleAccent,
      backgroundColor: 'rgba(167, 139, 250, 0.1)',
    },
    gatekeeperCard: {
      width: '100%',
      borderRadius: 20,
      padding: 22,
    },
    ruleItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    ruleText: {
      flex: 1,
      fontSize: 13,
      color: colors.textWhite,
      lineHeight: 18,
    },
    mathBox: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      padding: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    mathInput: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 8,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textWhite,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    avatarChoice: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarChoiceSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    primaryBtn: {
      backgroundColor: colors.purple,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    headerProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.divider,
    },
    headerAvatarInitial: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    headerAvatarCogBadge: {
      position: 'absolute',
      bottom: -3,
      right: -3,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
    nowPlayingCardModal: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
      width: '100%',
      gap: 10,
    },
    nowPlayingPulseIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nowPlayingCardLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: '#10B981',
      letterSpacing: 0.8,
    },
    nowPlayingCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textWhite,
      marginTop: 1,
    },
    settingsModalCard: {
      width: '92%',
      backgroundColor: isDark ? '#1A162B' : '#FFFFFF',
      borderRadius: 24,
      paddingVertical: 18,
      overflow: 'hidden',
    },
    settingsModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    settingsModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textWhite,
    },
    settingsModalSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    settingsCloseBtn: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    settingsProfileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      padding: 14,
      borderRadius: 16,
      marginTop: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    settingsSectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textWhite,
      marginTop: 6,
    },
    settingsSectionSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 10,
      lineHeight: 15,
    },
    avatarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    avatarGridItem: {
      width: '31%',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.divider,
    },
    avatarGridItemSelected: {
      borderColor: colors.purpleAccent,
      backgroundColor: 'rgba(167, 139, 250, 0.12)',
      borderWidth: 1.5,
    },
    avatarGridName: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '500',
    },
    handleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    handleBox: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    handleBoxText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textWhite,
      letterSpacing: 1,
    },
    handleRegenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.purple,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    handleRegenText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    settingToggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      padding: 14,
      borderRadius: 14,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    toastBox: {
      position: 'absolute',
      top: 60,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(16, 185, 129, 0.95)',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
      zIndex: 999,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
    },
    toastText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
  });
