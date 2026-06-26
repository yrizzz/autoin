import type { User } from '../types';

export type Announcement = { text: string; type: 'info' | 'warning' | 'success' } | null;
export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  created_at: string;
};

/**
 * Cache sesi tingkat-modul. Objek ini bertahan selama runtime JS hidup —
 * artinya ikut bertahan antar navigasi <ClientRouter /> (tanpa reload), dan
 * otomatis hilang saat full reload (logout / OAuth callback). Persis perilaku
 * stale-while-revalidate yang kita mau: render instan dari cache, lalu
 * revalidasi di background tiap pindah halaman.
 */
export const sessionCache: {
  loaded: boolean;
  user: User | null;
  announcement: Announcement;
  notifications: AppNotification[];
} = {
  loaded: false,
  user: null,
  announcement: null,
  notifications: [],
};
