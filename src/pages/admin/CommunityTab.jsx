import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  ShieldAlert,
  MessageSquare,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  Ban,
  Clock,
  Eye,
  Flag,
  Globe,
  Star,
  UserX,
  X,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

function getCountryFlag(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return '';
  const clean = countryCode.trim().toUpperCase();
  if (clean.length !== 2) return '';
  const offset = 127397;
  try {
    return String.fromCodePoint(clean.charCodeAt(0) + offset, clean.charCodeAt(1) + offset);
  } catch (_) {
    return '';
  }
}

export default function CommunityTab() {
  const [activeSubTab, setActiveSubTab] = useState('group'); // 'group', 'direct', 'reports', 'bans'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [groupMessages, setGroupMessages] = useState([]);
  const [directThreads, setDirectThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [profilesCount, setProfilesCount] = useState(0);
  const [profilesList, setProfilesList] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Ban Modal State
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState({
    deviceId: '',
    ipAddress: '',
    handle: '',
    durationDays: 7,
    reason: 'Sharing prohibited contact information or violating community guidelines',
  });

  // Manual Ban Modal
  const [manualDeviceId, setManualDeviceId] = useState('');
  const [manualIp, setManualIp] = useState('');

  const fetchCommunityData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setErrorMsg('');

    try {
      // 1. Group Messages
      const groupRes = await supabase
        .from('community_group_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // 2. Reports
      const reportsRes = await supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // 3. Bans
      const bansRes = await supabase
        .from('community_bans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // 4. Direct Threads
      const threadsRes = await supabase
        .from('community_direct_threads')
        .select('*, requester:community_profiles!requester_device_id(handle, star_level, country_code), recipient:community_profiles!recipient_device_id(handle, star_level, country_code)')
        .order('last_message_at', { ascending: false })
        .limit(50);

      // 5. Member count & member profiles
      const [profilesCountRes, profilesListRes, directMsgsRes] = await Promise.all([
        supabase.from('community_profiles').select('device_id', { count: 'exact', head: true }),
        supabase.from('community_profiles').select('*').order('last_active_at', { ascending: false }).limit(250),
        supabase.from('community_direct_messages').select('*').limit(2000),
      ]);

      if (groupRes.error && groupRes.error.code !== '42P01') throw groupRes.error;
      if (reportsRes.error && reportsRes.error.code !== '42P01') throw reportsRes.error;
      if (bansRes.error && bansRes.error.code !== '42P01') throw bansRes.error;

      setGroupMessages(groupRes.data || []);
      setReports(reportsRes.data || []);
      setBans(bansRes.data || []);
      setDirectThreads(threadsRes.data || []);
      setProfilesCount(profilesCountRes.count || 0);
      setProfilesList(profilesListRes.data || []);
      setDirectMessages(directMsgsRes.data || []);
    } catch (err) {
      console.error('Community load error:', err);
      if (err.message && err.message.includes('does not exist')) {
        setErrorMsg('Community tables have not been created in Supabase yet. Please run migration 13 in the Supabase SQL Editor.');
      } else {
        setErrorMsg('Failed to load community data: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityData();

    // Supabase Realtime channel for live community monitoring
    const adminChannel = supabase
      .channel('admin_community_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_group_messages' },
        (payload) => {
          setGroupMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_group_messages' },
        (payload) => {
          setGroupMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_reports' },
        (payload) => {
          setReports((prev) => {
            if (prev.some((r) => r.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_reports' },
        (payload) => {
          setReports((prev) =>
            prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_direct_messages' },
        (payload) => {
          const newDm = payload.new;
          if (!newDm) return;
          setThreadMessages((prev) => {
            if (selectedThread && selectedThread.id === newDm.thread_id) {
              if (prev.some((m) => m.id === newDm.id)) return prev;
              return [...prev, newDm];
            }
            return prev;
          });
          setDirectThreads((prev) =>
            prev.map((t) =>
              t.id === newDm.thread_id ? { ...t, last_message_at: newDm.created_at } : t
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_direct_threads' },
        () => {
          fetchCommunityData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_bans' },
        () => {
          fetchCommunityData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  }, [fetchCommunityData, selectedThread]);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4500);
    }
  };

  // Load Direct Messages for selected thread
  const loadThreadMessages = async (thread) => {
    setSelectedThread(thread);
    try {
      const { data, error } = await supabase
        .from('community_direct_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setThreadMessages(data || []);
    } catch (err) {
      showToast('Failed to load thread messages: ' + err.message, true);
    }
  };

  // Delete a group message
  const handleDeleteGroupMessage = async (msgId) => {
    if (!window.confirm('Delete this message from the group lounge?')) return;
    try {
      const { error } = await supabase
        .from('community_group_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
      showToast('Message deleted.');
      setGroupMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      showToast('Failed to delete message: ' + err.message, true);
    }
  };

  // Clear all group messages (Admin storage management)
  const handleClearAllGroupMessages = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL messages in the Community Group Lounge? This will permanently wipe group chat history to free database storage. This action cannot be undone.'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('community_group_messages')
        .delete()
        .neq('id', 0);

      if (error) throw error;
      setGroupMessages([]);
      showToast('All community group messages have been cleared successfully.');
    } catch (err) {
      showToast('Failed to clear group messages: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Clear all direct chats and threads (Admin storage management)
  const handleClearAllDirectChats = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL Direct Message threads and conversations? This will wipe all 1-on-1 chats and reset private message history to manage storage. This action cannot be undone.'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      // 1. Delete all direct messages
      const { error: msgErr } = await supabase
        .from('community_direct_messages')
        .delete()
        .neq('id', 0);
      if (msgErr) throw msgErr;

      // 2. Delete all threads
      const { error: thErr } = await supabase
        .from('community_direct_threads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (thErr) throw thErr;

      setDirectThreads([]);
      setSelectedThread(null);
      setThreadMessages([]);
      showToast('All direct conversations and threads cleared successfully.');
    } catch (err) {
      showToast('Failed to clear direct chats: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages inside a specific direct thread
  const handleClearThreadMessages = async (threadId) => {
    const confirmed = window.confirm(
      'Delete all messages in this conversation thread? This frees storage while keeping the thread connection intact.'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('community_direct_messages')
        .delete()
        .eq('thread_id', threadId);

      if (error) throw error;
      setThreadMessages([]);
      showToast('Thread messages cleared.');
    } catch (err) {
      showToast('Failed to clear thread messages: ' + err.message, true);
    }
  };

  // Delete an entire direct thread and its messages
  const handleDeleteThread = async (threadId) => {
    const confirmed = window.confirm(
      'Delete this entire direct conversation thread and all its messages?'
    );
    if (!confirmed) return;

    try {
      await supabase.from('community_direct_messages').delete().eq('thread_id', threadId);
      const { error } = await supabase.from('community_direct_threads').delete().eq('id', threadId);
      if (error) throw error;

      setDirectThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setThreadMessages([]);
      }
      showToast('Conversation thread removed.');
    } catch (err) {
      showToast('Failed to delete thread: ' + err.message, true);
    }
  };

  // Open Ban modal for a user
  const openBanModalForUser = async (deviceId, handle = '') => {
    try {
      // Lookup profile to get known IP address
      const { data } = await supabase
        .from('community_profiles')
        .select('handle, ip_address')
        .eq('device_id', deviceId)
        .maybeSingle();

      setBanTarget({
        deviceId,
        ipAddress: data?.ip_address || '',
        handle: handle || data?.handle || 'Unknown',
        durationDays: 7,
        reason: 'Violating community guidelines (prohibited contact info or spam)',
      });
      setShowBanModal(true);
    } catch (_) {
      setBanTarget({
        deviceId,
        ipAddress: '',
        handle: handle || 'User',
        durationDays: 7,
        reason: 'Violating community guidelines',
      });
      setShowBanModal(true);
    }
  };

  // Execute Ban
  const handleExecuteBan = async (e) => {
    e.preventDefault();
    try {
      const duration = Number(banTarget.durationDays);
      let bannedUntil = null;
      if (duration > 0) {
        bannedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
      }

      // 1. Record in community_bans
      const { error: banError } = await supabase.from('community_bans').insert([
        {
          device_id: banTarget.deviceId || null,
          ip_address: banTarget.ipAddress || null,
          banned_until: bannedUntil,
          reason: banTarget.reason.trim(),
          banned_by: 'admin',
        },
      ]);
      if (banError) throw banError;

      // 2. Update profile if device_id exists
      if (banTarget.deviceId) {
        await supabase
          .from('community_profiles')
          .update({
            is_banned: true,
            banned_until: bannedUntil,
            ban_reason: banTarget.reason.trim(),
          })
          .eq('device_id', banTarget.deviceId);
      }

      showToast(`User ${banTarget.handle} banned ${duration === 0 ? 'permanently' : 'for ' + duration + ' days'}.`);
      setShowBanModal(false);
      fetchCommunityData(true);
    } catch (err) {
      showToast('Failed to apply ban: ' + err.message, true);
    }
  };

  // Unban
  const handleUnban = async (banItem) => {
    if (!window.confirm('Remove this ban and restore user access?')) return;
    try {
      // Delete ban record
      await supabase.from('community_bans').delete().eq('id', banItem.id);

      // Unban profile if device_id matches
      if (banItem.device_id) {
        await supabase
          .from('community_profiles')
          .update({
            is_banned: false,
            banned_until: null,
            ban_reason: null,
          })
          .eq('device_id', banItem.device_id);
      }

      showToast('Ban revoked successfully.');
      fetchCommunityData(true);
    } catch (err) {
      showToast('Failed to unban: ' + err.message, true);
    }
  };

  // Dismiss report
  const handleDismissReport = async (reportId) => {
    try {
      await supabase
        .from('community_reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      showToast('Report dismissed.');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      showToast('Failed to dismiss: ' + err.message, true);
    }
  };

  // Star badge formatter
  const renderStars = (level) => {
    const count = Math.max(1, Math.min(5, level || 1));
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} size={11} fill="#f59e0b" color="#f59e0b" />
        ))}
      </span>
    );
  };

  // Filter group messages by search
  const filteredGroupMessages = useMemo(() => {
    if (!searchQuery.trim()) return groupMessages;
    const q = searchQuery.trim().toLowerCase();
    return groupMessages.filter(
      (m) =>
        m.sender_handle.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        (m.sender_country_code || '').toLowerCase().includes(q)
    );
  }, [groupMessages, searchQuery]);

  // ── Community Analytics Computations ──
  const communityAnalytics = useMemo(() => {
    const totalMembers = profilesCount || profilesList.length;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let activeMembers7d = 0;
    const countryCounts = {};
    const memberMessagesCount = {};

    profilesList.forEach((p) => {
      if (p.last_active_at && new Date(p.last_active_at).getTime() >= sevenDaysAgo) {
        activeMembers7d += 1;
      }
      const c = p.country_name || (p.country_code ? p.country_code.toUpperCase() : 'Global');
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });

    groupMessages.forEach((m) => {
      if (m.sender_device_id) {
        memberMessagesCount[m.sender_device_id] = (memberMessagesCount[m.sender_device_id] || 0) + 1;
      }
    });

    directMessages.forEach((dm) => {
      if (dm.sender_device_id) {
        memberMessagesCount[dm.sender_device_id] = (memberMessagesCount[dm.sender_device_id] || 0) + 1;
      }
    });

    const activeChattersCount = Object.keys(memberMessagesCount).length;
    const participationRate = totalMembers > 0 ? ((activeChattersCount / totalMembers) * 100).toFixed(0) : '0';
    const totalMessages = groupMessages.length + directMessages.length;
    const avgMessagesPerChatter = activeChattersCount > 0 ? (totalMessages / activeChattersCount).toFixed(1) : '0';

    const totalThreads = directThreads.length;
    const acceptedThreads = directThreads.filter((t) => t.status === 'accepted').length;
    const pendingThreads = directThreads.filter((t) => t.status === 'pending').length;
    const threadAcceptanceRate = totalThreads > 0 ? ((acceptedThreads / totalThreads) * 100).toFixed(0) : '0';

    const pendingReports = reports.filter((r) => r.status === 'pending').length;
    const resolvedReports = reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed').length;
    const safetyScore = totalMessages > 0 ? Math.max(0, 100 - ((reports.length / totalMessages) * 100)).toFixed(1) : '100.0';

    const contributors = profilesList
      .map((p) => {
        const msgCount = memberMessagesCount[p.device_id] || 0;
        return {
          ...p,
          messageCount: msgCount,
        };
      })
      .sort((a, b) => b.messageCount - a.messageCount || new Date(b.last_active_at) - new Date(a.last_active_at))
      .slice(0, 10);

    const countryList = Object.entries(countryCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMembers,
      activeMembers7d,
      activeChattersCount,
      participationRate,
      totalMessages,
      avgMessagesPerChatter,
      totalThreads,
      acceptedThreads,
      pendingThreads,
      threadAcceptanceRate,
      pendingReports,
      resolvedReports,
      safetyScore,
      contributors,
      countryList,
    };
  }, [profilesCount, profilesList, groupMessages, directMessages, directThreads, reports]);

  return (
    <div className="admin-page">
      {/* ── Page Header ── */}
      <div className="admin-page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1>Community Supervision & Moderation</h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontWeight: '600',
              }}
            >
              Live Moderation
            </span>
          </div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Inspect group lounge community, review reported messages, supervise direct chats, and enforce IP/Device bans.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setBanTarget({
                deviceId: '',
                ipAddress: '',
                handle: 'Manual Entry',
                durationDays: 7,
                reason: 'Community guideline violation',
              });
              setShowBanModal(true);
            }}
            className="btn-admin-danger"
            style={{ padding: '7px 12px' }}
          >
            <Ban size={14} />
            <span>Block IP or Device</span>
          </button>

          <button
            onClick={() => fetchCommunityData(true)}
            className="btn-admin-secondary"
            disabled={refreshing}
            style={{ padding: '7px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          className="admin-alert danger"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--admin-danger-bg)',
            border: '1px solid var(--admin-danger-border)',
            color: 'var(--admin-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="admin-alert success"
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--admin-success-bg)',
            border: '1px solid var(--admin-success-border)',
            color: 'var(--admin-success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Metric Summary Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Users size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : (profilesCount || 0).toLocaleString()}</div>
            <div className="stat-label">Community Profiles</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <MessageSquare size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : groupMessages.length}</div>
            <div className="stat-label">Recent Group Chats</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Users size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : directThreads.length}</div>
            <div className="stat-label">Direct Threads</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div
            className="stat-icon"
            style={{
              background: reports.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(113, 113, 122, 0.12)',
              color: reports.length > 0 ? '#ef4444' : '#71717a',
            }}
          >
            <Flag size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: reports.length > 0 ? '#ef4444' : undefined }}>
              {loading ? '...' : reports.length}
            </div>
            <div className="stat-label">Pending User Reports</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Ban size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '...' : bans.length}</div>
            <div className="stat-label">Active IP / Device Bans</div>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'group', label: 'Group Lounge Stream', count: groupMessages.length },
          { id: 'reports', label: 'Reported Messages', count: reports.length, badgeColor: '#ef4444' },
          { id: 'direct', label: 'Direct Chats Supervision', count: directThreads.length },
          { id: 'bans', label: 'IP & Device Bans', count: bans.length },
          { id: 'analytics', label: 'Community Analytics', count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
              setSelectedThread(null);
            }}
            style={{
              border: 'none',
              background: activeSubTab === tab.id ? 'var(--admin-primary)' : 'var(--admin-surface-2)',
              color: activeSubTab === tab.id ? '#ffffff' : 'var(--admin-text-muted)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: activeSubTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: tab.badgeColor || (activeSubTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'),
                  color: '#fff',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Group Lounge Stream ── */}
      {activeSubTab === 'group' && (
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
              Live Community Lounge Stream
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--admin-text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter by handle or text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-input"
                  style={{
                    paddingLeft: '32px',
                    fontSize: '12px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    width: '100%',
                  }}
                />
              </div>

              {groupMessages.length > 0 && (
                <button
                  onClick={handleClearAllGroupMessages}
                  className="btn-admin-danger"
                  style={{ padding: '6px 12px', fontSize: '12px', gap: '5px' }}
                  title="Wipe group chat history to free database storage"
                >
                  <Trash2 size={13} />
                  <span>Clear All Group Messages</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading group chat stream...
            </div>
          ) : filteredGroupMessages.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <MessageSquare size={32} color="var(--admin-text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: '600' }}>No messages found in the stream</div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>User</th>
                    <th>Message Text</th>
                    <th style={{ width: '130px' }}>Country</th>
                    <th style={{ width: '120px' }}>Time</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupMessages.map((msg) => (
                    <tr key={msg.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--admin-text)' }}>
                            {msg.sender_handle}
                          </span>
                          {renderStars(msg.sender_star_level)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--admin-text)', wordBreak: 'break-word' }}>
                          {msg.message}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span>{getCountryFlag(msg.sender_country_code)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                            {msg.sender_country_code || 'Global'}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => openBanModalForUser(msg.sender_device_id, msg.sender_handle)}
                            className="btn-admin-danger"
                            style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                            title="Ban User"
                          >
                            <Ban size={11} />
                            <span>Ban</span>
                          </button>
                          <button
                            onClick={() => handleDeleteGroupMessage(msg.id)}
                            className="btn-icon-admin"
                            style={{ padding: '4px' }}
                            title="Delete message"
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: User Reports Center ── */}
      {activeSubTab === 'reports' && (
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--admin-text)' }}>
              Reported Messages & Content ({reports.length})
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Messages flagged by mobile users for sharing private contact information, spam, or inappropriate speech.
            </p>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <CheckCircle2 size={32} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: '600' }}>No pending reports</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                The community is running clean with zero flagged messages.
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Reported User</th>
                    <th>Reported Text Snippet</th>
                    <th style={{ width: '160px' }}>Reason Given</th>
                    <th style={{ width: '110px' }}>Chat Type</th>
                    <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id}>
                      <td>
                        <span style={{ fontWeight: '700', color: '#ef4444', fontSize: '13px' }}>
                          {rep.reported_handle}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', background: 'var(--admin-surface-2)', padding: '6px 10px', borderRadius: '6px' }}>
                          {rep.message_text}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '500' }}>
                          {rep.reason}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--admin-surface-2)',
                            textTransform: 'uppercase',
                            fontWeight: '700',
                          }}
                        >
                          {rep.chat_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => openBanModalForUser(rep.reported_device_id, rep.reported_handle)}
                            className="btn-admin-danger"
                            style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                          >
                            <Ban size={11} />
                            <span>Ban User</span>
                          </button>
                          <button
                            onClick={() => handleDismissReport(rep.id)}
                            className="btn-admin-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Direct Chats Supervision ── */}
      {activeSubTab === 'direct' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedThread ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {/* Thread List */}
          <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
                Direct 1-on-1 Message Threads ({directThreads.length})
              </h3>
              {directThreads.length > 0 && (
                <button
                  onClick={handleClearAllDirectChats}
                  className="btn-admin-danger"
                  style={{ padding: '5px 10px', fontSize: '11px', gap: '4px' }}
                  title="Wipe all direct messages and threads to manage database storage"
                >
                  <Trash2 size={12} />
                  <span>Clear All Direct Chats</span>
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                Loading direct threads...
              </div>
            ) : directThreads.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                No direct message threads initiated yet.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Participants</th>
                      <th style={{ width: '90px' }}>Status</th>
                      <th style={{ width: '100px' }}>Last Active</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directThreads.map((th) => (
                      <tr key={th.id} style={{ background: selectedThread?.id === th.id ? 'rgba(139, 92, 246, 0.08)' : undefined }}>
                        <td>
                          <div style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{getCountryFlag(th.requester?.country_code)}</span>
                            <span>{th.requester?.handle || 'User A'}</span>
                            <span style={{ color: 'var(--admin-text-muted)', margin: '0 4px' }}>to</span>
                            <span>{getCountryFlag(th.recipient?.country_code)}</span>
                            <span>{th.recipient?.handle || 'User B'}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              fontWeight: '700',
                              background:
                                th.status === 'accepted'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : th.status === 'pending'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                th.status === 'accepted'
                                  ? '#4ade80'
                                  : th.status === 'pending'
                                  ? '#fbbf24'
                                  : '#f87171',
                            }}
                          >
                            {th.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                            {new Date(th.last_message_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <button
                              onClick={() => loadThreadMessages(th)}
                              className="btn-admin-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleDeleteThread(th.id)}
                              className="btn-icon-admin"
                              style={{ padding: '4px' }}
                              title="Delete conversation thread"
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inspected Thread Messages */}
          {selectedThread && (
            <div className="admin-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '520px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>
                    Conversation: {selectedThread.requester?.handle} & {selectedThread.recipient?.handle}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    Thread ID: {selectedThread.id.substring(0, 8)}...
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {threadMessages.length > 0 && (
                    <button
                      onClick={() => handleClearThreadMessages(selectedThread.id)}
                      className="btn-admin-danger"
                      style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                      title="Clear messages in this conversation to free storage"
                    >
                      <Trash2 size={12} />
                      <span>Clear Messages</span>
                    </button>
                  )}
                  <button onClick={() => setSelectedThread(null)} className="btn-icon-admin" title="Close inspector">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {threadMessages.length === 0 ? (
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '12px', textAlign: 'center', margin: 'auto' }}>
                    No messages sent in this thread yet.
                  </div>
                ) : (
                  threadMessages.map((m) => {
                    const isRequester = m.sender_device_id === selectedThread.requester_device_id;
                    const senderHandle = isRequester ? selectedThread.requester?.handle : selectedThread.recipient?.handle;
                    return (
                      <div
                        key={m.id}
                        style={{
                          background: 'var(--admin-surface-2)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--admin-border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: isRequester ? '#8b5cf6' : '#ec4899' }}>
                            {senderHandle}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Active IP & Device Bans ── */}
      {activeSubTab === 'bans' && (
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
                Active IP & Device Bans ({bans.length})
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                Banned users are blocked across both Device ID and IP address, persisting through app reinstalls.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
              Loading bans...
            </div>
          ) : bans.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <CheckCircle2 size={32} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: '600' }}>No active bans</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                All devices and IP addresses currently have good standing.
              </div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Target Device ID</th>
                    <th>Target IP Address</th>
                    <th>Ban Reason</th>
                    <th style={{ width: '140px' }}>Banned Until</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bans.map((b) => {
                    const isPermanent = !b.banned_until;
                    const isExpired = b.banned_until && new Date(b.banned_until) < new Date();
                    return (
                      <tr key={b.id} style={{ opacity: isExpired ? 0.5 : 1 }}>
                        <td>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                            {b.device_id ? b.device_id.substring(0, 16) + '...' : 'Any (IP Block)'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#f87171' }}>
                            {b.ip_address || 'None specified'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                            {b.reason || 'Guidelines violation'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: isPermanent ? '#ef4444' : isExpired ? '#71717a' : '#f59e0b',
                            }}
                          >
                            {isPermanent ? 'Permanent' : isExpired ? 'Expired' : new Date(b.banned_until).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleUnban(b)}
                            className="btn-admin-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: Community Analytics & Activity Insights ── */}
      {activeSubTab === 'analytics' && (
        <div>
          {/* 6 Key Community Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {/* Total Members */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Users size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.totalMembers}</div>
                <div className="stat-label">Total Registered Profiles</div>
                <div className="analytics-kpi-subtext">
                  <span>{communityAnalytics.activeMembers7d} active in last 7d</span>
                </div>
              </div>
            </div>

            {/* Active Chatters */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                <MessageSquare size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.activeChattersCount}</div>
                <div className="stat-label">Active Chatters</div>
                <div className="analytics-kpi-subtext">
                  <span>{communityAnalytics.participationRate}% participation</span>
                </div>
              </div>
            </div>

            {/* Total Messages Exchanged */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <TrendingUp size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.totalMessages}</div>
                <div className="stat-label">Messages Exchanged</div>
                <div className="analytics-kpi-subtext">
                  <span>{groupMessages.length} lounge / {directMessages.length} direct</span>
                </div>
              </div>
            </div>

            {/* Avg Messages per Chatter */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Sparkles size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.avgMessagesPerChatter}</div>
                <div className="stat-label">Avg Msg / Chatter</div>
                <div className="analytics-kpi-subtext">
                  <span>Conversation density</span>
                </div>
              </div>
            </div>

            {/* Direct Threads */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                <Users size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.totalThreads}</div>
                <div className="stat-label">1-on-1 Direct Threads</div>
                <div className="analytics-kpi-subtext">
                  <span>{communityAnalytics.threadAcceptanceRate}% accepted</span>
                </div>
              </div>
            </div>

            {/* Community Safety Score */}
            <div className="admin-stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                <ShieldCheck size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-value">{communityAnalytics.safetyScore}%</div>
                <div className="stat-label">Community Safety Score</div>
                <div className="analytics-kpi-subtext">
                  <span>{reports.length} total reports</span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Contributors Leaderboard & Geographic Demographics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Top Contributors Leaderboard */}
            <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#fff' }}>
                    Top Community Contributors
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    Ranked by chat activity & lounge messages
                  </p>
                </div>
                <Sparkles size={16} color="#fbbf24" />
              </div>

              {communityAnalytics.contributors.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '12px' }}>
                  No active community contributors yet.
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Rank</th>
                        <th>Member</th>
                        <th>Country</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Messages</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Last Seen</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communityAnalytics.contributors.map((member, idx) => (
                        <tr key={member.device_id}>
                          <td>
                            <div className={`analytics-rank-badge rank-${idx + 1 <= 3 ? idx + 1 : 'default'}`}>
                              #{idx + 1}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>
                                {member.handle}
                              </span>
                              {renderStars(member.star_level)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                              ID: {(member.device_id || '').slice(0, 10)}...
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#e4e4e7' }}>
                            <span style={{ marginRight: '4px' }}>{getCountryFlag(member.country_code)}</span>
                            {member.country_name || member.country_code || 'Global'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: member.messageCount > 0 ? '#22c55e' : '#71717a',
                                background: member.messageCount > 0 ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                                padding: '2px 7px',
                                borderRadius: '6px',
                              }}
                            >
                              {member.messageCount}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                            {formatTimeAgo(member.last_active_at)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setBanTarget({
                                  deviceId: member.device_id,
                                  ipAddress: member.ip_address || '',
                                  handle: member.handle,
                                  durationDays: 7,
                                  reason: 'Community guidelines review',
                                });
                                setShowBanModal(true);
                              }}
                              className="btn-admin-danger"
                              style={{ padding: '3px 8px', fontSize: '10px' }}
                              title="Ban member"
                            >
                              <Ban size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Geographic Distribution */}
            <div className="admin-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#fff' }}>
                    Geographic & Country Demographics
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    Community profile distribution across nations
                  </p>
                </div>
                <Globe size={16} color="#8b5cf6" />
              </div>

              {communityAnalytics.countryList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '12px' }}>
                  No geographic data recorded yet.
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  {communityAnalytics.countryList.map((c) => (
                    <div key={c.name} className="analytics-bar-item">
                      <div className="analytics-bar-label" title={c.name}>
                        {c.name}
                      </div>
                      <div className="analytics-bar-track">
                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${Math.max(c.percent, 4)}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          }}
                        />
                      </div>
                      <div className="analytics-bar-val" style={{ color: '#93c5fd' }}>
                        {c.count} ({c.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showBanModal && (
        <div className="admin-modal-overlay" onClick={() => setShowBanModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban size={18} color="#ef4444" />
                <h3>Ban User from Community</h3>
              </div>
              <button onClick={() => setShowBanModal(false)} className="btn-icon-admin">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteBan} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="admin-label">Target Handle / Name</label>
                <input
                  type="text"
                  value={banTarget.handle}
                  disabled
                  className="admin-input"
                  style={{ opacity: 0.8 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="admin-label">Device ID</label>
                  <input
                    type="text"
                    value={banTarget.deviceId}
                    onChange={(e) => setBanTarget({ ...banTarget, deviceId: e.target.value })}
                    placeholder="dev_..."
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="admin-label">IP Address</label>
                  <input
                    type="text"
                    value={banTarget.ipAddress}
                    onChange={(e) => setBanTarget({ ...banTarget, ipAddress: e.target.value })}
                    placeholder="192.168..."
                    className="admin-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="admin-label">Ban Duration</label>
                <select
                  value={banTarget.durationDays}
                  onChange={(e) => setBanTarget({ ...banTarget, durationDays: Number(e.target.value) })}
                  className="admin-input"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={0}>Permanent Ban</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="admin-label">Ban Reason (Log Audit)</label>
                <textarea
                  rows={2}
                  value={banTarget.reason}
                  onChange={(e) => setBanTarget({ ...banTarget, reason: e.target.value })}
                  className="admin-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="btn-admin-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-admin-danger">
                  Confirm Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
