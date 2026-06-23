export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  trial_count: number;
  subscription: Subscription | null;
}

export interface Channel {
  id: number;
  user_id: number;
  name: string;
  platform: 'whatsapp';
  target_id: string | null;
  status: 'active' | 'inactive' | 'error';
  last_used_at: string | null;
  created_at: string;
  credentials?: Record<string, any>;
}

export interface Broadcast {
  id: number;
  user_id: number;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'pdf' | 'document' | null;
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'failed' | 'scheduled';
  scheduled_at: string | null;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';
  sent_at: string | null;
  created_at: string;
  targets?: BroadcastTarget[];
  logs?: BroadcastLog[];
  total_logs?: number;
  sent_logs?: number;
  failed_logs?: number;
}

export interface BroadcastTarget {
  id: number;
  broadcast_id: number;
  channel_id: number;
  channel?: Channel;
}

export interface BroadcastLog {
  id: number;
  broadcast_id: number;
  channel_id: number;
  status: 'pending' | 'success' | 'failed';
  response: Record<string, unknown> | null;
  error: string | null;
  sent_at: string | null;
  channel?: Channel;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan: 'free' | 'daily' | 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
