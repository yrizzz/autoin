import React, { useEffect, useState } from 'react';
import { api, getApiUrl } from '../../lib/api';
import type { User } from '../../types';
import {
  LayoutDashboard, Send, History, LogOut, User as UserIcon,
  RefreshCw, Bell, ChevronRight, Menu, X, Sun, Moon,
  Users, Smartphone, FileText, Rocket,
  Calendar, Cpu, Link, Lock, Tag, Receipt, Key, BookOpen, Heart, Zap, Settings, Ticket, Layers, Puzzle, Clock, Activity, MessageSquare
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  title: string;
  noPadding?: boolean;
  /** Batasi lebar konten (max-w-6xl) — default-nya full width agar proporsional di layar besar. */
  boxed?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function getGoogleAuthUrl() { return `${getApiUrl()}/auth/google`; }


function md5(string: string) {
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX: number, lY: number) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }
  function F(x: number, y: number, z: number) { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number) { return (x ^ y ^ z); }
  function I(x: number, y: number, z: number) { return (y ^ (x | (~z))); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function ConvertToWordArray(string: string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue: number) {
    var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  function Utf8Encode(string: string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }
  var x = Array();
  var k, S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  string = Utf8Encode(string);
  x = ConvertToWordArray(string);
  var a = 0x67452301;
  var b = 0xEFCDAB89;
  var c = 0x98BADCFE;
  var d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    var AA = a;
    var BB = b;
    var CC = c;
    var DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }
  var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
  return temp.toLowerCase();
}

const formatDisplayName = (name: string) => {
  return name;
};

