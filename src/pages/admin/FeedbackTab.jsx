import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';

const s = {
  page: { padding: '32px', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 },
  title: { fontSize: '24px', fontWeight: '700', color: '#fff', margin: 0 },
  container: { display: 'flex', flex: 1, gap: '20px', minHeight: 0, overflow: 'hidden' },
  listPane: { width: '320px', background: '#17151f', border: '1px solid #2d293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatPane: { flex: 1, background: '#17151f', border: '1px solid #2d293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  listScroll: { flex: 1, overflowY: 'auto' },
  chatScroll: { flex: 1, overflowY: 'auto', padding: '20px' },
  inputArea: { padding: '16px', borderTop: '1px solid #2d293b', display: 'flex', gap: '12px', background: '#0d0c11' },
  input: { flex: 1, padding: '12px 16px', background: '#17151f', border: '1px solid #2d293b', borderRadius: '24px', color: '#fff', fontSize: '14px', outline: 'none' },
  sendBtn: { background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: '24px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  convoItem: (active) => ({ padding: '16px', borderBottom: '1px solid #2d293b', cursor: 'pointer', background: active ? '#2d293b' : 'transparent', display: 'flex', gap: '12px', alignItems: 'center' }),
  avatar: { width: '40px', height: '40px', borderRadius: '20px', background: 'linear-gradient(135deg, #A78BFA, #F472B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' },
  badge: { width: '10px', height: '10px', borderRadius: '5px', background: '#EF4444' },
  bubbleWrapper: { display: 'flex', marginBottom: '16px', width: '100%' },
  bubbleAdmin: { background: 'rgba(139,92,246,0.15)', color: '#fff', padding: '12px 16px', borderRadius: '20px', borderBottomRightRadius: '4px', maxWidth: '70%', marginLeft: 'auto' },
  bubbleUser: { background: '#8B5CF6', color: '#fff', padding: '12px 16px', borderRadius: '20px', borderBottomLeftRadius: '4px', maxWidth: '70%', marginRight: 'auto' },
  timestamp: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', textAlign: 'right' },
  emptyText: { color: '#6B7280', textAlign: 'center', margin: 'auto', padding: '40px' }
};

export default function FeedbackTab() {
  const [conversations, setConversations] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    const channel = supabase.channel('admin_feedback')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
        fetchConversations();
        if (selectedDevice && payload.new.device_id === selectedDevice) {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const map = {};
      data.forEach(msg => {
        const id = msg.device_id || 'anonymous';
        if (!map[id]) {
          map[id] = { device_id: id, messages: [], latest: msg.created_at };
        }
        map[id].messages.unshift(msg);
        if (!msg.is_admin_reply) {
          map[id].user_last = true;
        }
      });

      const list = Object.values(map).sort((a, b) => new Date(b.latest) - new Date(a.latest));
      setConversations(list);
      setLoading(false);
      
      if (selectedDevice) {
        const active = list.find(c => c.device_id === selectedDevice);
        if (active) setMessages(active.messages);
      }
    } catch(err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSelect = (convo) => {
    setSelectedDevice(convo.device_id);
    setMessages(convo.messages);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedDevice) return;
    
    const text = replyText.trim();
    setReplyText('');

    try {
      await supabase.from('feedback').insert([{
        device_id: selectedDevice === 'anonymous' ? null : selectedDevice,
        message: text,
        is_admin_reply: true,
      }]);
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>User Feedback & Chat</h1>
      </div>
      
      <div style={s.container}>
        <div style={s.listPane}>
          <div style={{ padding: '16px', borderBottom: '1px solid #2d293b', fontWeight: '600' }}>
            Conversations
          </div>
          <div style={s.listScroll}>
            {loading ? <div style={s.emptyText}>Loading...</div> : conversations.length === 0 ? <div style={s.emptyText}>No messages yet</div> : conversations.map(c => {
              const lastMsg = c.messages[c.messages.length - 1];
              const isActive = selectedDevice === c.device_id;
              const requiresAction = !lastMsg.is_admin_reply;
              return (
                <div key={c.device_id} style={s.convoItem(isActive)} onClick={() => handleSelect(c)}>
                  <div style={s.avatar}>{c.device_id.substring(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                      {c.device_id === 'anonymous' ? 'Anonymous User' : 'User ' + c.device_id.substring(c.device_id.length - 4)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lastMsg.message}
                    </div>
                  </div>
                  {requiresAction && <div style={s.badge} />}
                </div>
              );
            })}
          </div>
        </div>

        <div style={s.chatPane}>
          {selectedDevice ? (
            <>
              <div style={{ padding: '16px', borderBottom: '1px solid #2d293b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MessageSquare size={18} color="#A78BFA" />
                  Chatting with {selectedDevice === 'anonymous' ? 'Anonymous' : 'User ' + selectedDevice.substring(selectedDevice.length - 4)}
                </div>
                {messages.slice().reverse().find(m => m.device_meta)?.device_meta && (() => {
                  const meta = messages.slice().reverse().find(m => m.device_meta).device_meta;
                  return (
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '30px' }}>
                      Device: {meta.os === 'ios' ? 'iOS' : meta.os === 'android' ? 'Android' : meta.os} {meta.version && `(v${meta.version})`}
                    </div>
                  );
                })()}
              </div>
              <div style={s.chatScroll}>
                {messages.map((m, i) => (
                  <div key={m.id || i} style={s.bubbleWrapper}>
                    <div style={m.is_admin_reply ? s.bubbleAdmin : s.bubbleUser}>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{m.message}</div>
                      <div style={s.timestamp}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSend} style={s.inputArea}>
                <input 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  style={s.input}
                  disabled={selectedDevice === 'anonymous'}
                />
                <button type="submit" style={{ ...s.sendBtn, opacity: selectedDevice === 'anonymous' || !replyText.trim() ? 0.5 : 1 }} disabled={selectedDevice === 'anonymous' || !replyText.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={s.emptyText}>Select a conversation to start chatting</div>
          )}
        </div>
      </div>
    </div>
  );
}
