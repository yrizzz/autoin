import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { api } from '../../lib/api';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Info, 
  Loader2, 
  AlertTriangle, 
  ArrowRight,
  HelpCircle,
  Globe
} from 'lucide-react';

interface Template {
  id: number;
  title: string;
  content: string;
  platform: 'all' | 'whatsapp';
  created_at: string;
}

interface PlanLimits {
  plan: string;
  limits: { templates: number | null };
  usage: { broadcasts: number; channels: number };
}

function parseWhatsAppFormatting(text: string): string {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(/~(.*?)~/g, '<del>$1</del>');
  html = html.replace(/```(.*?)```/gs, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');
  html = html.replace(/\n/g, '<br />');
  return html;
}

function renderPreviewContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/\{\{nama\}\}/g, 'Budi')
    .replace(/\{\{tagihan\}\}/g, 'Rp 150.000')
    .replace(/\{\{tanggal\}\}/g, '25 Juni 2026')
    .replace(/\{\{link\}\}/g, 'https://autoin.link/pay/102')
    .replace(/\{\{username\}\}/g, 'budi_perkasa');
}

export default function TemplateManager() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<'all' | 'whatsapp'>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [showVarHelp, setShowVarHelp] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tmpl, lim] = await Promise.all([
        api.get<Template[]>('/api/templates'),
        api.get<PlanLimits>('/api/me/limits'),
      ]);
      setTemplates(tmpl);
      setLimits(lim);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const limitReached = limits
    ? limits.limits.templates !== null && templates.length >= limits.limits.templates
    : false;

  const handleOpenCreate = () => {
    if (limitReached) return;
    setEditingTemplate(null);
    setTitle(''); setContent(''); setPlatform('all'); setError('');
    setShowVarHelp(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setTitle(t.title); setContent(t.content); setPlatform(t.platform); setError('');
    setShowVarHelp(false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingTemplate) {
        const updated = await api.put<Template>(`/api/templates/${editingTemplate.id}`, { title, content, platform });
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updated : t));
      } else {
        const created = await api.post<Template>('/api/templates', { title, content, platform });
        setTemplates(prev => [created, ...prev]);
        if (limits) setLimits({ ...limits, usage: { ...limits.usage } });
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message ?? 'Gagal menyimpan template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (t: Template) => {
    setTemplateToDelete(t);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await api.delete(`/api/templates/${templateToDelete.id}`);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
    } catch {}
    setDeleteConfirmOpen(false);
    setTemplateToDelete(null);
  };

  const insertVariable = (v: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent(prev => prev + ` {{${v}}}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const varText = ` {{${v}}}`;
    const before = text.substring(0, start);
    const after = text.substring(end);
    setContent(before + varText + after);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + varText.length, start + varText.length);
    }, 0);
  };

  const applyFormat = (type: 'bold' | 'italic' | 'strike' | 'code') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    let prefix = '';
    let suffix = '';
    if (type === 'bold') { prefix = '*'; suffix = '*'; }
    else if (type === 'italic') { prefix = '_'; suffix = '_'; }
    else if (type === 'strike') { prefix = '~'; suffix = '~'; }
    else if (type === 'code') { prefix = '```'; suffix = '```'; }

    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + prefix + selectedText + suffix + after;
    setContent(newContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const handleCopy = (t: Template) => {
    navigator.clipboard.writeText(t.content);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = templates.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.content.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = activePlatform === 'all' || t.platform === activePlatform;
    return matchSearch && matchPlatform;
  });

  return (
    <AdminLayout activePage="templates" title="Daftar Template">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Daftar Template Pesan
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola template pesan broadcast agar pengiriman berulang menjadi lebih efisien.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Limit badge */}
          {limits && limits.limits.templates !== null && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
              limitReached
                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
            }`}>
              {templates.length} / {limits.limits.templates} template
            </span>
          )}

          <button
            onClick={handleOpenCreate}
            disabled={limitReached}
            className="btn-primary flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Template Baru
          </button>
        </div>
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            Batas 1 template gratis tercapai. Upgrade untuk menyimpan lebih banyak template.
          </p>
          <a href="/subscription" className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
            Upgrade <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl w-full md:w-auto overflow-x-auto">
          {['all', 'whatsapp'].map(p => (
            <button key={p} onClick={() => setActivePlatform(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all cursor-pointer ${
                activePlatform === p
                  ? 'tab-active shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {p === 'all' ? 'Semua' : p}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Cari template..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {search ? 'Template tidak ditemukan' : 'Belum ada template'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            {search ? 'Coba kata kunci lain.' : 'Buat template baru untuk mempercepat penulisan broadcast Anda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/30 hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{t.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    t.platform === 'whatsapp' ? 'badge-emerald-gradient' : 'badge-gradient'
                  }`}>
                    {t.platform === 'all' ? 'Semua' : 'WhatsApp'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-4 whitespace-pre-wrap font-sans bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/30">
                  {t.content}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4 mt-4">
                <span className="text-[10px] text-zinc-400">
                  {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleCopy(t)} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer" title="Salin">
                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleOpenEdit(t)} className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(t)} className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal (Premium 2-column layout with WhatsApp formatting & simulator preview) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                {editingTemplate ? '✍️ Edit Template Pesan' : '✨ Buat Template Pesan Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold cursor-pointer transition-colors">Tutup</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT COLUMN: EDITOR */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nama Template</label>
                      <input type="text" placeholder="Contoh: Pengingat Pembayaran" value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100" required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Platform</label>
                      <select value={platform} onChange={e => setPlatform(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer">
                        <option value="all">Semua Platform</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Isi Pesan</label>
                      <button type="button" onClick={() => setShowVarHelp(prev => !prev)}
                        className="text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                        <Info className="w-3.5 h-3.5" /> Panduan Variabel
                      </button>
                    </div>

                    {/* Formatter Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <button type="button" onClick={() => applyFormat('bold')} className="w-8 h-8 flex items-center justify-center text-xs font-extrabold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all cursor-pointer" title="Tebal (Bold)">B</button>
                      <button type="button" onClick={() => applyFormat('italic')} className="w-8 h-8 flex items-center justify-center text-xs italic font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all cursor-pointer" title="Miring (Italic)">I</button>
                      <button type="button" onClick={() => applyFormat('strike')} className="w-8 h-8 flex items-center justify-center text-xs line-through text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all cursor-pointer" title="Coret">S</button>
                      <button type="button" onClick={() => applyFormat('code')} className="px-2.5 h-8 flex items-center justify-center text-[10px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all cursor-pointer" title="Code Format">&lt;/&gt;</button>
                      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1.5" />
                      <span className="text-[9px] text-zinc-400 select-none">Sorot kata lalu pilih gaya</span>
                    </div>

                    {/* Textarea */}
                    <textarea ref={textareaRef} placeholder="Tulis pesan template di sini..." value={content} onChange={e => setContent(e.target.value)} rows={7}
                      className="w-full px-4 py-3.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 resize-none leading-relaxed shadow-inner" required />
                  </div>

                  {/* Variable Buttons */}
                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Sisipkan Variabel Dinamis</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['nama', 'tagihan', 'tanggal', 'link', 'username'].map(v => (
                        <button key={v} type="button" onClick={() => insertVariable(v)}
                          className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-650 dark:text-zinc-300 rounded-xl hover:text-blue-500 hover:border-blue-500/30 transition-all cursor-pointer">
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline Help Card */}
                  {showVarHelp && (
                    <div className="p-4 bg-blue-500/[0.03] border border-blue-500/15 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] uppercase tracking-wider">
                        <Info className="w-4 h-4" /> Panduan Sumber Variabel Dinamis
                      </div>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-400 leading-relaxed">
                        Variabel dinamis memungkinkan pesan disesuaikan otomatis untuk tiap penerima. Placeholder akan diganti berdasarkan metode pengiriman:
                      </p>
                      <div className="space-y-2 text-[10px]">
                        <div className="flex items-start gap-1">
                          <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{nama}}"}</code>
                          <span className="text-zinc-550 dark:text-zinc-400">
                            — <strong>Otomatis:</strong> Diambil langsung dari data nama kontak WhatsApp HP Anda.
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{tagihan}}"}</code>
                          <span className="text-zinc-550 dark:text-zinc-400">
                            — <strong>API / Integrasi:</strong> Nominal tagihan (contoh: <code>Rp 150.000</code>) diisi secara real-time via payload <strong>API Autoin</strong>.
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{tanggal}}"}</code>
                          <span className="text-zinc-550 dark:text-zinc-400">
                            — <strong>API / Integrasi:</strong> Tanggal jatuh tempo diisi via payload API Autoin.
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{link}}"}</code>
                          <span className="text-zinc-550 dark:text-zinc-400">
                            — <strong>API / Integrasi:</strong> URL link unik invoice/pembayaran per pelanggan dikirim via payload API Autoin.
                          </span>
                        </div>
                        <div className="flex items-start gap-1">
                          <code className="text-blue-600 dark:text-blue-400 font-bold font-mono">{"{{username}}"}</code>
                          <span className="text-zinc-550 dark:text-zinc-400">
                            — <strong>API / Integrasi:</strong> ID akun/username pelanggan di sistem Anda dikirim via payload API Autoin.
                          </span>
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-450 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                        <strong>Catatan:</strong> Jika mengirim broadcast manual via dashboard, variabel billing (tagihan, tanggal, link, username) akan dikosongkan atau menggunakan data simulasi karena WhatsApp hanya sinkron data Nama & Telepon. Gunakan API Autoin untuk pesan tagihan otomatis dari billing web/sistem Anda.
                      </div>
                    </div>
                  )}

                </div>

                {/* RIGHT COLUMN: PREVIEW PANEL */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pratinjau Live WhatsApp</span>
                    
                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[380px] relative">
                      {/* WA Header */}
                      <div className="bg-[#075e54] dark:bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3 text-white shrink-0">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs shrink-0 font-bold">💬</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">AUTOIN Template Preview</div>
                          <div className="text-[9px] opacity-80 mt-0.5">Online</div>
                        </div>
                      </div>

                      {/* WA Chat Wallpaper */}
                      <div className="flex-1 overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                        <div className="min-h-full flex flex-col justify-end">
                          <div className="max-w-[90%] self-end bg-[#dcf8c6] dark:bg-[#005c4b] border border-[#d2f3b7]/30 rounded-xl rounded-tr-none p-3 shadow-xs text-zinc-800 dark:text-zinc-100 flex flex-col gap-1.5 relative">
                            <div className="text-xs whitespace-pre-wrap leading-relaxed break-words pr-10 pb-0.5"
                              dangerouslySetInnerHTML={{ __html: parseWhatsAppFormatting(renderPreviewContent(content) || 'Tulis isi template untuk memunculkan pratinjau live...') }} />

                            <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[8px] text-zinc-400 dark:text-zinc-300 select-none">
                              <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              <svg className="w-2.5 h-2.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800/60 mt-4">
                    <button type="button" onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800">
                      Batal
                    </button>
                    <button type="submit" disabled={saving}
                      className="btn-primary px-5 py-2.5 font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-60">
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan Template
                    </button>
                  </div>

                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Template</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Hapus template <strong>{templateToDelete?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirmOpen(false); setTemplateToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                Batal
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
