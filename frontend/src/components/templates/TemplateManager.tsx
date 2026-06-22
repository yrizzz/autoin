import React, { useState, useEffect } from 'react';
import AdminLayout from '../layout/AdminLayout';
import { Plus, Search, FileText, Trash2, Edit3, MessageSquare, Copy, Check, Info } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  content: string;
  platform: 'all' | 'whatsapp';
  createdAt: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'Reminder Pembayaran',
    content: 'Halo {{nama}},\n\nIni adalah pengingat bahwa tagihan Anda sebesar {{tagihan}} akan jatuh tempo pada {{tanggal}}.\n\nSilakan lakukan pembayaran segera melalui link berikut: {{link}}.\n\nTerima kasih!',
    platform: 'whatsapp',
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: '3',
    title: 'Promo Diskon Mingguan',
    content: '🚨 PROMO SPESIAL AKHIR PEKAN! 🚨\n\nHalo Rekan {{nama}},\n\nDapatkan diskon hingga 50% untuk produk terpilih hanya minggu ini. Gunakan kode voucher: WEEKEND50.\n\nBelanja sekarang: {{link}}',
    platform: 'all',
    createdAt: '2026-06-18T08:00:00Z',
  }
];

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Custom delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<'all' | 'whatsapp'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('autoin_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('autoin_templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  const saveToStorage = (updated: Template[]) => {
    setTemplates(updated);
    localStorage.setItem('autoin_templates', JSON.stringify(updated));
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTitle('');
    setContent('');
    setPlatform('all');
    setModalOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setTitle(t.title);
    setContent(t.content);
    setPlatform(t.platform);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingTemplate) {
      const updated = templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, title, content, platform } 
          : t
      );
      saveToStorage(updated);
    } else {
      const newT: Template = {
        id: Date.now().toString(),
        title,
        content,
        platform,
        createdAt: new Date().toISOString()
      };
      saveToStorage([newT, ...templates]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const t = templates.find(item => item.id === id);
    if (t) {
      setTemplateToDelete(t);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    const updated = templates.filter(t => t.id !== templateToDelete.id);
    saveToStorage(updated);
    setDeleteConfirmOpen(false);
    setTemplateToDelete(null);
  };

  const insertVariable = (variable: string) => {
    setContent(prev => prev + ` {{${variable}}}`);
  };

  const handleCopy = (t: Template) => {
    navigator.clipboard.writeText(t.content);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.content.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = activePlatform === 'all' || t.platform === activePlatform;
    return matchesSearch && matchesPlatform;
  });

  return (
    <AdminLayout activePage="templates" title="Daftar Template">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Daftar Template Pesan
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kelola template pesan broadcast agar pengiriman pesan berulang menjadi lebih efisien.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Template Baru
        </button>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl w-full md:w-auto overflow-x-auto">
          {['all', 'whatsapp'].map((p) => (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all cursor-pointer ${
                activePlatform === p
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {p === 'all' ? 'Semua' : p}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Cari template..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tidak ada template ditemukan</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            Buat template pesan baru untuk mempercepat penulisan broadcast Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/30 hover:shadow-lg transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">{t.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`}>
                    WhatsApp
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-4 whitespace-pre-wrap font-sans bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/30">
                  {t.content}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4 mt-4">
                <span className="text-[10px] text-zinc-400">
                  {new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(t)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                    title="Salin Konten"
                  >
                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                    title="Edit Template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    title="Hapus Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100 dark:bg-zinc-900/60">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {editingTemplate ? 'Edit Template Pesan' : 'Buat Template Pesan Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nama Template
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengingat Pembayaran Bulanan"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Platform Tujuan
                  </label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 cursor-pointer"
                  >
                    <option value="all">Semua Platform</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Isi Pesan
                  </label>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500" /> Variabel dinamis didukung
                  </span>
                </div>
                <textarea
                  placeholder="Tulis pesan template Anda di sini..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-100 font-sans resize-none"
                  required
                />
              </div>

              {/* Variable Quick Insert */}
              <div>
                <span className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Sisipkan Variabel Cepat</span>
                <div className="flex flex-wrap gap-1.5">
                  {['nama', 'tagihan', 'tanggal', 'link', 'username'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-all cursor-pointer border border-transparent hover:border-blue-500/20"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-850"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-zinc-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-black/60 w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Hapus Template</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin menghapus template <strong>{templateToDelete?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmOpen(false); setTemplateToDelete(null); }}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition-all cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
