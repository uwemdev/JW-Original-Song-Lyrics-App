import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  FlatList,
  Animated,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../lib/supabase';

function Toast({ visible, message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
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

export default function FeedbackScreen({ navigation }) {
  const { colors, isDark, deviceId } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, isDark);
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!deviceId) return;

    fetchMessages();
    markAsRead();

    // Subscribe to realtime replies
    const channel = supabase
      .channel('feedback_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedback',
        filter: `device_id=eq.${deviceId}`,
      }, (payload) => {
        setMessages((prev) => {
          // Prevent duplicates if we already optimistically added it
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        markAsRead(); // Mark new as read if we are on the screen
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setMessages(data);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 200);
      }
    } catch (err) {
      console.log('Error fetching chat', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!deviceId) return;
    try {
      await supabase
        .from('feedback')
        .update({ is_read: true })
        .eq('device_id', deviceId)
        .eq('is_admin_reply', true)
        .eq('is_read', false);
    } catch(err){}
  };

  const handleSubmit = async () => {
    if (!message.trim() || submitting || !deviceId) return;
    setSubmitting(true);
    const msg = message.trim();
    setMessage('');
    
    // Optimistic UI update
    const optimisticMsg = {
      id: Date.now().toString(), // temp ID
      message: msg,
      is_admin_reply: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const { data, error } = await supabase.from('feedback').insert([{
        device_id: deviceId,
        message: msg,
        is_admin_reply: false,
        device_meta: { os: Platform.OS, version: Platform.Version }
      }]).select();

      if (error) throw error;
      
      // Replace optimistic message with real one
      if (data && data[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data[0] : m));
      }
    } catch (err) {
      setToastMsg('Failed to send. Try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      // Remove optimistic msg and restore text
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => {
    const isAdmin = item.is_admin_reply;
    
    // Format time: HH:MM
    const date = new Date(item.created_at);
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.bubbleWrapper, isAdmin ? styles.bubbleLeft : styles.bubbleRight]}>
        <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleUser]}>
          <Text style={styles.bubbleText}>{item.message}</Text>
          <Text style={styles.bubbleTime}>{timeString}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <ArrowLeft color={colors.textWhite} size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Contact & Feedback</Text>
          <Text style={styles.headerSubtitle}>We usually reply quickly</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      {/* Chat Area */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.purpleAccent} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.chatContent}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Have a suggestion, found a bug, or just want to say hi? Send us a message below!
              </Text>
            </View>
          }
        />
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) : Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!message.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={handleSubmit}
          disabled={!message.trim() || submitting}
        >
          <Send color="#FFF" size={20} />
        </TouchableOpacity>
      </View>

      <Toast visible={showToast} message={toastMsg} />
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    textAlign: 'center',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  bubbleLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleAdmin: {
    backgroundColor: 'rgba(139,92,246,0.15)', // Purple tint for admin
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.purple, // Solid purple for user
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    color: colors.textWhite,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(109,40,217,0.4)',
  },
  toast: {
    position: 'absolute',
    top: 100, // Show at top to avoid covering input
    alignSelf: 'center',
    backgroundColor: 'rgba(109,40,217,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
