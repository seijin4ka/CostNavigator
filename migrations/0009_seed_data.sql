-- 初期データのシード

-- 製品カテゴリ
INSERT INTO product_categories (id, name, slug, display_order) VALUES
  ('cat-cdn', 'CDN / パフォーマンス', 'cdn-performance', 1),
  ('cat-security', 'セキュリティ', 'security', 2),
  ('cat-zerotrust', 'Zero Trust', 'zero-trust', 3),
  ('cat-devplatform', 'Developer Platform', 'developer-platform', 4),
  ('cat-network', 'ネットワークサービス', 'network-services', 5);

-- 製品
INSERT INTO products (id, category_id, name, slug, description, pricing_model) VALUES
  -- CDN / パフォーマンス
  ('prod-cdn', 'cat-cdn', 'CDN', 'cdn', 'コンテンツ配信ネットワーク', 'tier'),
  ('prod-dns', 'cat-cdn', 'DNS', 'dns', 'エンタープライズDNS', 'tier'),
  ('prod-images', 'cat-cdn', 'Cloudflare Images', 'images', '画像最適化・配信', 'tier_plus_usage'),
  -- セキュリティ
  ('prod-waf', 'cat-security', 'WAF', 'waf', 'Web Application Firewall', 'tier'),
  ('prod-ddos', 'cat-security', 'DDoS Protection', 'ddos', 'DDoS攻撃対策', 'tier'),
  ('prod-bot', 'cat-security', 'Bot Management', 'bot-management', 'ボット管理', 'tier'),
  -- Zero Trust
  ('prod-access', 'cat-zerotrust', 'Cloudflare Access', 'access', 'ゼロトラストアクセス', 'tier_plus_usage'),
  ('prod-gateway', 'cat-zerotrust', 'Cloudflare Gateway', 'gateway', 'セキュアWebゲートウェイ', 'tier_plus_usage'),
  ('prod-tunnel', 'cat-zerotrust', 'Cloudflare Tunnel', 'tunnel', 'セキュアトンネル接続', 'tier'),
  -- Developer Platform
  ('prod-workers', 'cat-devplatform', 'Workers', 'workers', 'サーバーレスコンピューティング', 'tier_plus_usage'),
  ('prod-pages', 'cat-devplatform', 'Pages', 'pages', '静的サイトホスティング', 'tier'),
  ('prod-r2', 'cat-devplatform', 'R2 Storage', 'r2', 'オブジェクトストレージ', 'usage'),
  -- ネットワーク
  ('prod-argo', 'cat-network', 'Argo Smart Routing', 'argo', 'スマートルーティング', 'usage'),
  ('prod-spectrum', 'cat-network', 'Spectrum', 'spectrum', 'TCP/UDPプロキシ', 'tier');

-- 製品ティア
INSERT INTO product_tiers (id, product_id, name, slug, base_price, usage_unit, usage_unit_price, usage_included, display_order) VALUES
  -- CDN
  ('tier-cdn-free', 'prod-cdn', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-cdn-pro', 'prod-cdn', 'Pro', 'pro', 20, NULL, NULL, NULL, 2),
  ('tier-cdn-biz', 'prod-cdn', 'Business', 'business', 200, NULL, NULL, NULL, 3),
  ('tier-cdn-ent', 'prod-cdn', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 4),
  -- DNS
  ('tier-dns-free', 'prod-dns', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-dns-ent', 'prod-dns', 'Enterprise', 'enterprise', 300, 'domains', NULL, NULL, 2),
  -- Images
  ('tier-images-basic', 'prod-images', 'Basic', 'basic', 5, 'images', 0.001, 100000, 1),
  -- WAF
  ('tier-waf-pro', 'prod-waf', 'Pro', 'pro', 20, NULL, NULL, NULL, 1),
  ('tier-waf-biz', 'prod-waf', 'Business', 'business', 200, NULL, NULL, NULL, 2),
  ('tier-waf-ent', 'prod-waf', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 3),
  -- DDoS
  ('tier-ddos-free', 'prod-ddos', 'Free（基本保護）', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-ddos-ent', 'prod-ddos', 'Advanced', 'advanced', 3000, NULL, NULL, NULL, 2),
  -- Bot Management
  ('tier-bot-ent', 'prod-bot', 'Enterprise', 'enterprise', 3000, NULL, NULL, NULL, 1),
  -- Access
  ('tier-access-free', 'prod-access', 'Free', 'free', 0, 'users', NULL, 50, 1),
  ('tier-access-std', 'prod-access', 'Standard', 'standard', 7, 'seats', NULL, NULL, 2),
  -- Gateway
  ('tier-gw-free', 'prod-gateway', 'Free', 'free', 0, 'users', NULL, 50, 1),
  ('tier-gw-std', 'prod-gateway', 'Standard', 'standard', 7, 'seats', NULL, NULL, 2),
  -- Tunnel
  ('tier-tunnel-free', 'prod-tunnel', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-tunnel-ent', 'prod-tunnel', 'Enterprise', 'enterprise', 500, NULL, NULL, NULL, 2),
  -- Workers
  ('tier-workers-free', 'prod-workers', 'Free', 'free', 0, 'million_requests', NULL, 0.1, 1),
  ('tier-workers-paid', 'prod-workers', 'Paid', 'paid', 5, 'million_requests', 0.50, 10, 2),
  -- Pages
  ('tier-pages-free', 'prod-pages', 'Free', 'free', 0, NULL, NULL, NULL, 1),
  ('tier-pages-pro', 'prod-pages', 'Pro', 'pro', 20, NULL, NULL, NULL, 2),
  -- R2
  ('tier-r2-usage', 'prod-r2', 'Usage', 'usage', 0, 'gb_storage', 0.015, 10, 1),
  -- Argo
  ('tier-argo-usage', 'prod-argo', 'Usage', 'usage', 5, 'bandwidth_gb', 0.10, 0, 1),
  -- Spectrum
  ('tier-spectrum-pro', 'prod-spectrum', 'Pro', 'pro', 1, NULL, NULL, NULL, 1),
  ('tier-spectrum-ent', 'prod-spectrum', 'Enterprise', 'enterprise', 5000, NULL, NULL, NULL, 2);

-- デモ用パートナー（デフォルトマークアップ20% - 日本のMSSP市場標準）
INSERT INTO partners (id, name, slug, primary_color, secondary_color, default_markup_type, default_markup_value) VALUES
  ('partner-demo', 'デモパートナー', 'demo', '#F6821F', '#1B1B1B', 'percentage', 20);
