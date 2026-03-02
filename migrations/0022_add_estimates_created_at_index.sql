-- estimates テーブルの created_at にインデックスを追加
-- ページネーションの ORDER BY created_at DESC を高速化
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
