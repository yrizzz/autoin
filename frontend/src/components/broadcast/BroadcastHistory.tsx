import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Broadcast, Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import Toast from '../ui/Toast';
import { 
  Search, 
  Calendar, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  Copy,
  User,
  AlertTriangle,
  Send,
  Sparkles,
  Tag,
  Users,
  Phone,
  Edit2
} from 'lucide-react';
import { RecipientModal, PlatformIcon } from './BroadcastCreate';
import type { Recipient, ChannelRecipientState } from './BroadcastCreate';

interface BroadcastLog {
  id: number;
  recipient_id: string;
  recipient_name: string | null;
  status: 'sent' | 'failed' | 'queued' | 'pending';
  error: string | null;
  created_at: string;
  sent_at?: string | null;
  channel?: {
    id: number;
    name: string;
    platform: string;
  };
}

interface DetailedBroadcast extends Broadcast {
  targets?: Array<{
    id: number;
    channel_id: number;
    recipients: string[] | null;
    channel?: {
      id: number;
      name: string;
      platform: string;
    };
  }>;
  logs?: BroadcastLog[];
}

export default function BroadcastHistory() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<DetailedBroadcast | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editRecurring, setEditRecurring] = useState('none');
  const [editAutoTagMembers, setEditAutoTagMembers] = useState(false);
  
  // Edit Target Channels & Recipients States
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [recipientState, setRecipientState] = useState<Record<number, ChannelRecipientState>>({});
  const [recipientModal, setRecipientModal] = useState<Channel | null>(null);
  const [syncingRecipients, setSyncingRecipients] = useState<Record<number, boolean>>({});
  const [autoTagMembersSettings, setAutoTagMembersSettings] = useState<Record<string, { enabled: boolean; mode: 'all' | 'admin' | 'custom'; custom_members: string[] }>>({});

  const [saving, setSaving] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const formatForInput = (d: string | null | undefined): string => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (selectedBroadcast) {
      setEditTitle(selectedBroadcast.title || '');
      setEditContent(selectedBroadcast.content || '');
      setEditScheduledAt(formatForInput(selectedBroadcast.scheduled_at));
      setEditRecurring(selectedBroadcast.recurring || 'none');
      setEditAutoTagMembers(selectedBroadcast.auto_tag_members || false);
    }
  }, [selectedBroadcast, isEditing]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchBroadcasts(currentPage);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    const hasActiveBroadcasts = broadcasts.some(b => 
      ['sending', 'queued'].includes(b.status) ||
      (b.status === 'scheduled' && (!b.scheduled_at || new Date(b.scheduled_at) <= new Date()))
    );
    if (!hasActiveBroadcasts) return;

    const intervalId = setInterval(() => {
      let url = `/api/broadcasts?page=${currentPage}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      api.get<{ data: Broadcast[]; current_page: number; last_page: number; total: number }>(url)
        .then((r) => {
          setBroadcasts(r.data);
          setLastPage(r.last_page);
          setTotalItems(r.total);
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(intervalId);
  }, [broadcasts, currentPage, statusFilter]);

  const fetchBroadcasts = (page = 1) => {
    setLoading(true);
    let url = `/api/broadcasts?page=${page}`;
    if (statusFilter !== 'all') {
      url += `&status=${statusFilter}`;
    }

    api.get<{ data: Broadcast[]; current_page: number; last_page: number; total: number }>(url)
      .then((r) => {
        setBroadcasts(r.data);
        setCurrentPage(r.current_page);
        setLastPage(r.last_page);
        setTotalItems(r.total);
      })
      .catch(() => {
        setBroadcasts([]);
        setCurrentPage(1);
        setLastPage(1);
        setTotalItems(0);
      })
      .finally(() => setLoading(false));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Local filter on top of the paginated query
  const filteredBroadcasts = broadcasts.filter((bc) => {
    const matchesSearch = 
      (bc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) || 
      bc.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const openDetails = async (id: number) => {
    setDetailLoading(true);
    setSelectedBroadcast(null);
    setIsEditing(false); // Reset edit mode
    setDetailOpen(true);
    setLogSearchTerm('');

    try {
      const data = await api.get<DetailedBroadcast>(`/api/broadcasts/${id}`);
      setSelectedBroadcast(data);
    } catch (err) {
      showToast('Gagal memuat detail log penerima', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditDirectly = async (id: number) => {
    setDetailLoading(true);
    setSelectedBroadcast(null);
    setIsEditing(false);
    setDetailOpen(true);
    setLogSearchTerm('');

    try {
      const data = await api.get<DetailedBroadcast>(`/api/broadcasts/${id}`);
      setSelectedBroadcast(data);
      setIsEditing(true);

      const chs = await api.get<Channel[]>('/api/channels');
      setChannels(chs);

      const initialSelectedChannels: number[] = [];
      const initialRecipientState: Record<number, ChannelRecipientState> = {};
      const initialAutoTagSettings: Record<string, any> = {};

      for (const ch of chs) {
        const target = (data.targets || []).find(t => t.channel_id === ch.id);
        const selectedJids = new Set<string>(target?.recipients || []);
        
        initialRecipientState[ch.id] = {
          loading: false,
          items: [],
          selected: selectedJids,
        };

        if (target) {
          initialSelectedChannels.push(ch.id);
        }
      }

      setEditTitle(data.title || '');
      setEditContent(data.content || '');
      setEditScheduledAt(data.scheduled_at ? data.scheduled_at.slice(0, 16) : '');
      setEditRecurring(data.recurring || 'none');
      setEditAutoTagMembers(!!data.auto_tag_members);

      if (typeof data.auto_tag_members === 'object' && data.auto_tag_members !== null) {
        Object.entries(data.auto_tag_members).forEach(([groupId, settings]) => {
          initialAutoTagSettings[groupId] = settings;
        });
      }

      setSelectedChannels(initialSelectedChannels);
      setRecipientState(initialRecipientState);
      setAutoTagMembersSettings(initialAutoTagSettings);

      chs.forEach(ch => {
        if (initialSelectedChannels.includes(ch.id)) {
          Promise.all([
            api.get<{ contacts: any[] }>(`/api/whatsapp/${ch.id}/contacts`).catch(() => ({ contacts: [] })),
            api.get<{ groups: any[] }>(`/api/whatsapp/${ch.id}/groups`).catch(() => ({ groups: [] })),
          ]).then(([cRes, gRes]) => {
            const contacts = (cRes.contacts || [])
              .filter((c: any) => c.id && c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@'))
              .map((c: any) => ({
                id: c.id,
                name: c.name && !c.name.includes('@') ? c.name : c.id.split('@')[0],
                phone: `+${c.id.split('@')[0]}`,
                type: 'contact' as const
              }));
            const groups = (gRes.groups || [])
              .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));

            setRecipientState(prev => {
              const current = prev[ch.id];
              if (!current) return prev;
              return {
                ...prev,
                [ch.id]: {
                  ...current,
                  items: [...contacts, ...groups],
                }
              };
            });
          }).catch(() => {});
        }
      });

    } catch (err) {
      showToast('Gagal memuat detail log penerima', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditing = async () => {
    if (!selectedBroadcast) return;
    setIsEditing(true);
    try {
      // 1. Fetch user's channels
      const chs = await api.get<Channel[]>('/api/channels');
      setChannels(chs);

      // 2. Initialize selectedChannels from targets
      const targetChannelIds = (selectedBroadcast.targets || []).map(t => t.channel_id);
      setSelectedChannels(targetChannelIds);

      // 3. Initialize recipientState based on the targets
      const initialRecipients: Record<number, ChannelRecipientState> = {};
      
      // For each channel we own, load its targets
      for (const ch of chs) {
        const target = (selectedBroadcast.targets || []).find(t => t.channel_id === ch.id);
        const selectedJids = new Set<string>(target?.recipients || []);
        
        // Initialize state as loading: true first
        initialRecipients[ch.id] = {
          loading: true,
          items: [],
          selected: selectedJids,
        };
      }
      setRecipientState(initialRecipients);

      // 4. Fetch the contact/group items for the selected channels so the lists are filled
      for (const ch of chs) {
        if (!targetChannelIds.includes(ch.id)) continue;
        
        // Fetch contacts & groups for this channel (lazy but parallel)
        (async () => {
          try {
            const [cRes, gRes] = await Promise.all([
              api.get<{ contacts: any[] }>(`/api/whatsapp/${ch.id}/contacts`).catch(() => ({ contacts: [] })),
              api.get<{ groups: any[] }>(`/api/whatsapp/${ch.id}/groups`).catch(() => ({ groups: [] })),
            ]);

            const contacts: Recipient[] = (cRes.contacts || [])
              .filter((c: any) => c.id && c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@'))
              .map((c: any) => ({
                id: c.id,
                name: c.name && !c.name.includes('@') ? c.name : c.id.split('@')[0],
                phone: `+${c.id.split('@')[0]}`,
                type: 'contact' as const
              }));

            const groups: Recipient[] = (gRes.groups || [])
              .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));

            setRecipientState(prev => {
              const current = prev[ch.id];
              return {
                ...prev,
                [ch.id]: {
                  loading: false,
                  items: [...contacts, ...groups],
                  selected: current?.selected ?? new Set(),
                }
              };
            });
          } catch (e) {
            setRecipientState(prev => {
              const current = prev[ch.id];
              return {
                ...prev,
                [ch.id]: {
                  loading: false,
                  items: [],
                  selected: current?.selected ?? new Set(),
                }
              };
            });
          }
        })();
      }

    } catch (err: any) {
      showToast('Gagal memuat daftar channel: ' + (err.message ?? ''), 'error');
      setIsEditing(false);
    }
  };

  const toggleChannel = (channelId: number) => {
    setSelectedChannels(prev => {
      const next = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];
      return next;
    });

    // If channel wasn't loaded yet, load it
    const ch = channels.find(c => c.id === channelId);
    if (ch && (!recipientState[channelId] || recipientState[channelId].items.length === 0)) {
      setRecipientState(prev => ({
        ...prev,
        [channelId]: {
          loading: true,
          items: [],
          selected: prev[channelId]?.selected ?? new Set(),
        }
      }));

      (async () => {
        try {
          const [cRes, gRes] = await Promise.all([
            api.get<{ contacts: any[] }>(`/api/whatsapp/${ch.id}/contacts`).catch(() => ({ contacts: [] })),
            api.get<{ groups: any[] }>(`/api/whatsapp/${ch.id}/groups`).catch(() => ({ groups: [] })),
          ]);

          const contacts: Recipient[] = (cRes.contacts || [])
            .filter((c: any) => c.id && c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@'))
            .map((c: any) => ({
              id: c.id,
              name: c.name && !c.name.includes('@') ? c.name : c.id.split('@')[0],
              phone: `+${c.id.split('@')[0]}`,
              type: 'contact' as const
            }));

          const groups: Recipient[] = (gRes.groups || [])
            .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));

          setRecipientState(prev => {
            const current = prev[ch.id];
            return {
              ...prev,
              [ch.id]: {
                loading: false,
                items: [...contacts, ...groups],
                selected: current?.selected ?? new Set(),
              }
            };
          });
        } catch (e) {
          setRecipientState(prev => {
            const current = prev[ch.id];
            return {
              ...prev,
              [ch.id]: {
                loading: false,
                items: [],
                selected: current?.selected ?? new Set(),
              }
            };
          });
        }
      })();
    }
  };

  const openRecipientModal = (ch: Channel) => {
    setRecipientModal(ch);
  };

  function toggleRecipient(channelId: number, recipientId: string) {
    setRecipientState(prev => {
      const cur = prev[channelId];
      if (!cur) return prev;
      const next = new Set(cur.selected);
      next.has(recipientId) ? next.delete(recipientId) : next.add(recipientId);
      return { ...prev, [channelId]: { ...cur, selected: next } };
    });
  }

  function clearAllRecipients(channelId: number) {
    setRecipientState(prev => {
      const cur = prev[channelId];
      if (!cur) return prev;
      return { ...prev, [channelId]: { ...cur, selected: new Set() } };
    });
  }

  async function handleSyncRecipients(ch: Channel) {
    const id = ch.id;
    setSyncingRecipients(prev => ({ ...prev, [id]: true }));
    try {
      await api.post(`/api/whatsapp/${id}/sync`);
      const [cRes, gRes] = await Promise.all([
        api.get<{ contacts: any[] }>(`/api/whatsapp/${id}/contacts`).catch(() => ({ contacts: [] })),
        api.get<{ groups: any[] }>(`/api/whatsapp/${id}/groups`).catch(() => ({ groups: [] })),
      ]);
      const contacts: Recipient[] = (cRes.contacts || [])
        .filter((c: any) => c.id && c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@'))
        .map((c: any) => ({
          id: c.id,
          name: c.name && !c.name.includes('@') ? c.name : c.id.split('@')[0],
          phone: `+${c.id.split('@')[0]}`,
          type: 'contact' as const
        }));
      const groups: Recipient[] = (gRes.groups || [])
        .map((g: any) => ({ id: g.id, name: g.name || g.subject || g.id, type: 'group' as const }));
      const items = [...contacts, ...groups];

      setRecipientState(prev => ({
        ...prev,
        [id]: { loading: false, items, selected: prev[id]?.selected ?? new Set() },
      }));
      showToast('Sinkronisasi kontak berhasil!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal sinkronisasi kontak: ' + (err.message ?? ''), 'error');
    } finally {
      setSyncingRecipients(prev => ({ ...prev, [id]: false }));
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedBroadcast) return;
    if (!editContent.trim()) {
      showToast('Isi pesan tidak boleh kosong!', 'error');
      return;
    }
    if (selectedChannels.length === 0) {
      showToast('Pilih minimal satu channel target!', 'error');
      return;
    }
    setSaving(true);
    try {
      const scheduledAtUtc = editScheduledAt && !isNaN(new Date(editScheduledAt).getTime())
        ? new Date(editScheduledAt).toISOString()
        : null;

      // Map recipientState selected Sets to arrays for the request payload
      const recipientsPayload: Record<number, string[]> = {};
      selectedChannels.forEach(cId => {
        const sel = recipientState[cId]?.selected;
        recipientsPayload[cId] = sel ? Array.from(sel) : [];
      });

      const updated = await api.put<DetailedBroadcast>(`/api/broadcasts/${selectedBroadcast.id}`, {
        title: editTitle || null,
        content: editContent,
        scheduled_at: scheduledAtUtc,
        recurring: scheduledAtUtc ? editRecurring : 'none',
        auto_tag_members: editAutoTagMembers,
        channel_ids: selectedChannels,
        recipients: recipientsPayload,
      });
      
      showToast('Perubahan broadcast berhasil disimpan!', 'success');
      setIsEditing(false);
      
      // Update local detailed broadcast state
      setSelectedBroadcast(prev => prev ? { ...prev, ...updated } : null);
      
      // Refresh the main table list
      fetchBroadcasts(currentPage);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan perubahan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await api.delete(`/api/broadcasts/${id}`);
      showToast('Riwayat broadcast berhasil dihapus!', 'success');
      setDeleteConfirmId(null);
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal menghapus riwayat broadcast', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleResend = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/broadcasts/${id}/send`);
      showToast('Broadcast berhasil diantrekan kembali!', 'success');
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal mengirim ulang broadcast', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendNow = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/broadcasts/${id}/send`);
      showToast('Broadcast sedang dikirim sekarang!', 'success');
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal mengirim broadcast', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.post(`/api/broadcasts/${id}/cancel`);
      showToast('Jadwal broadcast berhasil dibatalkan!', 'success');
      fetchBroadcasts(currentPage);
    } catch {
      showToast('Gagal membatalkan jadwal broadcast', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Teks pesan disalin ke clipboard!', 'success');
  };

  // Helper to format phone number or group JID without @s.whatsapp.net / @g.us / @lid
  const formatPhoneOrJid = (jid: string) => {
    if (!jid) return '';
    return jid.replace(/@s\.whatsapp\.net|@g\.us|@lid/g, '');
  };

  // Calculate detailed logs stats
  const getLogStats = (logs: BroadcastLog[] = []) => {
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const pending = logs.filter(l => l.status === 'queued' || l.status === 'pending').length;
    const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, pending, rate };
  };

  return (
    <AdminLayout activePage="history" title="Riwayat Broadcast">
      
      {/* Premium Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-950 dark:text-white tracking-tight uppercase">
            Riwayat Broadcast
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar pengiriman pesan broadcasting multi-channel Anda secara ringkas dan teratur.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 px-4 py-2 rounded-2xl">
          <div className="text-center px-1">
            <span className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">Total Campaign</span>
            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{totalItems}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Cari judul atau isi pesan..."
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
          />
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'sent', label: 'Sukses' },
            { id: 'failed', label: 'Gagal' },
            { id: 'scheduled', label: 'Terjadwal' },
            { id: 'queued', label: 'Antre' }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => { setStatusFilter(chip.id); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                statusFilter === chip.id 
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {chip.label}
            </button>
          ))}
          
          <button 
            onClick={() => fetchBroadcasts(currentPage)} 
            disabled={loading}
            className="text-xs font-bold bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300 ml-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton for Table */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
          <div className="h-6 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-800 rounded" />
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 bg-zinc-50/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Data Kosong</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1.5 mb-6 max-w-xs mx-auto leading-relaxed">
            Tidak ada riwayat broadcast yang terdaftar untuk filter status "{statusFilter}".
          </p>
          <a href="/broadcast" className="inline-flex items-center gap-1.5 bg-gradient-brand hover:opacity-95 text-white font-bold px-5 py-2.5 rounded-2xl transition-all text-xs cursor-pointer shadow-md shadow-blue-500/15">
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Broadcast</span>
          </a>
        </div>
      ) : (
        /* Redesigned Compact Table View */
        <div className="space-y-4">
          <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800/80 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    <th className="px-5 py-3.5 font-bold">Campaign ID</th>
                    <th className="px-5 py-3.5 font-bold">Tanggal Kirim</th>
                    <th className="px-5 py-3.5 font-bold">Judul & Pesan</th>
                    <th className="px-5 py-3.5 font-bold text-center">Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-xs">
                  {filteredBroadcasts.map((bc) => (
                    <tr key={bc.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                        #{bc.id}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {new Date(bc.created_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {bc.scheduled_at && (
                          <div className="flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-500/85 font-semibold mt-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Jadwal: {new Date(bc.scheduled_at).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </td>

                      {/* Campaign details */}
                      <td className="px-5 py-4 max-w-xs md:max-w-md">
                        <div className="font-bold text-zinc-850 dark:text-zinc-200 truncate">
                          {bc.title || 'Broadcast Tanpa Judul'}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 truncate mt-0.5 max-w-sm font-normal">
                          {bc.content}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${statusColor(bc.status)}`}>
                            {bc.status}
                          </span>
                          {bc.total_logs !== undefined && bc.total_logs > 0 && (
                            <div className="w-24 mt-1">
                              <div className="flex justify-between text-[9px] text-zinc-400 dark:text-zinc-500 font-bold mb-0.5">
                                <span>{(bc.sent_logs || 0) + (bc.failed_logs || 0)}/{bc.total_logs}</span>
                                <span>{Math.round((((bc.sent_logs || 0) + (bc.failed_logs || 0)) / bc.total_logs) * 100)}%</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-150 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    bc.status === 'sending' ? 'bg-blue-500 animate-pulse' :
                                    bc.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.round((((bc.sent_logs || 0) + (bc.failed_logs || 0)) / bc.total_logs) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetails(bc.id)}
                            className="p-2 bg-zinc-50 dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/20 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-450 rounded-xl transition-all cursor-pointer"
                            title="Detail & Penerima"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {['scheduled', 'draft', 'cancelled', 'failed'].includes(bc.status) && (
                            <button
                              type="button"
                              onClick={() => openEditDirectly(bc.id)}
                              className="p-2 bg-zinc-50 dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500/20 text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-450 rounded-xl transition-all cursor-pointer"
                              title="Edit Broadcast"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['failed', 'draft'].includes(bc.status) && (
                            <button
                              type="button"
                              onClick={() => handleResend(bc.id)}
                              disabled={actionLoadingId === bc.id}
                              className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Kirim Ulang"
                            >
                              {actionLoadingId === bc.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {bc.status === 'scheduled' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendNow(bc.id)}
                                disabled={actionLoadingId === bc.id}
                                className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                title="Kirim Sekarang"
                              >
                                {actionLoadingId === bc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancel(bc.id)}
                                disabled={actionLoadingId === bc.id}
                                className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                title="Batalkan Jadwal"
                              >
                                {actionLoadingId === bc.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(bc.id)}
                            className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-5 mt-4">
              <span className="text-xs text-zinc-500 font-medium">
                Menampilkan <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentPage}</span> dari <span className="font-bold text-zinc-800 dark:text-zinc-200">{lastPage}</span> halaman ({totalItems} campaign)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={currentPage === lastPage || loading}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">Hapus Riwayat?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Aksi ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Apakah Anda yakin ingin menghapus data campaign broadcast ini beserta seluruh log pengiriman penerima di dalamnya?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Drawer/Sliding Panel */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDetailOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0e0e11] border-l border-zinc-200 dark:border-zinc-800/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-350 z-10 text-zinc-900 dark:text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono">
                  {isEditing ? 'EDIT CAMPAIGN BROADCAST' : 'LOG DETAIL PENERIMA'}
                </span>
                <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase mt-0.5 truncate max-w-md">
                  {isEditing ? 'Ubah Informasi Broadcast' : (selectedBroadcast?.title || 'Log Detail Campaign')}
                </h2>
              </div>
              <button 
                onClick={() => setDetailOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {detailLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="text-xs text-zinc-650 font-bold">Memuat data penerima...</span>
                </div>
              ) : selectedBroadcast ? (
                isEditing ? (
                  <div className="space-y-4">
                    {/* Title input */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Judul Broadcast</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                        placeholder="Masukkan judul broadcast (opsional)..."
                        disabled={saving}
                      />
                    </div>

                    {/* Content input */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Isi Pesan</label>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={8}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none leading-relaxed shadow-sm font-sans"
                        placeholder="Ketik pesan Anda..."
                        disabled={saving}
                      />
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 px-1">
                        <span>Gunakan template tag <code>{`{{nama}}`}</code> untuk nama penerima.</span>
                        <span>{editContent.length} karakter</span>
                      </div>
                    </div>

                    {/* Scheduled At & Recurring fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Waktu Kirim (Kosong = Instan/Draft)</label>
                        <input
                          type="datetime-local"
                          value={editScheduledAt}
                          onChange={e => setEditScheduledAt(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pola Pengulangan</label>
                        <select
                          value={editRecurring}
                          onChange={e => setEditRecurring(e.target.value)}
                          disabled={!editScheduledAt || saving}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 cursor-pointer transition-all shadow-sm"
                        >
                          <option value="none">Satu Kali (Sekali Kirim)</option>
                          <option value="daily">Setiap Hari</option>
                          <option value="weekly">Setiap Minggu</option>
                          <option value="monthly">Setiap Bulan</option>
                        </select>
                      </div>
                    </div>

                    {/* Setting Auto Tag Member */}
                    <div className="bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-blue-500" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Setting Auto Tag Member</span>
                            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Premium</span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={editAutoTagMembers} onChange={e => setEditAutoTagMembers(e.target.checked)} className="sr-only peer" disabled={saving} />
                          <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                        Jika diaktifkan, saat broadcast dikirimkan ke target <strong>Grup WhatsApp</strong>, sistem akan secara otomatis me-mention (tag) seluruh anggota grup tersebut di dalam pesan.
                      </p>
                    </div>

                    {/* Target Channels & Recipients */}
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        Channel Target & Penerima
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {channels.map(ch => {
                          const isSelected = selectedChannels.includes(ch.id);
                          const rState = recipientState[ch.id];
                          const selectedCount = rState?.selected.size || 0;

                          return (
                            <div
                              key={ch.id}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-blue-500/5 border-blue-500/25 dark:bg-blue-500/10'
                                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleChannel(ch.id)}
                                  disabled={saving}
                                  className="w-4 h-4 rounded text-blue-500 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <PlatformIcon platform={ch.platform} className="w-4 h-4" />
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-150 truncate">
                                      {ch.name}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal truncate">
                                    {ch.platform === 'whatsapp' ? 'WhatsApp Session' : 'Telegram Bot'}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={() => openRecipientModal(ch)}
                                  disabled={saving}
                                  className={`text-[10px] font-extrabold flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                    selectedCount > 0
                                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-250 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-150'
                                  }`}
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  {selectedCount > 0 ? `${selectedCount} Penerima` : 'Pilih Penerima'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Message Detail preview */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Isi Pesan Broadcast</span>
                        <button 
                          type="button" 
                          onClick={() => copyToClipboard(selectedBroadcast.content)}
                          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-lg cursor-pointer transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto pr-2 font-normal">
                        {selectedBroadcast.content}
                      </div>
                    </div>

                    {/* Progress Stats Summary */}
                    {(() => {
                      const stats = getLogStats(selectedBroadcast.logs);
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl">
                          <div className="text-center py-1">
                            <span className="block text-[11px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase">Total Target</span>
                            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">{stats.total}</span>
                          </div>
                          <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                            <span className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">Sukses</span>
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{stats.sent}</span>
                          </div>
                          <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                            <span className="block text-[11px] font-extrabold text-red-650 dark:text-red-400 uppercase">Gagal</span>
                            <span className="text-sm font-extrabold text-red-600 dark:text-red-450">{stats.failed}</span>
                          </div>
                          <div className="text-center py-1 border-l border-zinc-200 dark:border-zinc-800/80">
                            <span className="block text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">Antrean</span>
                            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{stats.pending}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recipients List Header with Search */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="font-extrabold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                          Daftar Penerima Detail
                        </h3>
                        
                        {/* Search recipients */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                          <input
                            type="text"
                            value={logSearchTerm}
                            onChange={(e) => setLogSearchTerm(e.target.value)}
                            placeholder="Cari nama atau nomor..."
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500 placeholder-zinc-400"
                          />
                        </div>
                      </div>

                      {/* Table presentation for log targets */}
                      {(() => {
                        const list = (selectedBroadcast.logs || []).filter(l => {
                          const term = logSearchTerm.toLowerCase();
                          return (
                            l.recipient_id.includes(term) ||
                            (l.recipient_name?.toLowerCase().includes(term) ?? false)
                          );
                        });

                        if (list.length === 0) {
                          return (
                            <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                              <User className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Tidak ada log penerima yang cocok</p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">
                                    <th className="px-4 py-3">Nama Kontak</th>
                                    <th className="px-4 py-3">Nomor Telepon</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Waktu</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                  {list.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-950/20 transition-colors">
                                      {/* Name */}
                                      <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                                        <div className="flex items-center gap-1.5">
                                          <span>{log.recipient_name || 'Kontak Tanpa Nama'}</span>
                                          {log.channel && (
                                            <span className="text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold px-1 py-0.5 rounded uppercase">
                                              {log.channel.name}
                                            </span>
                                          )}
                                        </div>
                                        {log.error && (
                                          <div className="text-[11px] text-red-500 mt-1 font-semibold flex items-start gap-1 max-w-[200px]">
                                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                            <span>{log.error}</span>
                                          </div>
                                        )}
                                      </td>

                                      {/* Number / ID without JID suffix */}
                                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {formatPhoneOrJid(log.recipient_id)}
                                      </td>

                                      {/* Status */}
                                      <td className="px-4 py-3">
                                        <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                          log.status === 'sent' 
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/25'
                                            : log.status === 'failed'
                                              ? 'bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border-red-100 dark:border-red-500/20'
                                              : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
                                        }`}>
                                          {log.status === 'sent' ? 'Sukses' : log.status === 'failed' ? 'Gagal' : log.status}
                                        </span>
                                      </td>

                                      {/* Time */}
                                      <td className="px-4 py-3 text-right text-zinc-400 dark:text-zinc-500 font-mono text-xs">
                                        {new Date(log.sent_at || log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold text-center sm:text-left">
                ID: #{selectedBroadcast?.id} · Status: <span className="uppercase font-extrabold text-blue-600 dark:text-blue-400">{selectedBroadcast?.status}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => setIsEditing(false)} disabled={saving}
                      className="px-4 py-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 hover:bg-zinc-250 dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center">
                      Batal
                    </button>
                    <button type="button" onClick={handleSaveEdit} disabled={saving}
                      className="flex items-center justify-center gap-1.5 px-5 py-2 bg-gradient-brand hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50">
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        'Simpan Perubahan'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Edit button: only show if broadcast is editable (scheduled, draft, cancelled, failed) */}
                    {selectedBroadcast && ['scheduled', 'draft', 'cancelled', 'failed'].includes(selectedBroadcast.status) && (
                      <button type="button" onClick={startEditing}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-500/20">
                        Edit Broadcast
                      </button>
                    )}
                    <button type="button" onClick={() => setDetailOpen(false)}
                      className="px-5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-255 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer text-center border border-zinc-205 dark:border-zinc-705">
                      Tutup
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Recipient Selection Modal */}
      {recipientModal && recipientState[recipientModal.id] && (
        <RecipientModal
          channel={recipientModal}
          state={recipientState[recipientModal.id]}
          onClose={() => setRecipientModal(null)}
          onToggle={id => toggleRecipient(recipientModal.id, id)}
          onClearAll={() => clearAllRecipients(recipientModal.id)}
          autoTagMembers={autoTagMembersSettings}
          onUpdateGroupTagSettings={(groupId, settings) => {
            setAutoTagMembersSettings(prev => ({
              ...prev,
              [groupId]: settings,
            }));
          }}
          syncing={syncingRecipients[recipientModal.id] || false}
          onSyncContacts={async () => {
            await handleSyncRecipients(recipientModal);
          }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

    </AdminLayout>
  );
}

function statusColor(s: string): string {
  const m: Record<string, string> = {
    sent:      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 shadow-sm',
    failed:    'bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border-red-100 dark:border-red-500/20 shadow-sm',
    scheduled: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/20',
    queued:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    sending:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 animate-pulse',
    draft:     'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800',
  };
  return m[s] ?? 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
}