const getAvatarUrl = (user: User | null) => {
  if (!user) return '';
  if (user.avatar) return user.avatar;
  const hash = md5(user.email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=mp`;
};

const renderMockPreview = () => {
  return (
    <div className="w-full space-y-6 p-4">
      {/* Fake Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Broadcasts', value: '124,580', desc: '+12% dari bulan lalu', icon: Rocket, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Deliverability Rate', value: '98.9%', desc: 'Sangat Stabil', icon: Activity, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Device Terkoneksi', value: '8 / 8', desc: 'Semua aktif', icon: Smartphone, color: 'text-cyan-500 bg-cyan-500/10' },
          { label: 'API Success Rate', value: '99.4%', desc: '1.2M requests', icon: Zap, color: 'text-purple-500 bg-purple-500/10' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black text-zinc-455 dark:text-zinc-500 block tracking-wider">{stat.label}</span>
                <span className="text-xl font-black text-zinc-800 dark:text-white block mt-1">{stat.value}</span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-550 block mt-1">{stat.desc}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fake Chart / Mid section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              Statistik Pengiriman 7 Hari Terakhir
            </span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">Diperbarui 1 menit lalu</span>
          </div>
          {/* SVG Wave chart */}
          <div className="h-32 w-full flex items-end">
            <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,80 Q30,40 60,60 T120,30 T180,70 T240,40 T300,10 L300,100 L0,100 Z" fill="url(#chartGrad)"/>
              <path d="M0,80 Q30,40 60,60 T120,30 T180,70 T240,40 T300,10" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 p-5 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Status Akun Anda</span>
          <div className="space-y-3">
            {[
              { label: 'Paket Berlangganan', value: 'Enterprise VIP' },
              { label: 'Masa Aktif', value: 'Selamanya' },
              { label: 'Limit Kuota Bulanan', value: 'Unlimited / Unlimited' },
            ].map((row, idx) => (
              <div key={idx} className="flex justify-between text-[11px] border-b border-zinc-200/30 dark:border-zinc-800/30 pb-2">
                <span className="text-zinc-400">{row.label}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fake Table */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200/40 dark:border-zinc-800/40 flex justify-between items-center bg-zinc-100/30 dark:bg-zinc-900/30">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Riwayat Pesan Broadcast Terakhir</span>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Menampilkan 5 data terbaru</span>
        </div>
        <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 text-[11px] p-2">
          {[
            { user: 'Aris Edy H', phone: '6281296451xxx', msg: 'Terima kasih telah bergabung di layanan VIP kami...', status: 'SENT', time: '10:24' },
            { user: 'Budi Santoso', phone: '6285710294xxx', msg: 'Promo Weekend Sale diskon hingga 50% untuk Anda...', status: 'SENT', time: '09:15' },
            { user: 'Dewi Lestari', phone: '6289938217xxx', msg: 'Pemberitahuan: Sistem maintenance berkala malam ini...', status: 'SENT', time: 'Yesterday' },
            { user: 'Ahmad Fauzi', phone: '6281398213xxx', msg: 'Kode verifikasi OTP keamanan Anda adalah 558109...', status: 'SENT', time: '2 days ago' },
          ].map((row, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-zinc-100/15 dark:hover:bg-zinc-800/15 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[13px]">
                  {row.user[0]}
                </div>
                <div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{row.user}</span>
                  <span className="text-[9px] text-zinc-400 block">{row.phone}</span>
                </div>
              </div>
              <span className="text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">{row.msg}</span>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-black tracking-wider">{row.status}</span>
                <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {row.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function AdminLayout({ children, activePage, title, noPadding, boxed, onRefresh, refreshing }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; time: string; read: boolean }>>([]);
  const [announcement, setAnnouncement] = useState<{ text: string; type: 'info' | 'warning' | 'success' } | null>(null);
  const [loginAgreed, setLoginAgreed] = useState(true);

  const hasUnread = notifications.some(n => !n.read);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('token');
      if (tokenFromUrl) {
        localStorage.setItem('autoin_token', tokenFromUrl);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    const token = localStorage.getItem('autoin_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get<User>('/api/me')
      .then(res => {
        setUser(res);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err && (err.status === 401 || err.status === 403)) {
          localStorage.removeItem('autoin_token');
        }
        setLoading(false);
      });

    api.get<any>('/api/announcement')
      .then(res => {
        if (res && res.text) {
          setAnnouncement(res);
        }
      })
      .catch(() => { });

    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = savedTheme || 'dark';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
    document.documentElement.style.colorScheme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  };

  const handleGoogleLogin = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!loginAgreed) {
      e.preventDefault();
      alert('Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi terlebih dahulu.');
    }
  };

  const handleLogout = async () => {
    try { await api.post('/api/logout'); } catch { }
    localStorage.removeItem('autoin_token');
    window.location.href = '/';
  };

  const settingsItems = [
    { id: 'pricing', label: 'Daftar Harga', icon: Tag, href: '/#pricing' },
    { id: 'subscription', label: 'Berlangganan', icon: Receipt, href: '/subscription' },
    { id: 'api_key', label: 'API Key', icon: Key, href: '/api-key' },
    { id: 'api_docs', label: 'Dokumentasi API', icon: BookOpen, href: '/docs' },
  ];
  if (user?.email?.toLowerCase() === 'arisedyhandoko@gmail.com') {
    settingsItems.unshift({ id: 'admin_plugins', label: 'Kelola Plugin', icon: Puzzle, href: '/admin-plugins' });
    settingsItems.unshift({ id: 'admin_monitor', label: 'Monitor Aktivitas', icon: Activity, href: '/admin-monitor' });
    settingsItems.unshift({ id: 'promo_codes', label: 'Kode Promo', icon: Ticket, href: '/promo-codes' });
    settingsItems.unshift({ id: 'users', label: 'Daftar Pelanggan', icon: Users, href: '/users' });
    settingsItems.unshift({ id: 'admin_settings', label: 'Sistem Admin', icon: Settings, href: '/admin-settings' });
  }
  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'channels', label: 'Device Connected', icon: Smartphone, href: '/channels' },
        { id: 'contacts', label: 'Grup Kontak', icon: Users, href: '/contacts' },
        { id: 'templates', label: 'Template Pesan', icon: FileText, href: '/templates' },
        { id: 'broadcast', label: 'Broadcast Pesan', icon: Rocket, href: '/broadcast' },
        { id: 'schedule', label: 'Jadwal Broadcast', icon: Calendar, href: '/schedule' },
        { id: 'schedule_status', label: 'Jadwal Status WA', icon: Layers, href: '/schedule-status' },
      ]
    },
    {
      title: null,
      items: [
        { id: 'quick_send', label: 'Kirim Cepat', icon: Send, href: '/quick-send' },
        { id: 'single_message_history', label: 'Riwayat Pesan', icon: Clock, href: '/single-message-history' },
        { id: 'group_tag', label: 'Setting Auto Tag Member', icon: Tag, href: '/group-tag' },
        { id: 'chatbot', label: 'Chatbot (Auto Reply)', icon: Cpu, href: '/chatbot' },
        { id: 'plugins', label: 'Plugin / Extension', icon: Puzzle, href: '/plugins' },
        { id: 'webhook', label: 'Webhook App', icon: Link, href: '/webhook' },
        { id: 'history', label: 'Riwayat Broadcast', icon: History, href: '/broadcast/history' },
      ]
    },
    { title: 'PENGATURAN', items: settingsItems }
  ];

  const mobileNav = [
    { id: 'dashboard', icon: LayoutDashboard, href: '/dashboard', label: 'Home' },
    { id: 'broadcast', icon: Rocket, href: '/broadcast', label: 'Broadcast' },
    { id: 'channels', icon: Smartphone, href: '/channels', label: 'Device' },
    { id: 'sidebar', icon: Menu, href: '#', label: 'Menu' },
  ];

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      <div className="h-16 px-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#09090b]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <img src="/autoin-logo.webp" alt="AUTOIN" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white uppercase leading-none block">AUTOIN</span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium leading-none">Workspace Admin</span>
          </div>
        </div>
        {onNav && (
          <button onClick={onNav} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4 bg-white dark:bg-[#09090b]">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.title && (
              <div className="px-3 pt-1 pb-1.5 text-[11px] font-extrabold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                {group.title}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              let active = activePage === item.id;
              if (item.id === 'subscription' && activePage === 'invoice') {
                active = true;
              }
              if (item.id === 'users' && activePage === 'subscribers') {
                active = true;
              }
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={onNav}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${active
                      ? 'nav-active-item'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
            {gi < navGroups.length - 1 && (
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800/60 !mt-3" />
            )}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-3 space-y-2">
        <a
          href="https://wa.me/6281296451923"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/10 rounded-xl transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
          Hubungi Support (WA)
        </a>

        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                <img src={getAvatarUrl(user)} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                  {formatDisplayName(user.name)}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/10 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Sesi
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <a
              href={getGoogleAuthUrl()}
              onClick={handleGoogleLogin}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold border rounded-xl transition-all shadow-xs cursor-pointer ${
                loginAgreed 
                  ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.647 11-11.19 0-.756-.08-1.333-.177-1.905H12.24z" /></svg>
              Masuk dengan Google
            </a>
            
            <div className="flex items-start gap-2 px-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                id="agree-sidebar"
                checked={loginAgreed}
                onChange={(e) => setLoginAgreed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 dark:border-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="agree-sidebar" className="cursor-pointer select-none leading-relaxed">
                Saya menyetujui <a href="/terms" target="_blank" className="text-blue-500 hover:underline font-bold">Syarat & Ketentuan</a> dan <a href="/privacy" target="_blank" className="text-blue-500 hover:underline font-bold">Kebijakan Privasi</a>
              </label>
            </div>
          </div>
        )}


      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 font-sans flex antialiased transition-colors duration-200 overflow-x-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] fixed top-0 bottom-0 left-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[220px] flex flex-col bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent onNav={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[220px] min-h-screen">

        {/* Top Header */}
        <header className="h-14 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between shadow-sm dark:shadow-none transition-colors duration-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-semibold min-w-0">
              <span className="text-zinc-400 dark:text-zinc-500 shrink-0">AUTOIN</span>
              <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
              <span className="text-zinc-800 dark:text-zinc-200 font-bold truncate">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
                      <span className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Notifikasi</span>
                      {hasUnread && (
                        <button onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))} className="text-xs text-blue-500 font-bold hover:underline cursor-pointer">
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => { setNotifications(notifications.map(i => i.id === n.id ? { ...i, read: true } : i)); setNotifOpen(false); }}
                          className={`px-4 py-3 flex flex-col gap-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/60 dark:bg-blue-500/[0.04]' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-bold truncate ${!n.read ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>{n.title}</span>
                            <span className="text-[11px] text-zinc-400 shrink-0">{n.time}</span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-1.5 border-l border-zinc-200 dark:border-zinc-800 ml-0.5">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                    <img src={getAvatarUrl(user)} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-right hidden lg:block">
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">
                      {formatDisplayName(user.name)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <input
                      type="checkbox"
                      id="agree-header"
                      checked={loginAgreed}
                      onChange={(e) => setLoginAgreed(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="agree-header" className="cursor-pointer select-none">
                      Setuju <a href="/terms" target="_blank" className="text-blue-500 hover:underline">TOS & Privasi</a>
                    </label>
                  </div>
                  <a
                    href={getGoogleAuthUrl()}
                    onClick={handleGoogleLogin}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg transition-all shadow-xs cursor-pointer ${
                      loginAgreed
                        ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                        : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.647 11-11.19 0-.756-.08-1.333-.177-1.905H12.24z" /></svg>
                    Masuk
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className={
          noPadding
            ? 'flex-1 flex flex-col overflow-hidden'
            : boxed
              ? 'flex-1 py-6 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full relative'
              : 'flex-1 py-6 px-4 sm:px-6 md:px-8 w-full relative'
        }>
          {announcement && (
            <div className={`mb-6 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xs ${announcement.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450'
                : announcement.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-450'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-450'
              }`}>
              <div className="flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 shrink-0" />
                <span>{announcement.text}</span>
              </div>
            </div>
          )}
          
          {(() => {
            const isPublic = activePage === 'api_docs' || (typeof window !== 'undefined' && (window.location.pathname.includes('/docs') || window.location.pathname.includes('/plugin-docs')));
            
            if (!user && !loading && !isPublic) {
              return (
                <div className="relative w-full min-h-[580px] flex items-center justify-center py-6 px-4 overflow-hidden rounded-3xl">
                  {/* Blurred Mock Preview Background */}
                  <div className="absolute inset-0 w-full h-full filter blur-[8px] opacity-40 dark:opacity-25 pointer-events-none select-none scale-[1.01] overflow-hidden">
                    {renderMockPreview()}
                  </div>

                  {/* Glassmorphic Login Card */}
                  <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-[#0e0e11]/85 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden group">
                    {/* Visual background accents */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/[0.03] dark:bg-purple-500/[0.05] rounded-full blur-2xl pointer-events-none" />

                    {/* Lock Icon with Gradient */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>

                    {/* Heading */}
                    <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-display mb-3">
                      Sesi Anda Telah Berakhir
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed mb-8">
                      Untuk alasan keamanan dan kenyamanan, silakan masuk menggunakan akun Google Anda kembali guna melanjutkan akses ke dashboard AUTOIN.
                    </p>

                    {/* Terms Acceptance checkbox */}
                    <div className="flex items-start gap-2.5 text-left bg-zinc-50/70 dark:bg-zinc-950/75 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 mb-6">
                      <input
                        type="checkbox"
                        id="agree-restricted"
                        checked={loginAgreed}
                        onChange={(e) => setLoginAgreed(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-300 dark:border-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="agree-restricted" className="cursor-pointer select-none text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Saya menyetujui <a href="/terms" target="_blank" className="text-blue-500 hover:underline font-bold">Syarat & Ketentuan</a> dan <a href="/privacy" target="_blank" className="text-blue-500 hover:underline font-bold">Kebijakan Privasi</a> yang berlaku.
                      </label>
                    </div>

                    {/* Google Login Button */}
                    <a
                      href={getGoogleAuthUrl()}
                      onClick={handleGoogleLogin}
                      className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 text-xs font-bold border rounded-2xl transition-all shadow-md active:scale-[0.99] ${
                        loginAgreed
                          ? 'bg-gradient-brand hover:opacity-95 text-white border-transparent cursor-pointer'
                          : 'text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.92 1 1 5.92 1 12s4.92 11 11.24 11c6.6 0 11-4.647 11-11.19 0-.756-.08-1.333-.177-1.905H12.24z" />
                      </svg>
                      Masuk dengan Google
                    </a>
                  </div>
                </div>
              );
            }
            
            return children;
          })()}
        </main>

        {/* Universal Footer */}
        <footer className="hidden md:flex w-full h-14 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
              <img src="/autoin-logo.webp" alt="AUTOIN" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-wider">AUTOIN</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">v2.0.0</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Crafted by</span>
            <a href="https://yrizzz.my.id" target="_blank" rel="noopener noreferrer" className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline">YrizzzDev</a>
            <span>·</span>
            <span>Built with</span>
            <Heart className="w-3 h-3 text-red-500 fill-current mx-0.5" />
            <span>in Indonesia</span>
          </div>
        </footer>

        {/* Mobile bottom nav spacer inside main column */}
        <div className="md:hidden h-24 shrink-0" />
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[72px]">
          {mobileNav.map(item => {
            const Icon = item.icon;
            let active = activePage === item.id;
            if (item.id === 'broadcast') {
              active = ['broadcast', 'history', 'schedule', 'schedule_status', 'templates'].includes(activePage);
            }
            if (item.id === 'dashboard') {
              active = ['dashboard', 'quick_send', 'chatbot', 'plugins', 'webhook'].includes(activePage);
            }
            if (item.id === 'sidebar') {
              return (
                <button
                  key="sidebar"
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center w-16 h-full py-1 cursor-pointer"
                >
                  <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-bold mt-1.5 ${active ? 'text-blue-600' : 'text-zinc-450 dark:text-zinc-400'}`}>{item.label}</span>
                </button>
              );
            }
            return (
              <a
                key={item.id}
                href={item.href}
                className="flex flex-col items-center justify-center w-16 h-full py-1"
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-600 shadow-sm shadow-blue-500/30' : ''}`}>
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-400'}`} />
                </div>
                <span className={`text-[9px] font-bold mt-1.5 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-450 dark:text-zinc-400'}`}>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
