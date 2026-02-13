-- デフォルトマークアップを20%に統一
-- 日本のMSSP市場における標準的なマージンに準拠

-- 既存パートナーで、20%未満のパートナーを20%に更新
UPDATE partners
SET default_markup_value = 20,
    updated_at = datetime('now')
WHERE default_markup_type = 'percentage' AND default_markup_value < 20;

-- 注: SQLiteではテーブル定義のDEFAULT値を直接変更できないため、
-- 新規パートナー作成時は管理画面側で20をデフォルト値として設定する必要がある
