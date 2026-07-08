import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import type { Channel } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import {
  Search, RefreshCw, MessageSquare, Phone, Users, User,
  Download, Upload, LayoutGrid, LayoutList, Copy, Check, X,
  ChevronLeft, ChevronRight, Info, Trash2
} from 'lucide-react';

interface WaContact { id: string; name: string; }

type NormalContact = { id: string; name: string; phone?: string };

const PALETTE = [
  'bg-blue-500','bg-violet-500','bg-pink-500','bg-orange-500',
  'bg-emerald-500','bg-sky-500','bg-purple-500','bg-cyan-500',
  'bg-rose-500','bg-teal-500','bg-amber-500','bg-indigo-500',
];

function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatWaPhone(jid: string) {
  if (jid.endsWith('@lid')) return '';
  return `+${jid.split('@')[0]}`;
}

function contactsToCsv(contacts: NormalContact[]): string {
  const rows = contacts.map(c => {
    const name  = `"${(c.name || '').replace(/"/g, '""')}"`;
    const phone = `"${(c.phone || c.id).replace(/"/g, '""')}"`;
    return `${name},${phone}`;
  });
  return ['Nama,Nomor/ID', ...rows].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): { name: string; phone: string }[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return { name: cols[0] || '', phone: cols[1] || '' };
  }).filter(r => r.phone);
}

function PlatformTab({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
        active
          ? `${color} text-white border-transparent shadow-sm`
          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
      }`}>
      {label}
    </button>
  );
}

function Avatar({ contact, size = 'md' }: { contact: NormalContact; size?: 'sm' | 'md' | 'lg' }) {
  const bg  = avatarColor(contact.id);
  const ini = initials(contact.name || contact.phone || contact.id);
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${cls} rounded-full ${bg} flex items-center justify-center text-white font-bold shrink-0 select-none`}>
      {ini}
    </div>
  );
}

