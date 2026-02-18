import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import type { SystemSettings, UpdateSystemSettingsRequest } from "@shared/types";
import { setCurrency } from "../../lib/formatters";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { PasswordChangeCard } from "../../components/admin/PasswordChangeCard";

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<UpdateSystemSettingsRequest>({
    brand_name: "",
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    footer_text: "",
    currency: "JPY",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const settingsRes = await apiClient.get<SystemSettings>("/admin/system-settings");
      setSettings(settingsRes.data);
      setFormData({
        brand_name: settingsRes.data.brand_name,
        logo_url: settingsRes.data.logo_url || "",
        primary_color: settingsRes.data.primary_color,
        secondary_color: settingsRes.data.secondary_color,
        footer_text: settingsRes.data.footer_text,
        currency: settingsRes.data.currency as "USD" | "JPY",
      });
      setCurrency(settingsRes.data.currency);
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
      });
      setSettings(res.data);
      setCurrency(res.data.currency);
      setSuccess("システム設定を保存しました");
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
      <h1 className="text-2xl font-bold text-gray-900">システム設定</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：設定フォーム（2カラム分） */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                {/* ブランディング設定 */}
                <div className="space-y-4">
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
                    value={formData.logo_url ?? ""}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="プライマリカラー"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      required
                      placeholder="例: #F6821F"
                    />

                    <Input
                      label="セカンダリカラー"
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      required
                      placeholder="例: #1B1B1B"
                    />
                  </div>

                  <Input
                    label="フッターテキスト"
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    placeholder="例: Powered by Your Company"
                  />

                  <Select
                    label="通貨"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as "USD" | "JPY" })}
                    options={[
                      { value: "JPY", label: "JPY（日本円）" },
                      { value: "USD", label: "USD（米ドル）" },
                    ]}
                  />
                </div>

                {/* プレビュー */}
                {settings && (
                  <>
                    <hr className="border-gray-200" />
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-gray-900">プレビュー</h2>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border bg-white flex items-center justify-center overflow-hidden">
                            {formData.logo_url ? (
                              <img src={formData.logo_url} alt="ロゴ" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-gray-400 text-sm font-bold">
                                {formData.brand_name?.[0] || ""}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{formData.brand_name}</div>
                            <div className="text-xs text-gray-500">{formData.footer_text || "Powered by Accelia, Inc."}</div>
                          </div>
                          <div className="ml-auto flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded border" style={{ backgroundColor: formData.primary_color }} />
                              <span className="text-xs text-gray-400">Primary</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded border" style={{ backgroundColor: formData.secondary_color }} />
                              <span className="text-xs text-gray-400">Secondary</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 保存ボタン（カード内のフッター） */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* 右側：パスワード変更（1カラム分） */}
        <div>
          <PasswordChangeCard />
        </div>
      </div>
    </div>
  );
}
