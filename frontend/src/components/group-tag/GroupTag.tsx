import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import AdminLayout from '../layout/AdminLayout';
import type { User, Channel } from '../../types';
import {
  Smartphone, Users, User as UserIcon, Send, Search, CheckSquare, Square,
  Sparkles, ShieldAlert, ArrowUpRight, Lock, Check, Loader2, RefreshCw, Tag, AlertCircle, Image, FileText, X
} from 'lucide-react';

interface GroupParticipant {
  id: string;
  admin: 'admin' | 'superadmin' | null;
  name?: string;
  phone?: string;
}

interface GroupMetadata {
  id: string;
  subject: string;
  participants: GroupParticipant[];
}

interface GroupListItem {
  id: string;
  name: string;
  participantsCount: number;
}

export default function GroupTag() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Group states
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  
  // Member states
  const [groupMetadata, setGroupMetadata] = useState<GroupMetadata | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // Array of JIDs
  
  // Message states
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | 'pdf'>('image');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Global loading
  const [loading, setLoading] = useState(true);

  // Load User and Channels
  useEffect(() => {
    const loadData = async () => {
      try {
        const u = await api.get<User>('/api/me');
        setUser(u);
        
        const chs = await api.get<Channel[]>('/api/channels');
        const activeChs = chs.filter(c => c.status === 'active');
        setChannels(activeChs);
        if (activeChs.length > 0) {
          setSelectedChannel(activeChs[0]);
        }
      } catch (err) {
        console.error('Gagal mengambil data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Check if user is premium
  const isPremium = !!(
    user?.subscription &&
    user.subscription.plan !== 'free' &&
    (!user.subscription.expires_at || new Date(user.subscription.expires_at) > new Date())
  );

  // Fetch groups when selected channel changes
  useEffect(() => {
    if (!selectedChannel) {
      setGroups([]);
      setSelectedGroupId('');
      setGroupMetadata(null);
      return;
    }

    const fetchGroups = async () => {
      setLoadingGroups(true);
      setGroups([]);
      setSelectedGroupId('');
      setGroupMetadata(null);
      try {
        const res = await api.get<{ groups: GroupListItem[] }>(`/api/whatsapp/${selectedChannel.id}/groups-realtime`);
        setGroups(res.groups || []);
      } catch (err: any) {
        console.error('Gagal mengambil daftar grup:', err);
      } finally {
        setLoadingGroups(false);
      }
    };

    if (isPremium) {
      fetchGroups();
    }
  }, [selectedChannel, isPremium]);

  // Fetch group members when selected group changes
  useEffect(() => {
    if (!selectedChannel || !selectedGroupId) {
      setGroupMetadata(null);
      setSelectedMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setLoadingMembers(true);
      setGroupMetadata(null);
      setSelectedMembers([]);
      try {
        const res = await api.get<{ metadata: GroupMetadata }>(`/api/whatsapp/${selectedChannel.id}/groups/${encodeURIComponent(selectedGroupId)}`);
        if (res.metadata) {
          setGroupMetadata(res.metadata);
          // Auto select all members initially
          const allJids = res.metadata.participants.map(p => p.id);
          setSelectedMembers(allJids);
        }
      } catch (err: any) {
        console.error('Gagal mengambil anggota grup:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [selectedGroupId, selectedChannel]);

  // Handle group search
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Handle member search
  const filteredMembers = groupMetadata
    ? groupMetadata.participants.filter(p => {
        const query = memberSearch.toLowerCase();
        const number = p.id.split('@')[0];
        const name = p.name || '';
        return number.includes(query) || name.toLowerCase().includes(query);
      })
    : [];

  // Toggle single member selection
  const toggleMember = (jid: string) => {
    setSelectedMembers(prev => 
      prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
    );
  };

  // Quick selections
  const selectAll = () => {
    if (!groupMetadata) return;
    setSelectedMembers(groupMetadata.participants.map(p => p.id));
  };

  const selectAdmins = () => {
    if (!groupMetadata) return;
    const admins = groupMetadata.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id);
    setSelectedMembers(admins);
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !selectedGroupId || selectedMembers.length === 0) return;
    
    // Hidden mentions: We pass the selectedMembers in the mentions array so they get notified,
    // but do not append visible @tags to the message body text to keep it neat and avoid spam.
    let finalMessage = message;

    setSending(true);
    setSendResult(null);

    try {
      const payload: any = {
        to: selectedGroupId,
        message: finalMessage,
        mentions: selectedMembers
      };

      if (showMediaInput && mediaUrl) {
        payload.mediaUrl = mediaUrl;
        payload.mediaType = mediaType;
      }

      const res = await api.post<any>(`/api/whatsapp/${selectedChannel.id}/send`, payload);
      if (res.status === 'success' || res.ok) {
        setSendResult({ success: true, message: 'Pesan auto-tag berhasil dikirim ke grup!' });
        setMessage('');
        setMediaUrl('');
      } else {
        setSendResult({ success: false, message: res.message || 'Gagal mengirim pesan ke grup.' });
      }
    } catch (err: any) {
      setSendResult({ success: false, message: err.message || 'Koneksi ke WhatsApp service gagal.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout activePage="group_tag" title="Setting Auto Tag Member">
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // --- PREMIUM PAYWALL RENDER ---
  if (!isPremium) {
    return (
      <AdminLayout activePage="group_tag" title="Setting Auto Tag Member">
        <div className="max-w-4xl mx-auto py-10 px-4">
          <div className="bg-zinc-900/50 dark:bg-zinc-950/40 border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 relative">
              <Lock className="w-8 h-8 text-white animate-pulse" />
              <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">PRO</div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Setting Auto Tag Member (Group Mention)
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base mb-8">
              Tingkatkan efektivitas promosi grup Anda hingga 10x lipat! Fitur terobosan ini memungkinkan Anda untuk me-mention (tag) seluruh atau sebagian anggota grup secara otomatis dalam sekali kirim pesan. Anggota grup akan mendapatkan notifikasi langsung (tag biru) sehingga tingkat keterbacaan pesan meningkat pesat.
            </p>

            {/* Benefits Grid */}
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left mb-10">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-450" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Tag Semua Anggota</h4>
                  <p className="text-[11px] text-zinc-500">Tag seluruh anggota grup sekaligus secara otomatis.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-450" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Pilih Admin Saja</h4>
                  <p className="text-[11px] text-zinc-500">Hubungi atau tag admin grup dengan sekali klik cepat.</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-450" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">Filter Anggota Kustom</h4>
                  <p className="text-[11px] text-zinc-500">Cari nomor anggota dan pilih secara spesifik siapa saja yang di-tag.</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/subscription"
                className="w-full sm:w-auto bg-gradient-brand hover:opacity-95 text-white font-bold px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Berlangganan Premium Sekarang
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href="/dashboard"
                className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold px-8 py-3.5 rounded-2xl border border-zinc-800 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                Kembali ke Dashboard
              </a>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // --- PREMIUM DASHBOARD RENDER ---
  return (
    <AdminLayout activePage="group_tag" title="Setting Auto Tag Member">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Setting Auto Tag Member</h1>
            <span className="bg-blue-500/10 text-blue-650 dark:text-blue-450 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Premium</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mention seluruh atau sebagian anggota grup WhatsApp Anda secara instan dan otomatis.
          </p>
        </div>

        {/* Device Selector */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 px-4 py-2.5 rounded-2xl shrink-0">
          <Smartphone className="w-4 h-4 text-zinc-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-bold uppercase leading-none">Device Pengirim</span>
            <select
              className="bg-transparent text-xs font-bold text-zinc-850 dark:text-zinc-200 focus:outline-none pr-6 cursor-pointer mt-1"
              value={selectedChannel?.id || ''}
              onChange={(e) => {
                const ch = channels.find(c => c.id === Number(e.target.value));
                if (ch) setSelectedChannel(ch);
              }}
            >
              {channels.length === 0 ? (
                <option value="">Tidak ada device aktif</option>
              ) : (
                channels.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-zinc-950">{c.name}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: 3 Columns on Desktop */}
      <div className="grid lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        
        {/* Column 1: Groups List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col h-[60vh] min-h-[360px] lg:h-[550px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Pilih Grup WA
            </h3>
            {loadingGroups && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
          </div>

          {/* Search Groups */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-450 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Cari nama grup..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-zinc-800 dark:text-zinc-200"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
            />
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingGroups ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">Memuat grup terhubung...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-16 text-xs text-zinc-450 dark:text-zinc-500">
                Tidak ada grup ditemukan.
              </div>
            ) : (
              filteredGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    selectedGroupId === g.id
                      ? 'bg-blue-500/5 dark:bg-blue-500/[0.04] border-blue-550/40 text-blue-600 dark:text-blue-400'
                      : 'bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold truncate block leading-snug">{g.name}</span>
                    <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block mt-0.5">ID: {g.id.split('@')[0]}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full shrink-0">
                    {g.participantsCount} member
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Members List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col h-[60vh] min-h-[360px] lg:h-[550px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-blue-500" />
              Anggota Grup ({selectedMembers.length}/{filteredMembers.length})
            </h3>
            {loadingMembers && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
          </div>

          {/* Quick Select Buttons */}
          {groupMetadata && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={selectAll}
                className="py-1 px-2 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-[10px] font-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 transition-colors"
              >
                Pilih Semua
              </button>
              <button
                onClick={selectAdmins}
                className="py-1 px-2 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-[10px] font-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 transition-colors"
              >
                Hanya Admin
              </button>
              <button
                onClick={clearSelection}
                className="py-1 px-2 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-[10px] font-black rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 transition-colors"
              >
                Bersihkan
              </button>
            </div>
          )}

          {/* Search Members */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-450 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Cari nama / nomor..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-zinc-800 dark:text-zinc-200"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              disabled={!groupMetadata}
            />
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {loadingMembers ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">Memuat daftar anggota...</span>
              </div>
            ) : !selectedGroupId ? (
              <div className="text-center py-16 text-xs text-zinc-450 dark:text-zinc-500 leading-relaxed">
                Pilih salah satu grup WA di sebelah kiri terlebih dahulu.
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-16 text-xs text-zinc-450 dark:text-zinc-500">
                Tidak ada anggota ditemukan.
              </div>
            ) : (
              filteredMembers.map(p => {
                const jid = p.id;
                const number = jid.split('@')[0];
                const isSelected = selectedMembers.includes(jid);
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';

                return (
                  <button
                    key={jid}
                    onClick={() => toggleMember(jid)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-500/5 dark:bg-blue-500/[0.03] border-blue-550/20 text-blue-600 dark:text-blue-400'
                        : 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4.5 h-4.5 text-blue-505 shrink-0" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-zinc-350 dark:text-zinc-700 shrink-0" />
                      )}
                      <div className="min-w-0 text-left">
                        <span className="text-xs font-bold truncate block leading-tight">
                          {p.name || number}
                        </span>
                        {p.name && (
                          <span className="text-[9px] text-zinc-450 dark:text-zinc-555 font-mono block">
                            +{number}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 rounded-md uppercase tracking-wider shrink-0">
                        Admin
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Message Composer & Settings (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 h-auto lg:h-[550px] flex flex-col">
          <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 shrink-0">
            <Send className="w-4 h-4 text-blue-500" />
            Tulis Pesan Auto Tag
          </h3>

          <form onSubmit={handleSend} className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* Textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              <label className="text-[10px] font-extrabold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider mb-1.5 block">Isi Pesan</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Masukkan pesan promosi atau pengumuman Anda di sini..."
                className="w-full flex-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-zinc-800 dark:text-zinc-200 resize-none min-h-[140px]"
                disabled={!selectedGroupId || selectedMembers.length === 0}
                required
              />
            </div>

            {/* Media Option */}
            <div className="shrink-0 space-y-3">
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className={`flex items-center gap-2 text-xs font-bold transition-all ${
                  showMediaInput ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {showMediaInput ? <X className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                {showMediaInput ? 'Batal Tambah Media' : 'Tambah Media Gambar / Video / File'}
              </button>

              {showMediaInput && (
                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-2xl space-y-2.5">
                  <div>
                    <label className="text-[9px] font-extrabold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1 block">Tipe Media</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['image', 'video', 'document', 'pdf'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setMediaType(t)}
                          className={`py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider transition-all ${
                            mediaType === t
                              ? 'bg-blue-550/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1 block">URL Media</label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none text-zinc-800 dark:text-zinc-250"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status Alert */}
            {sendResult && (
              <div className={`p-3.5 rounded-2xl border text-xs font-bold flex gap-2.5 shrink-0 ${
                sendResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-405'
              }`}>
                {sendResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{sendResult.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending || !selectedGroupId || selectedMembers.length === 0}
              className="w-full bg-gradient-brand hover:opacity-95 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim Tagging...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim & Tag ({selectedMembers.length} Anggota)
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  </AdminLayout>
);
}
