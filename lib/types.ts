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

export interface DispatchResult {
  sent?: number;
  delivered?: number;
  read?: number;
  replied?: number;
  gross_sales?: number;
  net_sales?: number;
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
  hubspot_flow_url: string | null;
  template_name: string | null;
  is_fup: boolean;
  parent_activation_id: string | null;
  parent_date: string | null;
  fup_target_leads: string | null;
  dispatch_category: 'regular' | 'cross_sell' | null;
  base_temperature: 'frio' | 'morno' | 'quente' | null;
  results: DispatchResult | null;
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
  whatsapp: '#4bd184',
  email: '#3498db',
  instagram_story: '#d85ab9',
  instagram_post: '#d85ab9',
  app_push: '#f78639',
};
