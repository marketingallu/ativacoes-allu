export type ActivationType =
  | 'whatsapp'
  | 'email'
  | 'instagram_story'
  | 'instagram_post'
  | 'app_push';

export interface DispatchSchedule {
  time: string;
  volume: number;
}

export interface Activation {
  id: string;
  date: string;
  type: ActivationType;
  description: string | null;
  segment: string | null;
  segment_volume: number | null;
  intercom_tag: string | null;
  dispatch_schedules: DispatchSchedule[];
  coupon: string | null;
  offer_condition: string | null;
  offer_trigger: string | null;
  focus_product: string | null;
  offer_category: string | null;
  image_url: string | null;
  copy: string | null;
  created_at: string;
}

export const TYPE_LABELS: Record<ActivationType, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram_story: 'Story (Instagram)',
  instagram_post: 'Post (Instagram)',
  app_push: 'Push (App)',
};

export const TYPE_COLORS: Record<ActivationType, string> = {
  whatsapp: '#25D366',
  email: '#4A90D9',
  instagram_story: '#E1306C',
  instagram_post: '#833AB4',
  app_push: '#FF9500',
};
