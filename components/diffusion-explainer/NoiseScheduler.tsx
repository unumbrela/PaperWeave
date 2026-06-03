"use client";

interface NoiseSchedulerProps {
  currentTimestep: number;
}

export function NoiseScheduler({ currentTimestep }: NoiseSchedulerProps) {
  const noiseLevel = currentTimestep / 100;
  const imageQuality = 1 - noiseLevel;
  
  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <h3 className="serif text-lg text-ink mb-4">噪声调度器</h3>
      <div className="relative h-16 rounded-lg overflow-hidden bg-gray-100">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#667eea] via-[#f4c25a] to-[#22c55e] transition-all duration-500"
          style={{ width: `${noiseLevel * 100}%` }}
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-4 h-4 rounded-full bg-[#667eea] animate-pulse" />
              <span className="text-xs text-ink-3 mt-1 block">高噪声</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-ink">{Math.round(noiseLevel * 100)}%</div>
              <span className="text-xs text-ink-3">噪声水平</span>
            </div>
            <div className="text-center">
              <div className="w-4 h-4 rounded-full bg-[#22c55e]" />
              <span className="text-xs text-ink-3 mt-1 block">低噪声</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-[#667eea]">{Math.round(imageQuality * 100)}%</div>
          <div className="text-xs text-ink-3">图像清晰度</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-[#8b5cf6]">t={currentTimestep === 100 ? "T" : currentTimestep}</div>
          <div className="text-xs text-ink-3">当前时间步</div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
        <p className="text-xs text-ink-2">
          💡 <strong>扩散模型原理</strong>：时间步 t=T (100) 表示完全加噪的状态，
          通过逆向过程逐步去噪，最终在 t=0 时得到清晰图像。
        </p>
      </div>
    </div>
  );
}