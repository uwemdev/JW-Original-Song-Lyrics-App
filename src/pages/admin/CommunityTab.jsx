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
} from 'lucide-react';

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

      // 5. Member count
      const profilesCountRes = await supabase
        .from('community_profiles')
        .select('device_id', { count: 'exact', head: true });

      if (groupRes.error && groupRes.error.code !== '42P01') throw groupRes.error;
      if (reportsRes.error && reportsRes.error.code !== '42P01') throw reportsRes.error;
      if (bansRes.error && bansRes.error.code !== '42P01') throw bansRes.error;

      setGroupMessages(groupRes.data || []);
      setReports(reportsRes.data || []);
      setBans(bansRes.data || []);
      setDirectThreads(threadsRes.data || []);
      setProfilesCount(profilesCountRes.count || 0);
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
  }, [fetchCommunityData]);

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
        reason: 'Violating community fellowship guidelines (prohibited contact info or spam)',
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
            Inspect group lounge fellowship, review reported messages, supervise direct chats, and enforce IP/Device bans.
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
            <div className="stat-value">{loading ? '...' : profilesCount.toLocaleString()}</div>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
        {[
          { id: 'group', label: 'Group Lounge Stream', count: groupMessages.length },
          { id: 'reports', label: 'Reported Messages', count: reports.length, badgeColor: '#ef4444' },
          { id: 'direct', label: 'Direct Chats Supervision', count: directThreads.length },
          { id: 'bans', label: 'IP & Device Bans', count: bans.length },
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
              Live Fellowship Lounge Stream
            </h2>

            <div style={{ position: 'relative', width: '240px' }}>
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
                        <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                          {msg.sender_country_code || 'Unknown'}
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
                The fellowship community is running clean with zero flagged messages.
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
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--admin-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
                Direct 1-on-1 Message Threads ({directThreads.length})
              </h3>
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
                          <div style={{ fontSize: '12px', fontWeight: '600' }}>
                            <span>{th.requester?.handle || 'User A'}</span>
                            <span style={{ color: 'var(--admin-text-muted)', margin: '0 4px' }}>to</span>
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
                          <button
                            onClick={() => loadThreadMessages(th)}
                            className="btn-admin-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Inspect
                          </button>
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

                <button onClick={() => setSelectedThread(null)} className="btn-icon-admin">
                  <X size={16} />
                </button>
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

      {/* ── Modal: Ban User / IP ── */}
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
