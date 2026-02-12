import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { PartnersPage } from "./pages/admin/PartnersPage";
import { MarkupPage } from "./pages/admin/MarkupPage";
import { EstimatePage } from "./pages/public/EstimatePage";
import { EstimateResultPage } from "./pages/public/EstimateResultPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ルートは管理画面にリダイレクト */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* 公開ページ（エンドユーザー向け見積もりビルダー） */}
        <Route path="/estimate/:partnerSlug" element={<EstimatePage />} />
        <Route path="/estimate/:partnerSlug/result" element={<EstimateResultPage />} />

        {/* 管理画面ログイン */}
        <Route path="/admin/login" element={<LoginPage />} />

        {/* 管理画面（認証必須） */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="partners/:id/markup" element={<MarkupPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
