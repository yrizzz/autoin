import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  LogOut, 
  User as UserIcon, 
  RefreshCw, 
  Bell,
  ChevronRight,
  Menu,
  X,
  Radio,
  Globe,
  Sun,
  Moon,
  MessageSquare,
  Users,
  Smartphone,
  FileText,
  Rocket,
  Calendar,
  Cpu,
  Link,
  Tag,
  Receipt,
  PlayCircle,
  Key
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  title: string;
  noPadding?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminLayout({ children, activePage, title, noPadding, onRefresh, refreshing }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarChats, setSidebarChats] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Broadcast Sukses', message: 'Campaign #1024 terkirim ke 150 kontak.', time: '5m lalu', read: false },
    { id: 2, title: 'Telegram Terputus', message: 'Sesi Telegram Bot Anda memerlukan autentikasi ulang.', time: '1j lalu', read: true },
    { id: 3, title: 'Kontak Tersinkron', message: '54 kontak baru berhasil diimpor dari WhatsApp.', time: '3j lalu', read: true },
  ]);

  const hasUnread = notifications.some(n => !n.read);

  useEffect(() => {
    api.get<User>('/api/me')
      .then(setUser)
      .catch((err) => console.error('Gagal mengambil data user:', err));

    // Handle theme initialization
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const loadChats = () => {
      api.get<any[]>('/api/channels')
        .then(channels => {
          const activeWa = channels.find(c => c.platform === 'whatsapp' && c.status === 'active');
          if (activeWa) {
            api.get<{ chats: any[] }>(`/api/whatsapp/${activeWa.id}/chats`)
              .then(res => {
                setSidebarChats((res.chats || []).slice(0, 3));
              })
              .catch(() => {
                setSidebarChats([
                  { name: 'Budi Santoso', lastMessage: 'Halo bro, besok rapat...', unread: 2 },
                  { name: 'Siti Rahma', lastMessage: 'Siap, terima kasih...', unread: 0 },
                  { name: 'Andi Wijaya', lastMessage: 'Broadcast sukses...', unread: 0 }
                ]);
              });
          } else {
            setSidebarChats([
              { name: 'Budi Santoso', lastMessage: 'Halo bro, besok rapat...', unread: 2 },
              { name: 'Siti Rahma', lastMessage: 'Siap, terima kasih...', unread: 0 },
              { name: 'Andi Wijaya', lastMessage: 'Broadcast sukses...', unread: 0 }
            ]);
          }
        })
        .catch(() => {
          setSidebarChats([
            { name: 'Budi Santoso', lastMessage: 'Halo bro, besok rapat...', unread: 2 },
            { name: 'Siti Rahma', lastMessage: 'Siap, terima kasih...', unread: 0 },
            { name: 'Andi Wijaya', lastMessage: 'Broadcast sukses...', unread: 0 }
          ]);
        });
    };

    loadChats();
    const interval = setInterval(loadChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
      localStorage.removeItem('autoin_token');
      window.location.href = '/';
    } catch {
      localStorage.removeItem('autoin_token');
      window.location.href = '/';
    }
  };

  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'channels', label: 'Device Broadcast', icon: Smartphone, href: '/channels' },
        { id: 'contacts', label: 'Grup Kontak', icon: Users, href: '/contacts' },
        { id: 'templates', label: 'Daftar template', icon: FileText, href: '#' },
        { id: 'broadcast', label: 'Broadcast Pesan', icon: Rocket, href: '/broadcast' },
        { id: 'schedule', label: 'Jadwal Broadcast', icon: Calendar, href: '#' },
        { id: 'chats', label: 'Obrolan Aktif', icon: MessageSquare, href: '/chats' },
      ]
    },
    {
      title: null,
      items: [
        { id: 'quick_send', label: 'Kirim Cepat', icon: Send, href: '#' },
        { id: 'chatbot', label: 'Chatbot (Auto Reply)', icon: Cpu, href: '#' },
        { id: 'webhook', label: 'Webhook App', icon: Link, href: '#' },
        { id: 'history', label: 'History Pesan', icon: History, href: '/broadcast/history' },
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { id: 'pricing', label: 'Daftar Harga', icon: Tag, href: '/#pricing' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, href: '#' },
        { id: 'tutorial', label: 'Video Tutorial', icon: PlayCircle, href: '#' },
        { id: 'api_key', label: 'API Key', icon: Key, href: '#' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 font-sans flex antialiased transition-colors duration-200">
      {/* Background soft blue radial glow */}
      <div className="absolute top-0 left-1/4 w-[1000px] h-[300px] bg-blue-500/[0.02] dark:bg-blue-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5 bg-zinc-50/50 dark:bg-[#09090b]">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Radio className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white uppercase">AUTOIN</span>
            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium block -mt-1 uppercase">Workspace Admin</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 px-4 overflow-y-auto space-y-3 bg-white dark:bg-[#09090b]">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {group.title && (
                <div className="px-4 pt-2 pb-1.5 text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/10' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
              {groupIdx < navGroups.length - 1 && (
                <div className="my-2 border-t border-zinc-100 dark:border-zinc-800/60" />
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#0c0c0e]/50">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/25 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate leading-none">{user?.name ?? 'Loading...'}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate leading-none mt-1">{user?.email ?? ''}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/10 bg-red-50 dark:bg-red-500/5 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <aside className="w-64 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 flex flex-col animate-slideIn">
            <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-[#09090b]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Radio className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white uppercase">AUTOIN</span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium block -mt-1">Workspace Admin</span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 px-4 overflow-y-auto space-y-3 bg-white dark:bg-[#09090b]">
              {navGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-1">
                  {group.title && (
                    <div className="px-4 pt-2 pb-1.5 text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                            isActive 
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/10' 
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                          <span>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                  {groupIdx < navGroups.length - 1 && (
                    <div className="my-2 border-t border-zinc-100 dark:border-zinc-800/60" />
                  )}
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0c0c0e]/50">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate leading-none">{user?.name ?? 'Loading...'}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate leading-none mt-1">{user?.email ?? ''}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/10 bg-red-50 dark:bg-red-500/5 rounded-lg transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Section Title */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-500">AUTOIN</span>
              <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
              <span className="text-zinc-800 dark:text-zinc-200 font-bold">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            <div className="relative">
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all relative cursor-pointer"
                title="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
                      <span className="text-[10px] font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Notifikasi</span>
                      {hasUnread && (
                        <button 
                          onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                          className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            setNotifications(notifications.map(item => item.id === n.id ? { ...item, read: true } : item));
                            setNotifOpen(false);
                          }}
                          className={`p-3.5 flex flex-col gap-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${!n.read ? 'bg-blue-500/[0.02] dark:bg-blue-500/[0.03]' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold ${!n.read ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>{n.title}</span>
                            <span className="text-[9px] text-zinc-400">{n.time}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            {/* User display */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">{user?.name ?? 'Admin'}</div>
                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-none mt-1">Workspace Admin</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className={noPadding ? 'flex-1 flex flex-col overflow-hidden' : 'flex-1 py-8 px-6 md:px-8 max-w-7xl mx-auto w-full relative z-10 transition-colors duration-200'}>
          {children}
        </main>
      </div>
    </div>
  );
}
