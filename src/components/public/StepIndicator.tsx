import { CheckIcon } from "./Icons";

// ステップインジケーター
export function StepIndicator({ currentStep, primaryColor }: { currentStep: number; primaryColor: string }) {
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
