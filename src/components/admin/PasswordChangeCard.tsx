import { useState } from "react";
import { apiClient } from "../../api/client";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function PasswordChangeCard() {
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordChangeSuccess("");

    // クライアント側バリデーション: パスワード一致チェック
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordError("新しいパスワードと確認用パスワードが一致しません");
      setIsChangingPassword(false);
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      setPasswordError("新しいパスワードは8文字以上で入力してください");
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await apiClient.patch<{ message: string }>("/auth/admin/change-password", passwordFormData);

      if (res.data.message) {
        setPasswordChangeSuccess(res.data.message);
        setTimeout(() => {
          setPasswordFormData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          setPasswordChangeSuccess("");
        }, 3000);
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "パスワード変更に失敗しました");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">パスワード変更</h2>
        {passwordChangeSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {passwordChangeSuccess}
          </div>
        )}
        {passwordError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {passwordError}
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="現在のパスワード"
            type="password"
            value={passwordFormData.currentPassword}
            onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
            required
            disabled={isChangingPassword}
            placeholder="現在のパスワードを入力してください"
          />
          <Input
            label="新しいパスワード"
            type="password"
            value={passwordFormData.newPassword}
            onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
            required
            disabled={isChangingPassword}
            placeholder="8文字以上で入力してください"
          />
          <Input
            label="新しいパスワード（確認用）"
            type="password"
            value={passwordFormData.confirmPassword}
            onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
            required
            disabled={isChangingPassword}
            placeholder="新しいパスワードを再度入力してください"
          />
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? "変更中..." : "変更する"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
