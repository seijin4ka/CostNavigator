import { useState, useEffect, type FormEvent, type CSSProperties } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import {
  useEstimateBuilder,
  type PublicProduct,
} from "../../hooks/useEstimateBuilder";
import type { PartnerBranding, SystemSettings } from "@shared/types";
import { USAGE_UNIT_LABELS } from "@shared/constants";
import { formatCurrency, formatNumber } from "../../lib/formatters";
import { Input } from "../../components/ui/Input";

// --- SVGアイコン ---
interface IconProps { className?: string; style?: CSSProperties }

function ShieldIcon({ className = "w-5 h-5", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function MinusIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function EyeIcon({ className = "w-5 h-5", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon({ className = "w-5 h-5", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocumentIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function LockIcon({ className = "w-4 h-4", style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

// ステップインジケーター
function StepIndicator({ currentStep, primaryColor }: { currentStep: number; primaryColor: string }) {
  const steps = [
    { num: 1, label: "サービス選択" },
    { num: 2, label: "お客様情報入力" },
    { num: 3, label: "見積もり完了" },
  ];
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all duration-300 ${
                currentStep >= step.num ? "text-white" : "bg-slate-100 text-slate-400"
              }`}
              style={currentStep >= step.num ? { backgroundColor: primaryColor } : undefined}
            >
              {currentStep > step.num ? <CheckIcon className="w-3.5 h-3.5" /> : step.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline transition-colors duration-300 ${
                currentStep >= step.num ? "text-slate-700" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 sm:w-12 h-px mx-2 sm:mx-3 transition-colors duration-300" style={{ backgroundColor: currentStep > step.num ? primaryColor : "#e2e8f0" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export function EstimatePage() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const navigate = useNavigate();
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [partner, setPartner] = useState<PartnerBranding | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // 初期セットアップフォーム
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupCredentials, setSetupCredentials] = useState<{ email: string; password: string } | null>(null);

  // 顧客情報フォーム
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_company: "",
    notes: "",
  });

  const builder = useEstimateBuilder();

  // partnerSlug がない場合、system_settings から primary_partner_slug を取得
  useEffect(() => {
    if (!partnerSlug) {
      const fetchSettings = async () => {
        try {
          const res = await apiClient.get<SystemSettings>("/public/system-settings");
          setSystemSettings(res.data);
          // primary_partner_slug が未設定の場合は isLoading を false に
          if (!res.data.primary_partner_slug) {
            setIsLoading(false);
          }
        } catch (err) {
          console.error("システム設定の読み込みエラー:", err);
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [partnerSlug]);

  const slug = partnerSlug || systemSettings?.primary_partner_slug;
  const basePath = partnerSlug ? `/estimate/${partnerSlug}` : "";

  // パートナー情報と製品カタログを取得
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        const [partnerRes, productsRes] = await Promise.all([
          apiClient.get<PartnerBranding>(`/public/${slug}`),
          apiClient.get<PublicProduct[]>(`/public/${slug}/products`),
        ]);
        setPartner(partnerRes.data);
        setProducts(productsRes.data);

        const categories = [...new Set(productsRes.data.map((p) => p.category_name))];
        if (categories.length > 0) setSelectedCategory(categories[0]);
      } catch (err) {
        console.error("見積もりページの読み込みエラー:", err);
        setError("ページの読み込みに失敗しました。URLが正しいか確認してください。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const categories = [...new Set(products.map((p) => p.category_name))];
  const filteredProducts = products.filter((p) => p.category_name === selectedCategory);

  // 初期セットアップハンドラー
  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupError("");

    // バリデーション
    if (!setupEmail || !setupPassword || !setupPasswordConfirm) {
      setSetupError("すべての項目を入力してください");
      setSetupLoading(false);
      return;
    }

    if (setupPassword.length < 8) {
      setSetupError("パスワードは8文字以上である必要があります");
      setSetupLoading(false);
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setSetupError("パスワードが一致しません");
      setSetupLoading(false);
      return;
    }

    try {
      const res = await apiClient.post<{
        message: string;
        credentials: { email: string; password: string };
        alreadySetup?: boolean;
      }>("/auth/setup", {
        email: setupEmail,
        password: setupPassword,
      });

      if (res.data.alreadySetup) {
        setSetupError("セットアップは既に完了しています。管理画面にログインしてください。");
      } else {
        setSetupComplete(true);
        setSetupCredentials(res.data.credentials);
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "セットアップに失敗しました");
    } finally {
      setSetupLoading(false);
    }
  };

  // 見積もり送信
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (builder.items.length === 0) return;

    setIsSubmitting(true);
    setError("");
    try {
      const res = await apiClient.post<{ reference_number: string }>(
        `/public/${slug}/estimates`,
        {
          ...customerForm,
          customer_phone: customerForm.customer_phone || null,
          customer_company: customerForm.customer_company || null,
          notes: customerForm.notes || null,
          items: builder.items.map((item) => ({
            product_id: item.product_id,
            tier_id: item.tier_id,
            quantity: item.quantity,
            usage_quantity: item.usage_quantity > 0 ? item.usage_quantity : null,
          })),
        }
      );
      navigate(`${basePath}/result?ref=${res.data.reference_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "見積もりの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = partner?.primary_color ?? "#F6821F";
  const secondaryColor = partner?.secondary_color ?? "#1B1B1B";

  // 現在のステップ判定
  const currentStep = isSubmitModalOpen ? 2 : 1;

  // --- primary_partner_slug が未設定の場合のセットアップ促進画面 ---
  if (!partnerSlug && !slug && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
        <div className="max-w-md w-full mx-auto px-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 font-display mb-2">パートナー情報の設定が必要です</h2>
            <p className="text-sm text-slate-600 font-body leading-relaxed">
              Cloudflare見積もりサービスをご利用いただくには、管理者アカウントを作成してください。
            </p>
          </div>

          {!setupComplete ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 font-display mb-4">管理者アカウント作成</h3>
              <form onSubmit={handleSetup} className="space-y-4">
                <Input
                  label="メールアドレス"
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled={setupLoading}
                />
                <div className="space-y-1">
                  <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700">
                    パスワード
                  </label>
                  <div className="relative">
                    <input
                      id="setup-password"
                      type={showPassword ? "text" : "password"}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="8文字以上"
                      required
                      disabled={setupLoading}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="setup-password-confirm" className="block text-sm font-medium text-gray-700">
                    パスワード（確認）
                  </label>
                  <div className="relative">
                    <input
                      id="setup-password-confirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      value={setupPasswordConfirm}
                      onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                      placeholder="パスワードを再入力"
                      required
                      disabled={setupLoading}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPasswordConfirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {setupError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {setupError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setupLoading ? "セットアップ中..." : "セットアップを開始"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 font-display mb-3">セットアップ後の手順</h4>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-500">1.</span>
                    <span>作成したアカウントで管理画面にログイン</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-500">2.</span>
                    <span>パートナー管理にて貴社の情報を登録</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-500">3.</span>
                    <span>システム設定でプライマリパートナーとして指定</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-green-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900 font-display">セットアップ完了</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                管理者アカウントが作成されました。以下の認証情報で管理画面にログインしてください。
              </p>
              {setupCredentials && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm font-mono">
                  <div>
                    <span className="text-slate-500">メールアドレス:</span>
                    <div className="text-slate-900 font-semibold">{setupCredentials.email}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">パスワード:</span>
                    <div className="text-slate-900 font-semibold">{setupCredentials.password}</div>
                  </div>
                </div>
              )}
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-lg bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors"
              >
                管理画面へログイン
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- ローディング ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin mx-auto"
            style={{ borderColor: `${primaryColor}33`, borderTopColor: primaryColor }}
          />
          <p className="mt-4 text-sm text-slate-400 font-body">読み込み中...</p>
        </div>
      </div>
    );
  }

  // --- エラー ---
  if (error && !partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 font-display">ページを表示できません</h2>
          <p className="mt-2 text-sm text-slate-500 font-body">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 font-body"
      style={{ "--cn-accent": primaryColor, "--cn-accent-dark": secondaryColor } as CSSProperties}
    >
      {/* === ヘッダー === */}
      <header className="relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
        {/* 背景パターン */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z' fill='%23ffffff' fill-opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            {/* ロゴ + パートナー名 */}
            <div className="flex items-center gap-3 sm:gap-4">
              {partner?.logo_url && (
                <img src={partner.logo_url} alt={partner.name} className="h-7 sm:h-8 object-contain" />
              )}
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-display">
                  {partner?.name ?? "CostNavigator"}
                </h1>
                <p className="text-[11px] sm:text-xs text-white/50 tracking-wide">
                  Cloudflare サービス見積もり
                </p>
              </div>
            </div>
            {/* 認定バッジ */}
            <div className="hidden sm:flex items-center gap-2 text-white/60 text-xs">
              <ShieldIcon className="w-4 h-4" />
              <span className="font-display">Cloudflare 認定パートナー</span>
            </div>
          </div>
        </div>
        {/* アクセントライン */}
        <div
          className="h-[3px]"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88, transparent)` }}
        />
      </header>

      {/* === ヒーローセクション === */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${secondaryColor}08, ${primaryColor}06, ${secondaryColor}04)` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="text-center max-w-3xl mx-auto animate-cn-fade-up opacity-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight font-display leading-tight">
              最適なCloudflareプランを
              <br className="sm:hidden" />
              <span style={{ color: primaryColor }}>簡単お見積もり</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mx-auto">
              必要なサービスを選択するだけで、即座にお見積もりを作成。
              <br className="hidden sm:block" />
              PDFでのダウンロードも無料でご利用いただけます。
            </p>

            {/* バリュープロポジション */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ClockIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>最短1分で完了</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <DocumentIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>PDF出力対応</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <LockIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                <span>登録不要・無料</span>
              </div>
            </div>
          </div>

          {/* ステップインジケーター */}
          <div className="mt-8 animate-cn-fade-up opacity-0" style={{ animationDelay: "100ms" }}>
            <StepIndicator currentStep={currentStep} primaryColor={primaryColor} />
          </div>
        </div>
        {/* セクション区切り */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* === メインコンテンツ === */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          {/* === 左側: 製品セレクター === */}
          <div className="lg:col-span-2 animate-cn-fade-up opacity-0" style={{ animationDelay: "150ms" }}>
            {/* カテゴリタブ */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 cn-scrollbar">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const count = products.filter((p) => p.category_name === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap border transition-all duration-200 ${
                      isActive
                        ? "border-transparent text-white shadow-md"
                        : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300"
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : undefined}
                  >
                    {cat}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 製品一覧 */}
            <div className="space-y-5">
              {filteredProducts.map((product, pi) => (
                <div
                  key={product.id}
                  className="cn-product-card bg-white rounded-xl border border-slate-200 overflow-hidden animate-cn-fade-up opacity-0"
                  style={{ animationDelay: `${200 + pi * 80}ms` }}
                >
                  {/* 製品ヘッダー */}
                  <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="mt-1 text-sm text-slate-500 leading-relaxed">{product.description}</p>
                        )}
                      </div>
                      <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 whitespace-nowrap ml-4">
                        {product.category_name}
                      </span>
                    </div>
                  </div>

                  {/* ティア選択 */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {product.tiers.map((tier, ti) => {
                        const isInEstimate = builder.items.some(
                          (i) => i.product_id === product.id && i.tier_id === tier.id
                        );
                        // 最も高価なティアに「おすすめ」表示
                        const isRecommended = product.tiers.length > 1 && ti === product.tiers.length - 1;
                        return (
                          <div
                            key={tier.id}
                            className={`cn-tier-card relative rounded-lg border p-4 cursor-pointer ${
                              isInEstimate ? "border-2 bg-slate-50" : "border-slate-200"
                            }`}
                            style={
                              isInEstimate
                                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                                : undefined
                            }
                            onClick={() => builder.addItem(product, tier)}
                          >
                            {/* 追加済みバッジ */}
                            {isInEstimate && (
                              <div
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <CheckIcon className="w-3 h-3 text-white" />
                              </div>
                            )}

                            {/* おすすめバッジ */}
                            {isRecommended && !isInEstimate && (
                              <div
                                className="absolute -top-2.5 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide"
                                style={{ backgroundColor: primaryColor }}
                              >
                                おすすめ
                              </div>
                            )}

                            <div className="mb-3">
                              <span className="text-sm font-semibold text-slate-800 font-display">{tier.name}</span>
                            </div>

                            <div className="mb-3">
                              <span className="cn-price text-xl font-bold" style={{ color: primaryColor }}>
                                {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
                              </span>
                              {tier.price > 0 && <span className="text-xs text-slate-400 ml-1">/月</span>}
                            </div>

                            {tier.usage_unit && tier.usage_unit_price != null && (
                              <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                                <div>
                                  + {formatCurrency(tier.usage_unit_price)} /{" "}
                                  {USAGE_UNIT_LABELS[tier.usage_unit] ?? tier.usage_unit}
                                </div>
                                {tier.usage_included != null && tier.usage_included > 0 && (
                                  <div className="text-slate-400">{formatNumber(tier.usage_included)} まで無料</div>
                                )}
                              </div>
                            )}

                            <button
                              className={`cn-tier-btn w-full py-2 rounded-md text-xs font-semibold transition-all duration-200 ${
                                isInEstimate ? "text-white" : "border"
                              }`}
                              style={
                                isInEstimate
                                  ? { backgroundColor: primaryColor }
                                  : { borderColor: `${primaryColor}40`, color: primaryColor }
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                builder.addItem(product, tier);
                              }}
                            >
                              {isInEstimate ? "追加済み (+1)" : "追加する"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === 右側: 見積もりサマリー === */}
          <div className="lg:col-span-1 animate-cn-slide-up opacity-0" style={{ animationDelay: "250ms" }}>
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                {/* サマリーヘッダー */}
                <div className="px-5 py-4" style={{ backgroundColor: secondaryColor }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white font-display tracking-wide">見積もりサマリー</h3>
                    <span className="text-xs text-white/50 font-display">
                      {builder.items.length > 0 ? `${builder.items.length}件` : ""}
                    </span>
                  </div>
                </div>

                {/* サマリーコンテンツ */}
                <div className="p-5">
                  {builder.items.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 font-body">
                        サービスを選択してください
                      </p>
                      <p className="text-xs text-slate-400 font-body mt-1">
                        左のカタログから追加できます
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* アイテムリスト */}
                      <div className="space-y-3 max-h-[400px] overflow-y-auto cn-scrollbar pr-1">
                        {builder.items.map((item, index) => (
                          <div
                            key={index}
                            className="group rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate font-display">
                                  {item.product_name}
                                </p>
                                <p className="text-xs text-slate-400">{item.tier_name}</p>
                              </div>
                              <button
                                onClick={() => builder.removeItem(index)}
                                className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 数量コントロール + 小計 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <button
                                  onClick={() => item.quantity <= 1 ? builder.removeItem(index) : builder.updateQuantity(index, item.quantity - 1)}
                                  className="w-7 h-7 rounded-l-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <MinusIcon className="w-3 h-3" />
                                </button>
                                <div className="w-10 h-7 border-y border-slate-200 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-slate-700 cn-price">{item.quantity}</span>
                                </div>
                                <button
                                  onClick={() => builder.updateQuantity(index, item.quantity + 1)}
                                  className="w-7 h-7 rounded-r-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                  <PlusIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="cn-price text-sm font-bold text-slate-800">
                                {formatCurrency(builder.calculateItemPrice(item))}
                              </span>
                            </div>

                            {/* 従量料金入力 */}
                            {item.usage_unit && item.usage_unit_price != null && (
                              <div className="mt-2 flex items-center gap-2">
                                <label className="text-xs text-slate-400 whitespace-nowrap">
                                  {USAGE_UNIT_LABELS[item.usage_unit] ?? item.usage_unit}:
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.usage_quantity}
                                  onChange={(e) =>
                                    builder.updateUsageQuantity(index, parseFloat(e.target.value) || 0)
                                  }
                                  className="flex-1 px-2 py-1 border border-slate-200 rounded-md text-xs text-center cn-price text-slate-700 focus:outline-none focus:ring-1 focus:border-slate-300 transition-shadow"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 合計セクション */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-slate-500">月額合計</span>
                          <span
                            className="cn-price text-2xl font-bold font-display"
                            style={{ color: primaryColor }}
                          >
                            {formatCurrency(builder.totalMonthly)}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs text-slate-400">年額合計</span>
                          <span className="cn-price text-sm font-semibold text-slate-600">
                            {formatCurrency(builder.totalYearly)}
                          </span>
                        </div>
                      </div>

                      {/* CTAボタン */}
                      <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg font-display"
                        style={{
                          backgroundColor: primaryColor,
                          boxShadow: `0 4px 14px -3px ${primaryColor}66`,
                        }}
                      >
                        見積もりを依頼する
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>

                      {/* 信頼シグナル */}
                      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <LockIcon className="w-3 h-3" />
                          SSL暗号化通信
                        </span>
                        <span className="w-px h-3 bg-slate-200" />
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          即時発行
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* === モバイル フローティングバー === */}
      {builder.items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-body">{builder.items.length}件のサービス</p>
              <p className="cn-price text-lg font-bold font-display" style={{ color: primaryColor }}>
                {formatCurrency(builder.totalMonthly)}
                <span className="text-xs font-normal text-slate-400 ml-1">/月</span>
              </p>
            </div>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white font-display transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              見積もりを依頼
            </button>
          </div>
        </div>
      )}

      {/* === 顧客情報モーダル === */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-cn-fade-in opacity-0">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsSubmitModalOpen(false)}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto cn-scrollbar animate-cn-slide-up opacity-0"
            style={{ animationDelay: "50ms" }}
          >
            {/* ステップインジケーター（モーダル内） */}
            <div className="px-6 pt-5 pb-3">
              <StepIndicator currentStep={2} primaryColor={primaryColor} />
            </div>

            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">お客様情報の入力</h2>
                <p className="text-xs text-slate-400 mt-0.5">見積もりの送付先情報をご入力ください</p>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 見積もりサマリー */}
            <div
              className="px-6 py-4 border-b border-slate-100"
              style={{ backgroundColor: `${primaryColor}06` }}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-500">{builder.items.length}件のサービス</span>
                <div className="text-right">
                  <span className="cn-price text-xl font-bold font-display" style={{ color: primaryColor }}>
                    {formatCurrency(builder.totalMonthly)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/月</span>
                </div>
              </div>
              <div className="flex justify-end mt-0.5">
                <span className="cn-price text-xs text-slate-400">
                  年額: {formatCurrency(builder.totalYearly)}
                </span>
              </div>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600 font-body">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                    お名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerForm.customer_name}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                    style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                    placeholder="例: 山田 太郎"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                    会社名 <span className="text-slate-300">(任意)</span>
                  </label>
                  <input
                    type="text"
                    value={customerForm.customer_company}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_company: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                    style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                    placeholder="例: 株式会社サンプル"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                    メールアドレス <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerForm.customer_email}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_email: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                    style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                    placeholder="例: yamada@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                    電話番号 <span className="text-slate-300">(任意)</span>
                  </label>
                  <input
                    type="tel"
                    value={customerForm.customer_phone}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow font-body"
                    style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                    placeholder="例: 03-1234-5678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 tracking-wide uppercase font-display">
                  備考 <span className="text-slate-300">(任意)</span>
                </label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow resize-none font-body"
                  style={{ "--tw-ring-color": `${primaryColor}33` } as CSSProperties}
                  rows={2}
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="ご質問やご要望がございましたらご記入ください"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors font-display"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-display"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 4px 14px -3px ${primaryColor}66`,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      見積もりを依頼する
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* フォーム下部の信頼シグナル */}
              <p className="text-center text-[11px] text-slate-400 pt-1">
                送信いただいた情報はSSL暗号化通信で保護されます
              </p>
            </form>
          </div>
        </div>
      )}

      {/* === フッター === */}
      <footer className="mt-16 lg:mt-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400 font-display">
              Powered by <span className="font-semibold text-slate-500">Accelia, Inc.</span>
            </p>
            <p className="text-xs text-slate-400 font-display">
              Cloudflare 製品のお見積もりツール
            </p>
          </div>
        </div>
      </footer>

      {/* モバイルフローティングバー用の余白 */}
      {builder.items.length > 0 && <div className="h-20 lg:hidden" />}
    </div>
  );
}