function ContactCard({ c, platform, onCopy, copied, onDelete }: {
  c: NormalContact; platform: string; onCopy: (v: string) => void; copied: string | null; onDelete: (jid: string) => void;
}) {
  const displayName = c.name || c.phone || c.id;
  const phoneOrId   = c.phone || (platform === 'whatsapp' ? formatWaPhone(c.id) : c.id);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 hover:border-blue-500/30 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3">
      <Avatar contact={c} size="lg" />
      <div className="w-full min-w-0">
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
        <button onClick={() => onCopy(phoneOrId)}
          className="flex items-center justify-center gap-1 mx-auto mt-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
          {copied === phoneOrId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span className="truncate max-w-[110px]">{phoneOrId}</span>
        </button>
      </div>
      {platform === 'whatsapp' && (
        <div className="w-full flex gap-2">
          <a href={`/chats?to=${encodeURIComponent(c.id.split('@')[0])}`}
            className="flex-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-xl transition-all border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20">
            <MessageSquare className="w-3 h-3" />Chat
          </a>
          <button onClick={() => onDelete(c.id)}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
            title="Hapus Kontak"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContactManager() {
  const [contacts, setContacts]           = useState<NormalContact[]>([]);
  const [waChannels, setWaChannels]       = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading]             = useState(true);
  const [syncing, setSyncing]             = useState(false);
  const [search, setSearch]               = useState('');
  const [view, setView]                   = useState<'list' | 'grid'>('list');
  const [copied, setCopied]               = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ name: string; phone: string }[] | null>(null);
  const [importing, setImporting]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Checkbox Selection State
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage]     = useState(1);
  const itemsPerPage = 100;

  // Reset page and selection on search/channel change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, activeChannel]);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchWaContacts = async (ch: Channel) => {
    const res = await api.get<{ contacts: WaContact[] }>(`/api/whatsapp/${ch.id}/contacts`);
    const real = (res.contacts || []).filter(c =>
      c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@') && !c.id.startsWith('0@')
    );
    setContacts(real.map(c => ({ id: c.id, name: c.name || '', phone: formatWaPhone(c.id) })));
  };

  const fetchContacts = async (ch: Channel) => {
    try {
      await fetchWaContacts(ch);
    } catch { setContacts([]); }
  };

  const load = async () => {
    setLoading(true);
    setContacts([]);
    try {
      const chs = await api.get<Channel[]>('/api/channels');
      const wa  = chs.filter(c => c.platform === 'whatsapp' && c.status === 'active');
      setWaChannels(wa);
      if (wa.length > 0) {
        setActiveChannel(wa[0]);
        await fetchContacts(wa[0]);
      } else { setActiveChannel(null); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleChannelSwitch = async (ch: Channel) => {
    setActiveChannel(ch);
    setLoading(true);
    await fetchContacts(ch);
    setLoading(false);
  };

  const handleSync = async () => {
    if (!activeChannel) return;
    setSyncing(true);
    await fetchContacts(activeChannel);
    setSyncing(false);
  };

  async function handleDeleteContact(jid: string) {
    if (!activeChannel) return;
    if (!confirm('Apakah Anda yakin ingin menghapus kontak ini?')) return;
    try {
      const res = await api.delete<{ contacts: any[] }>(
        `/api/whatsapp/${activeChannel.id}/contacts/${encodeURIComponent(jid)}`
      );
      if (res.contacts) {
        const real = (res.contacts || []).filter(c =>
          c.id.endsWith('@s.whatsapp.net') && !c.id.startsWith('status@') && !c.id.startsWith('0@')
        );
        setContacts(real.map(c => ({ id: c.id, name: c.name || '', phone: formatWaPhone(c.id) })));
        setMsg({ ok: true, text: '✓ Kontak berhasil dihapus.' });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Gagal menghapus kontak.' });
    }
  }

  async function handleDeleteSelected() {
    if (!activeChannel || selectedIds.size === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.size} kontak terpilih?`)) return;
    
    setLoading(true);
    try {
      const idsArray = Array.from(selectedIds);
      for (const jid of idsArray) {
        await api.delete<any>(
          `/api/whatsapp/${activeChannel.id}/contacts/${encodeURIComponent(jid)}`
        );
      }
      await fetchContacts(activeChannel);
      setSelectedIds(new Set());
      setMsg({ ok: true, text: `✓ Berhasil menghapus ${idsArray.length} kontak.` });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Gagal menghapus beberapa kontak.' });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(val: string) {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 2000);
  }

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      c.id.includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [contacts, search]);

  // Sort contacts alphabetically by name
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const nameA = (a.name || '').trim().toLowerCase();
      const nameB = (b.name || '').trim().toLowerCase();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB);
    });
  }, [filteredContacts]);

  // Paginated contacts
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedContacts.slice(start, start + itemsPerPage);
  }, [sortedContacts, currentPage]);

  const totalPages = Math.ceil(sortedContacts.length / itemsPerPage);

  const grouped = useMemo(() => {
    const map: Record<string, NormalContact[]> = {};
    paginatedContacts.forEach(c => {
      const letter = c.name?.[0]?.toUpperCase() || '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      (map[key] = map[key] || []).push(c);
    });
    return Object.entries(map).sort(([a], [b]) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  }, [paginatedContacts]);

  const channels   = waChannels;
  const emptyLabel = 'WhatsApp';
  const platform   = 'whatsapp';

  // Toggle selection for a single contact
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all on current page
  const toggleSelectAllPage = () => {
    const allPageSelected = paginatedContacts.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedContacts.forEach(c => next.delete(c.id));
      } else {
        paginatedContacts.forEach(c => next.add(c.id));
      }
      return next;
    });
  };

  const handleExport = () => {
    const toExport = selectedIds.size > 0 
      ? contacts.filter(c => selectedIds.has(c.id))
      : filteredContacts;
    downloadCsv(contactsToCsv(toExport), `kontak-${platform}-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const downloadTemplateCsv = () => {
    const csvContent = "Nama,Nomor/ID\nBudi Prasetyo,081234567890\nSiti Aminah,628987654321";
    downloadCsv(csvContent, "template_kontak.csv");
  };

  const handleImportSubmit = async () => {
    if (!activeChannel || !importPreview) return;
    setImporting(true);
    try {
      const newContacts = importPreview.map((item, idx) => {
        let phone = item.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.slice(1);
        }
        return {
          id: phone + '@s.whatsapp.net',
          name: item.name || `Kontak ${idx + 1}`
        };
      });

      const res = await api.post<{ contacts: any[] }>(`/api/whatsapp/${activeChannel.id}/contacts`, {
        contacts: newContacts
      });

      const real = (res.contacts || []).filter(c =>
        (c.id.endsWith('@s.whatsapp.net') || c.id.endsWith('@lid')) && !c.id.startsWith('status@') && !c.id.startsWith('0@')
      );
      setContacts(real.map(c => ({ id: c.id, name: c.name || '', phone: formatWaPhone(c.id) })));

      setMsg({ ok: true, text: `✓ Sukses mengimpor ${newContacts.length} kontak!` });
      setImportPreview(null);
    } catch (err: any) {
      console.error(err);
      setMsg({ ok: false, text: err.message ?? 'Gagal mengimpor kontak.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout activePage="contacts" title="Daftar Kontak">
      {/* Msg alerts */}
      {msg && (
        <div className={`rounded-xl p-4 border text-sm flex items-start gap-3 mb-5 animate-fadeIn ${
          msg.ok 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
            : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
        }`}>
          <div className="text-xs font-semibold leading-relaxed flex-1">
            {msg.text}
          </div>
          <button onClick={() => setMsg(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Daftar Kontak</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {loading ? 'Memuat...' : `${filteredContacts.length.toLocaleString()} kontak`}
            {activeChannel && <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">• {activeChannel.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-0.5">
            <button onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={handleExport}
            disabled={filteredContacts.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-40">
            <Download className="w-3.5 h-3.5" />
            {selectedIds.size > 0 ? `Export Pilihan (${selectedIds.size})` : 'Export CSV'}
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5" />Import CSV
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setImportPreview(parseCsv(ev.target?.result as string));
                reader.readAsText(file, 'UTF-8');
                if (fileRef.current) fileRef.current.value = '';
              }} />
          </label>
          <button onClick={downloadTemplateCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title="Download Template CSV">
            <Info className="w-3.5 h-3.5 text-blue-500" />Contoh CSV
          </button>
          <button onClick={handleSync} disabled={syncing || loading || !activeChannel}
            className="btn-primary flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />Sinkronisasi
          </button>
        </div>
      </div>

      {/* Channel Select & Search */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {channels.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Device:</span>
            <select
              value={activeChannel?.id ?? ''}
              onChange={(e) => {
                const ch = channels.find(c => c.id === Number(e.target.value));
                if (ch) handleChannelSwitch(ch);
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 font-bold transition-all shadow-sm cursor-pointer"
            >
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            Belum ada device aktif
          </div>
        )}

        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input type="text"
              placeholder="Cari nama, nomor..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-all shadow-sm w-52" />
          </div>
        </div>
      </div>

      {/* Selection Control Bar & Stats */}
      {!loading && contacts.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-extrabold text-zinc-900 dark:text-white">{contacts.length.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-zinc-900 dark:text-white">{filteredContacts.length.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">ditemukan</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id))}
                onChange={toggleSelectAllPage}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Pilih Halaman Ini
            </label>

            {selectedIds.size > 0 && (
              <>
                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg">
                  {selectedIds.size} dipilih
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="text-xs text-red-650 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold cursor-pointer flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-zinc-550 dark:text-zinc-400 hover:underline font-bold cursor-pointer"
                >
                  Batal Pilihan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 animate-pulse flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-2 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-8">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Users className="w-7 h-7 text-zinc-400" />
          </div>
          <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Tidak ada channel {emptyLabel} aktif</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
            Sambungkan {emptyLabel} di <a href="/channels" className="text-blue-600 dark:text-blue-400 underline">Integrasi Platform</a>.
          </p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-8">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <User className="w-7 h-7 text-zinc-400" />
          </div>
          <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Belum ada kontak tersinkronisasi</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
            Klik <strong>Sinkronisasi</strong> untuk memuat kontak dari {emptyLabel}.
          </p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Search className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Tidak ada hasil untuk "{search}"</p>
          <button onClick={() => setSearch('')} className="text-xs text-blue-600 dark:text-blue-400 underline cursor-pointer">Hapus filter</button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {paginatedContacts.map(c => (
            <ContactCard
              key={c.id}
              c={c}
              platform={platform}
              onCopy={handleCopy}
              copied={copied}
              selected={selectedIds.has(c.id)}
              onSelect={() => toggleSelect(c.id)}
              onDelete={handleDeleteContact}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <div className="sticky top-0 z-10 px-5 py-1.5 bg-zinc-50 dark:bg-zinc-950/60 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{letter}</span>
                <span className="text-[9px] text-zinc-400">{items.length}</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {items.map(c => {
                  const displayName = c.name || c.phone || c.id;
                  const phoneOrId   = c.phone || (platform === 'whatsapp' ? formatWaPhone(c.id) : c.id);
                  const isSel       = selectedIds.has(c.id);
                  return (
                    <div key={c.id}
                      className={`flex items-center gap-4 px-5 py-3 ${isSel ? 'bg-blue-500/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'} transition-colors group`}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(c.id)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer mr-1 shrink-0"
                      />
                      <Avatar contact={c} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</div>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="font-mono truncate">{phoneOrId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopy(phoneOrId)}
                          className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer"
                          title="Salin">
                          {copied === phoneOrId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {platform === 'whatsapp' && (
                          <>
                            <a href={`/chats?to=${encodeURIComponent(c.id.split('@')[0])}`}
                              className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                              title="Chat">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <button onClick={() => handleDeleteContact(c.id)}
                              className="p-2 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                              title="Hapus Kontak">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-3 rounded-2xl shadow-sm">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
            Menampilkan <span className="font-bold text-zinc-800 dark:text-zinc-200">{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}</span> - <span className="font-bold text-zinc-800 dark:text-zinc-200">{Math.min(currentPage * itemsPerPage, filteredContacts.length).toLocaleString()}</span> dari <span className="font-bold text-zinc-800 dark:text-zinc-200">{filteredContacts.length.toLocaleString()}</span> kontak
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Page indicator */}
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl disabled:opacity-40 transition-all cursor-pointer text-zinc-600 dark:text-zinc-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100 dark:bg-zinc-900/60">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preview Import CSV</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{importPreview.length} kontak terdeteksi</p>
              </div>
              <button onClick={() => setImportPreview(null)} disabled={importing} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {importPreview.slice(0, 50).map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <div className={`w-8 h-8 rounded-full ${avatarColor(r.phone)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(r.name || r.phone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{r.name || '—'}</p>
                    <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">{r.phone}</p>
                  </div>
                </div>
              ))}
              {importPreview.length > 50 && (
                <p className="px-5 py-3 text-[10px] text-zinc-400 text-center">... dan {importPreview.length - 50} kontak lainnya</p>
              )}
            </div>
            <div className="px-6 py-3 bg-amber-50 dark:bg-amber-500/5 border-t border-amber-100 dark:border-amber-500/20">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                <strong>Konfirmasi:</strong> Klik tombol Impor di bawah untuk memasukkan semua kontak yang dideteksi ke database device <strong>{activeChannel?.name}</strong>.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800">
              <button onClick={() => setImportPreview(null)} disabled={importing}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                Batal
              </button>
              <button onClick={handleImportSubmit} disabled={importing || !activeChannel}
                className="btn-primary px-5 py-2 font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                {importing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Mengimpor...
                  </>
                ) : (
                  'Impor Kontak'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
