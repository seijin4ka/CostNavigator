import { Card } from "../../components/ui/Card";

// ダッシュボード（Phase 6で統計情報を追加予定）
export function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">製品数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">パートナー数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">-</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">見積もり数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">-</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
