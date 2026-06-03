"use client";

import { useEffect, useState } from "react";

interface PredictionGaugeProps {
  probability: number;
  isAnimating?: boolean;
}

export function PredictionGauge({ probability, isAnimating = true }: PredictionGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!isAnimating) {
      setDisplayValue(probability);
      return;
    }
    
    const startValue = displayValue;
    const endValue = probability;
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [probability, isAnimating]);

  const isReal = displayValue > 0.5;
  const rotation = (displayValue - 0.5) * 180;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-20">
        <svg className="w-full h-full" viewBox="0 0 100 60">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f4c25a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${displayValue * 125.66} 125.66`}
          />
          
          <g transform={`rotate(${rotation}, 50, 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="20"
              stroke="#1a1713"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="6" fill="#1a1713" />
          </g>
        </svg>
        
        <div className="absolute -bottom-2 left-0 w-full flex justify-between text-xs">
          <span className="text-red-500">Fake</span>
          <span className="text-yellow-500">50%</span>
          <span className="text-green-500">Real</span>
        </div>
      </div>
      
      <div className="mt-6 text-center">
        <div className={`text-3xl font-bold ${
          isReal ? "text-green-600" : "text-red-600"
        }`}>
          {Math.round(displayValue * 100)}%
        </div>
        <div className={`text-sm font-medium ${
          isReal ? "text-green-700" : "text-red-700"
        }`}>
          Prediction: {isReal ? "Real" : "Fake"}
        </div>
      </div>
    </div>
  );
}