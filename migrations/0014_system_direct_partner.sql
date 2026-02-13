-- システムパートナー「direct」の追加（マークアップ0%）
-- トップページ（/）でのダイレクト見積もり用

INSERT INTO partners (id, name, slug, primary_color, secondary_color, default_markup_type, default_markup_value, is_active)
VALUES ('system-direct-partner', 'CostNavigator', 'direct', '#F6821F', '#1B1B1B', 'percentage', 0, 1)
ON CONFLICT(slug) DO NOTHING;
