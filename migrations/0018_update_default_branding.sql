-- デフォルトブランディングをAcceliaに変更、ヘッダー背景を白系に変更
UPDATE system_settings
SET brand_name = 'Accelia',
    logo_url = 'https://www.accelia.net/wp/wp-content/themes/accelia/assets/image/logo.png',
    secondary_color = '#FFFFFF',
    footer_text = 'Powered by Accelia, Inc.',
    updated_at = datetime('now')
WHERE id = 'default'
