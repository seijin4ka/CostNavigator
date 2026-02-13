import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import type { SystemSettings, UpdateSystemSettingsRequest, Partner } from "@shared/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<UpdateSystemSettingsRequest>({
    brand_name: "",
    primary_partner_slug: null,
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    footer_text: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [settingsRes, partnersRes] = await Promise.all([
        apiClient.get<SystemSettings>("/admin/system-settings"),
        apiClient.get<{ data: Partner[]; total: number }>("/admin/partners"),
      ]);

      setSettings(settingsRes.data);
      setPartners(partnersRes.data.data);
      setFormData({
        brand_name: settingsRes.data.brand_name,
        primary_partner_slug: settingsRes.data.primary_partner_slug,
        logo_url: settingsRes.data.logo_url || "",
        primary_color: settingsRes.data.primary_color,
        secondary_color: settingsRes.data.secondary_color,
        footer_text: settingsRes.data.footer_text,
      });
    } catch (err) {
      console.error("システム設定の読み込みエラー:", err);
      setError("システム設定の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiClient.put<SystemSettings>("/admin/system-settings", {
        ...formData,
        logo_url: formData.logo_url || null,
        primary_partner_slug: formData.primary_partner_slug || null,
      });
      setSettings(res.data);
      setSuccess("システム設定を保存しました");

      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("システム設定の保存エラー:", err);
      setError("システム設定の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          サイト全体のブランディングと表示設定を管理します
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">ブランディング設定</h2>

            <Input
              label="ブランド名"
              value={formData.brand_name}
              onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
              required
              placeholder="例: Partner Solutions"
            />

            <Input
              label="ロゴURL（オプション）"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              helperText="外部URLまたは相対パスを指定してください"
            />

            <Input
              label="プライマリカラー"
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              required
            />

            <Input
              label="セカンダリカラー"
              type="color"
              value={formData.secondary_color}
              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              required
            />

            <Input
              label="フッターテキスト"
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              required
              placeholder="例: Powered by Your Company"
            />
          </div>
        </Card>

        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">デフォルトパートナー設定</h2>
            <p className="text-sm text-gray-500">
              トップページ（/）で表示するパートナーを選択してください。
              未設定の場合、トップページは管理画面にリダイレクトされます。
            </p>

            <Select
              label="デフォルトパートナー"
              value={formData.primary_partner_slug || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  primary_partner_slug: e.target.value || null,
                })
              }
            >
              <option value="">未設定（トップページを無効化）</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.slug}>
                  {partner.name} ({partner.slug})
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>

      {settings && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プレビュー</h2>
            <div className="border rounded p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">ブランド名:</span>
                <span className="font-semibold">{formData.brand_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">プライマリカラー:</span>
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: formData.primary_color }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">セカンダリカラー:</span>
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: formData.secondary_color }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">フッター:</span>
                <span className="text-sm">{formData.footer_text}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
