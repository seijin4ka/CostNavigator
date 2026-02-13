// システム設定の型定義
export interface SystemSettings {
  id: string;
  brand_name: string;
  primary_partner_slug: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  created_at: string;
  updated_at: string;
}

// システム設定の内部型（JWT_SECRETを含む）
export interface SystemSettingsInternal extends SystemSettings {
  jwt_secret: string | null;
}

// システム設定更新リクエスト
export interface UpdateSystemSettingsRequest {
  brand_name?: string;
  primary_partner_slug?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  footer_text?: string;
}
