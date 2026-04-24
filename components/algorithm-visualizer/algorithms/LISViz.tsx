"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type FormEvent,
} from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CodePanel } from "../shared/CodePanel";
import { ControlBar } from "../shared/ControlBar";
import { useAnimationController } from "../shared/use-animation-controller";
import s from "../shared/shared.module.css";

/* ================================================================
   Types
   ================================================================ */

type StepKind = "init" | "outer-loop" | "compare" | "update-dp" | "update-max" | "result";

interface AnimStep {
  description: string;
  kind: StepKind;
  nums: number[];
  dp: number[];
  /** Outer loop index i */
  i: number;
  /** Inner loop index j (-1 when not in inner loop) */
  j: number;
  maxLen: number;
  /** Indices that form the LIS (shown at result) */
  lisIndices?: number[];
  /** Whether dp[i] was just updated */
  dpUpdated?: boolean;
}

/* ================================================================
   C++ Code & mappings
   ================================================================ */

const CPP_CODE = `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        int n = nums.size();
        if (n == 0) return 0;
        vector<int> dp(n, 1);
        int maxLen = 1;
        for (int i = 1; i < n; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[i] > nums[j]) {
                    dp[i] = max(dp[i], dp[j] + 1);
                }
            }
            maxLen = max(maxLen, dp[i]);
        }
        return maxLen;
    }
};`;

const LINE_HIGHLIGHT: Record<StepKind, number[]> = {
  init: [4, 5, 6, 7],
  "outer-loop": [8],
  compare: [9, 10],
  "update-dp": [11],
  "update-max": [14],
  result: [16],
};

const EXEC_LINE: Record<StepKind, number> = {
  init: 6,
  "outer-loop": 8,
  compare: 10,
  "update-dp": 11,
  "update-max": 14,
  result: 16,
};

/* ================================================================
   Engine — generate steps
   ================================================================ */

function generateSteps(nums: number[]): AnimStep[] {
  const n = nums.length;
  const steps: AnimStep[] = [];
  const dp = new Array(n).fill(1);
  let maxLen = 1;

  // Init
  steps.push({
    description: `初始化: n=${n}, dp 数组全部设为 1, maxLen=1`,
    kind: "init",
    nums: [...nums],
    dp: [...dp],
    i: -1,
    j: -1,
    maxLen: 1,
  });

  for (let i = 1; i < n; i++) {
    // Outer loop
    steps.push({
      description: `外层循环: i=${i}, 考察 nums[${i}]=${nums[i]}`,
      kind: "outer-loop",
      nums: [...nums],
      dp: [...dp],
      i,
      j: -1,
      maxLen,
    });

    for (let j = 0; j < i; j++) {
      steps.push({
        description: `比较: nums[${i}]=${nums[i]} ${nums[i] > nums[j] ? ">" : "<="} nums[${j}]=${nums[j]}${nums[i] > nums[j] ? `, dp[${j}]+1=${dp[j] + 1} ${dp[j] + 1 > dp[i] ? `> dp[${i}]=${dp[i]}, 可更新` : `<= dp[${i}]=${dp[i]}, 不更新`}` : "，跳过"}`,
        kind: "compare",
        nums: [...nums],
        dp: [...dp],
        i,
        j,
        maxLen,
      });

      if (nums[i] > nums[j]) {
        if (dp[j] + 1 > dp[i]) {
          const oldDp = dp[i];
          dp[i] = Math.max(dp[i], dp[j] + 1);
          steps.push({
            description: `更新 dp[${i}]: ${oldDp} → ${dp[i]} (dp[${j}]+1 = ${dp[j]})`,
            kind: "update-dp",
            nums: [...nums],
            dp: [...dp],
            i,
            j,
            maxLen,
            dpUpdated: true,
          });
        }
      }
    }

    // Update max
    const oldMax = maxLen;
    maxLen = Math.max(maxLen, dp[i]);
    steps.push({
      description: `更新 maxLen: max(${oldMax}, dp[${i}]=${dp[i]}) = ${maxLen}`,
      kind: "update-max",
      nums: [...nums],
      dp: [...dp],
      i,
      j: -1,
      maxLen,
    });
  }

  // Find LIS path (backtrack)
  const lisIndices = traceLIS(nums, dp, maxLen);

  steps.push({
    description: `最长递增子序列长度 = ${maxLen}`,
    kind: "result",
    nums: [...nums],
    dp: [...dp],
    i: -1,
    j: -1,
    maxLen,
    lisIndices,
  });

  return steps;
}

