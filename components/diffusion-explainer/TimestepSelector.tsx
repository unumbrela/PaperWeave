"use client";

interface TimestepSelectorProps {
  currentTimestep: number;
  onTimestepChange: (timestep: number) => void;
}

export function TimestepSelector({ currentTimestep, onTimestepChange }: TimestepSelectorProps) {
  const timesteps = [100, 90, 50, 10, 0];

  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <h3 className="serif text-lg text-ink mb-4">时间步选择</h3>
      <div className="flex items-center gap-2">
        {timesteps.map((step) => (
          <button
            key={step}
            onClick={() => onTimestepChange(step)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm transition-all ${
              currentTimestep === step
                ? "bg-[#8b5cf6] text-white"
                : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#8b5cf6]"
            }`}
          >
            t={step === 100 ? "T" : step}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <input
          type="range"
          min="0"
          max="100"
          value={100 - currentTimestep}
          onChange={(e) => onTimestepChange(100 - parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
        />
        <div className="flex justify-between text-xs text-ink-3 mt-1">
          <span>纯噪声 (t=100)</span>
          <span>清晰图像 (t=0)</span>
        </div>
      </div>
    </div>
  );
}