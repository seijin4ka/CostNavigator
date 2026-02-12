import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">CostNavigator</h1>
              <p className="mt-2 text-gray-600">Cloudflare MSSP 予算見積もりサービス</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