function traceLIS(nums: number[], dp: number[], maxLen: number): number[] {
  const indices: number[] = [];
  let remaining = maxLen;
  let lastVal = Infinity;

  for (let i = dp.length - 1; i >= 0 && remaining > 0; i--) {
    if (dp[i] === remaining && nums[i] < lastVal) {
      indices.unshift(i);
      lastVal = nums[i];
      remaining--;
    }
  }
  return indices;
}

/* ================================================================
   Array Visualization
   ================================================================ */

interface ArrayVisProps {
  step: AnimStep | null;
}

function ArrayVis({ step }: ArrayVisProps) {
  if (!step) {
    return (
      <div className={s.canvasArea}>
        <div className={s.emptyState} style={{ marginTop: 0 }}>
          <div className={s.emptyIcon}>📈</div>
          <h3 className={s.emptyTitle}>输入数组数据</h3>
          <p className={s.emptyText}>输入逗号分隔的数字，开始可视化 LIS 求解过程</p>
        </div>
      </div>
    );
  }

  const { nums, dp, i, j, kind, lisIndices } = step;

  return (
    <div className={s.canvasArea}>
      <div className={s.arrayContainer}>
        {/* nums array */}
        <div className={s.arrayRow}>
          <span className={s.arrayLabel}>nums[]</span>
          {nums.map((val, idx) => {
            let cellClass = s.arrayCell;
            if (kind === "result" && lisIndices?.includes(idx)) {
              cellClass += ` ${s.arrayCellResult}`;
            } else if (idx === i) {
              cellClass += ` ${s.arrayCellActive}`;
            } else if (idx === j) {
              cellClass += ` ${s.arrayCellCompare}`;
            } else if (kind === "compare" && idx < i && idx > j) {
              // no special style
            }

            return (
              <div key={`n-${idx}`} className={cellClass}>
                {val}
                <span className={s.indexLabel}>{idx}</span>
                {idx === i && kind !== "result" && (
                  <span
                    className={s.pointerArrow}
                    style={{ color: "#4CAF50" }}
                  >
                    i
                  </span>
                )}
                {idx === j && (
                  <span
                    className={s.pointerArrow}
                    style={{ color: "#FF9800", left: idx === i ? 20 : undefined }}
                  >
                    j
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* dp array */}
        <div className={s.arrayRow}>
          <span className={s.arrayLabel}>dp[]</span>
          {dp.map((val, idx) => {
            let cellClass = s.arrayCell;
            if (kind === "result" && lisIndices?.includes(idx)) {
              cellClass += ` ${s.arrayCellResult}`;
            } else if (
              kind === "update-dp" &&
              idx === i &&
              step.dpUpdated
            ) {
              cellClass += ` ${s.arrayCellActive} ${s.arrayCellUpdating}`;
            } else if (idx === i && kind !== "init" && kind !== "result") {
              cellClass += ` ${s.arrayCellHighlight}`;
            }

            return (
              <div key={`d-${idx}`} className={cellClass}>
                {val}
                <span className={s.indexLabel}>{idx}</span>
              </div>
            );
          })}
        </div>

        {/* maxLen display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.85rem",
            color: "var(--ink-2)",
          }}
        >
          <span style={{ fontWeight: 600 }}>maxLen =</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "0.5rem",
              background:
                kind === "result"
                  ? "#9C27B0"
                  : kind === "update-max"
                    ? "#4CAF50"
                    : "var(--paper-2)",
              color:
                kind === "result" || kind === "update-max"
                  ? "#fff"
                  : "var(--ink)",
              border: `2px solid ${kind === "result" ? "#9C27B0" : kind === "update-max" ? "#4CAF50" : "var(--line)"}`,
              fontWeight: 700,
              fontSize: "1rem",
              transition: "all 0.3s",
            }}
          >
            {step.maxLen}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Input validation
   ================================================================ */

function validateInput(input: string): {
  ok: boolean;
  error?: string;
  nums?: number[];
} {
  const t = input.trim();
  if (!t) return { ok: false, error: "请输入至少两个数字" };
  const parts = t.split(",").map((s) => s.trim());
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^-?\d+$/.test(p)) return { ok: false, error: "请输入有效的整数" };
    nums.push(parseInt(p, 10));
  }
  if (nums.length < 2) return { ok: false, error: "至少需要 2 个数字" };
  if (nums.length > 10) return { ok: false, error: "最多支持 10 个数字" };
  return { ok: true, nums };
}

function randomArray(): string {
  const len = Math.floor(Math.random() * 4) + 4;
  const nums: number[] = [];
  for (let i = 0; i < len; i++) {
    nums.push(Math.floor(Math.random() * 20) + 1);
  }
  return nums.join(",");
}

/* ================================================================
   Main component
   ================================================================ */

const PRESETS = [
  { label: "[10,9,2,5,3,7,101,18]", value: "10,9,2,5,3,7,101,18" },
  { label: "[0,1,0,3,2,3]", value: "0,1,0,3,2,3" },
  { label: "[3,1,4,1,5,9]", value: "3,1,4,1,5,9" },
];

export function LISViz() {
  const [inputText, setInputText] = useState("10,9,2,5,3,7,101,18");
  const [inputError, setInputError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnimStep[]>([]);
  const [currentStep, setCurrentStep] = useState<AnimStep | null>(null);

  const handleStepChange = useCallback((step: AnimStep) => {
    setCurrentStep(step);
  }, []);

  const anim = useAnimationController(steps, handleStepChange);

  const handleSubmit = useCallback(
    (nums: number[]) => {
      const st = generateSteps(nums);
      setSteps(st);
      setCurrentStep(null);
      anim.reset();
    },
    [anim],
  );

  const handleFormSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const res = validateInput(inputText);
    if (res.ok && res.nums) {
      setInputError(null);
      handleSubmit(res.nums);
    } else {
      setInputError(res.error ?? "输入无效");
    }
  };

  const handlePreset = (val: string) => {
    setInputText(val);
    setInputError(null);
    const res = validateInput(val);
    if (res.ok && res.nums) handleSubmit(res.nums);
  };

  const handleRandom = () => {
    const val = randomArray();
    setInputText(val);
    setInputError(null);
    const res = validateInput(val);
    if (res.ok && res.nums) handleSubmit(res.nums);
  };

  const handleReset = useCallback(() => {
    anim.reset();
    setCurrentStep(null);
  }, [anim]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        if (anim.state === "playing") {
          anim.pause();
        } else if (steps.length > 0) {
          anim.play();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        anim.stepBackward();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        anim.stepForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [anim, steps.length]);

  // Code panel props
  const highlightLines = currentStep
    ? LINE_HIGHLIGHT[currentStep.kind] ?? []
    : [];
  const execLine = currentStep ? EXEC_LINE[currentStep.kind] ?? null : null;

  const varDisplay = useMemo(() => {
    if (!currentStep) return {};
    const st = currentStep;
    const display: Record<number, string | null> = {};
    display[4] = `n = ${st.nums.length}`;
    display[7] = `maxLen = ${st.maxLen}`;
    if (st.i >= 0) {
      display[8] = `i = ${st.i}, nums[i] = ${st.nums[st.i]}`;
    }
    if (st.j >= 0) {
      display[9] = `j = ${st.j}, nums[j] = ${st.nums[st.j]}`;
    }
    if (st.i >= 0) {
      display[11] = `dp[${st.i}] = ${st.dp[st.i]}`;
    }
    return display;
  }, [currentStep]);

  const memoryVars = useMemo(() => {
    if (!currentStep) return undefined;
    const st = currentStep;
    const vars = [
      { name: "n", value: `${st.nums.length}` },
      { name: "maxLen", value: `${st.maxLen}`, changed: st.kind === "update-max" },
      { name: "dp", value: `{${st.dp.join(", ")}}`, changed: st.dpUpdated },
    ];
    if (st.i >= 0) {
      vars.push({ name: "i", value: `${st.i}` });
    }
    if (st.j >= 0) {
      vars.push({ name: "j", value: `${st.j}` });
    }
    return vars;
  }, [currentStep]);

  const isPlaying = anim.state === "playing";

  return (
    <div className={s.page}>
      <div className={s.container}>
        <Link href="/tools/algorithm-visualizer" className={s.backLink}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>返回 · 算法可视化</span>
        </Link>

        <header className={s.header}>
          <div className={s.headerTop}>
            <div>
              <div className={s.overline}>LeetCode 300 · 中等</div>
              <h1 className={s.title}>
                <span className={s.titleIcon}>📈 </span>最长递增子序列
              </h1>
              <p className={s.description}>
                O(n²) 动态规划解法 — 双重循环逐步比较 + DP 数组更新，
                直观理解状态转移方程 dp[i] = max(dp[j] + 1)。
              </p>
            </div>
          </div>
          <div className={s.hairline} />
        </header>

        {/* Input bar */}
        <form className={s.inputBar} onSubmit={handleFormSubmit}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="10,9,2,5,3,7,101,18"
            disabled={isPlaying}
            className={s.inputField}
          />
          <button
            type="submit"
            disabled={isPlaying}
            className={s.submitBtn}
          >
            开始
          </button>

          <div className={s.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`${s.presetBtn} ${inputText === p.value ? s.presetBtnActive : ""}`}
                onClick={() => handlePreset(p.value)}
                disabled={isPlaying}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={`${s.presetBtn} ${s.randomBtn}`}
              onClick={handleRandom}
              disabled={isPlaying}
              title="随机生成"
            >
              🎲
            </button>
          </div>

          {inputError && <span className={s.errorMsg}>{inputError}</span>}
        </form>

        {/* Control bar */}
        {steps.length > 0 && (
          <ControlBar
            animState={anim.state}
            currentStepIndex={anim.currentStepIndex}
            totalSteps={steps.length}
            speed={anim.speed}
            onPlay={anim.play}
            onPause={anim.pause}
            onStepForward={anim.stepForward}
            onStepBackward={anim.stepBackward}
            onReset={handleReset}
            onSpeedChange={anim.setSpeed}
            onGoToStep={anim.goToStep}
          />
        )}

        {/* Main content */}
        {steps.length > 0 ? (
          <div className={s.mainContent}>
            <CodePanel
              code={CPP_CODE}
              fileName="Solution.cpp"
              highlightLines={highlightLines}
              execLine={execLine}
              varDisplay={varDisplay}
              memoryVars={memoryVars}
            />

            <div className={s.centerPanel}>
              <ArrayVis step={currentStep} />

              {/* Step explanation */}
              {currentStep && (
                <div
                  className={`${s.infoPanel} ${s.infoPanelAccent} ${
                    currentStep.kind === "update-dp"
                      ? s.infoPanelGreen
                      : currentStep.kind === "compare"
                        ? s.infoPanelOrange
                        : currentStep.kind === "result"
                          ? s.infoPanelPurple
                          : s.infoPanelBlue
                  }`}
                >
                  <div className={s.stepHeader}>
                    <span className={s.stepIcon}>
                      {currentStep.kind === "init" && "🎯"}
                      {currentStep.kind === "outer-loop" && "🔄"}
                      {currentStep.kind === "compare" && "⚖️"}
                      {currentStep.kind === "update-dp" && "✏️"}
                      {currentStep.kind === "update-max" && "📊"}
                      {currentStep.kind === "result" && "🏆"}
                    </span>
                    <span className={s.stepTitle}>
                      {currentStep.kind === "init" && "初始化"}
                      {currentStep.kind === "outer-loop" && "外层循环"}
                      {currentStep.kind === "compare" && "比较元素"}
                      {currentStep.kind === "update-dp" && "更新 DP"}
                      {currentStep.kind === "update-max" && "更新最大值"}
                      {currentStep.kind === "result" && "得到结果"}
                    </span>
                    <span className={s.stepProgress}>
                      {anim.currentStepIndex + 1} / {steps.length}
                    </span>
                  </div>
                  <div className={s.panelText}>{currentStep.description}</div>
                </div>
              )}

              {/* Legend */}
              <div className={s.legendPanel}>
                <div className={s.legendTitle}>图例</div>
                <div className={s.legendGrid}>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#4CAF50" }}
                    />
                    当前元素 i
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#FF9800" }}
                    />
                    比较元素 j
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#2196F3" }}
                    />
                    DP 高亮
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#9C27B0" }}
                    />
                    LIS 结果
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>📈</div>
            <h3 className={s.emptyTitle}>输入数组数据开始可视化</h3>
            <p className={s.emptyText}>
              输入逗号分隔的数字（如 10,9,2,5,3,7,101,18），点击「开始」按钮
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
