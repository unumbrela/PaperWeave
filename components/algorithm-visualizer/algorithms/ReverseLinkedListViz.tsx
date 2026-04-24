"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
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

interface ListNode {
  value: number;
  id: number;
}

type StepKind =
  | "init"
  | "save-next"
  | "reverse-pointer"
  | "move-prev"
  | "move-curr"
  | "complete";

interface AnimStep {
  description: string;
  kind: StepKind;
  nodes: ListNode[];
  /** Index of prev pointer (-1 = null) */
  prevIdx: number;
  /** Index of curr pointer (-1 = null/done) */
  currIdx: number;
  /** Index of next pointer (-1 = null) */
  nextIdx: number;
  /** reversed edges: from → to mapping (index-based), tracks which arrows are reversed */
  reversedEdges: Set<number>;
  /** highlight edge from → to */
  highlightEdge?: [number, number];
}

/* ================================================================
   C++ Code & mappings
   ================================================================ */

const CPP_CODE = `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr != nullptr) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
};`;

const LINE_HIGHLIGHT: Record<StepKind, number[]> = {
  init: [4, 5],
  "save-next": [7],
  "reverse-pointer": [8],
  "move-prev": [9],
  "move-curr": [10],
  complete: [12],
};

const EXEC_LINE: Record<StepKind, number> = {
  init: 5,
  "save-next": 7,
  "reverse-pointer": 8,
  "move-prev": 9,
  "move-curr": 10,
  complete: 12,
};

/* ================================================================
   Engine — generate steps
   ================================================================ */

function generateSteps(values: number[]): AnimStep[] {
  const nodes: ListNode[] = values.map((v, i) => ({ value: v, id: i }));
  const steps: AnimStep[] = [];
  const reversed = new Set<number>();

  // Init
  steps.push({
    description: "初始化 prev = nullptr, curr = head",
    kind: "init",
    nodes: [...nodes],
    prevIdx: -1,
    currIdx: 0,
    nextIdx: -1,
    reversedEdges: new Set(reversed),
  });

  let prevIdx = -1;
  let currIdx = 0;

  while (currIdx < nodes.length) {
    const nextIdx = currIdx + 1 < nodes.length ? currIdx + 1 : -1;

    // Save next
    steps.push({
      description: `保存 next = curr->next${nextIdx >= 0 ? ` (节点 ${nodes[nextIdx].value})` : " (nullptr)"}`,
      kind: "save-next",
      nodes: [...nodes],
      prevIdx,
      currIdx,
      nextIdx,
      reversedEdges: new Set(reversed),
    });

    // Reverse pointer
    reversed.add(currIdx);
    steps.push({
      description: `curr->next = prev${prevIdx >= 0 ? ` (指向节点 ${nodes[prevIdx].value})` : " (指向 nullptr)"}`,
      kind: "reverse-pointer",
      nodes: [...nodes],
      prevIdx,
      currIdx,
      nextIdx,
      reversedEdges: new Set(reversed),
      highlightEdge: [currIdx, prevIdx],
    });

    // Move prev
    prevIdx = currIdx;
    steps.push({
      description: `prev = curr (移动到节点 ${nodes[prevIdx].value})`,
      kind: "move-prev",
      nodes: [...nodes],
      prevIdx,
      currIdx,
      nextIdx: nextIdx,
      reversedEdges: new Set(reversed),
    });

    // Move curr
    currIdx = nextIdx >= 0 ? nextIdx : nodes.length; // sentinel
    steps.push({
      description: `curr = next${currIdx < nodes.length ? ` (移动到节点 ${nodes[currIdx].value})` : " (nullptr, 循环结束)"}`,
      kind: "move-curr",
      nodes: [...nodes],
      prevIdx,
      currIdx: currIdx < nodes.length ? currIdx : -1,
      nextIdx: -1,
      reversedEdges: new Set(reversed),
    });
  }

  // Complete
  steps.push({
    description: `反转完成！新的头节点是 ${nodes[prevIdx].value}`,
    kind: "complete",
    nodes: [...nodes],
    prevIdx,
    currIdx: -1,
    nextIdx: -1,
    reversedEdges: new Set(reversed),
  });

  return steps;
}

/* ================================================================
   SVG Linked List Visualization
   ================================================================ */

interface LLVisProps {
  step: AnimStep | null;
}

function LinkedListVis({ step }: LLVisProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!step) {
    return (
      <div className={s.canvasArea} ref={containerRef}>
        <div className={s.emptyState} style={{ marginTop: 0 }}>
          <div className={s.emptyIcon}>🔗</div>
          <h3 className={s.emptyTitle}>输入链表数据</h3>
          <p className={s.emptyText}>输入逗号分隔的数字，开始可视化反转过程</p>
        </div>
      </div>
    );
  }

  const { nodes, prevIdx, currIdx, nextIdx, reversedEdges } = step;
  const n = nodes.length;

  const nodeW = 56;
  const gap = 64;
  const totalW = n * nodeW + (n - 1) * gap;
  const svgW = Math.max(totalW + 120, 500);
  const svgH = 220;
  const startX = (svgW - totalW) / 2;
  const cy = svgH / 2 + 10;

  const nodeX = (i: number) => startX + i * (nodeW + gap) + nodeW / 2;

  return (
    <div className={s.canvasArea} ref={containerRef}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowGray" viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#b0a898" />
          </marker>
          <marker id="arrowGreen" viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#4CAF50" />
          </marker>
          <marker id="arrowOrange" viewBox="0 0 10 7" refX="10" refY="3.5"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#FF9800" />
          </marker>
        </defs>

        {/* Edges */}
        {nodes.map((_, i) => {
          if (i === n - 1) return null;
          const isReversed = reversedEdges.has(i);
          const isHighlight =
            step.highlightEdge &&
            step.highlightEdge[0] === i;

          if (isReversed) {
            // Draw reversed arrow: from i back to i-1 (or null)
            // Curved arrow going below
            const fromX = nodeX(i);
            const toX = i > 0 ? nodeX(i - 1) : fromX - gap;
            const curveY = cy + 44;
            return (
              <path
                key={`edge-${i}`}
                d={`M${fromX},${cy + 22} Q${(fromX + toX) / 2},${curveY} ${toX + (i > 0 ? 28 : 0)},${cy + (i > 0 ? 22 : 0)}`}
                fill="none"
                stroke={isHighlight ? "#FF9800" : "#4CAF50"}
                strokeWidth={isHighlight ? 3 : 2}
                markerEnd={isHighlight ? "url(#arrowOrange)" : "url(#arrowGreen)"}
                style={{ transition: "stroke 0.3s" }}
              />
            );
          } else {
            // Normal forward arrow
            const fromX = nodeX(i) + nodeW / 2 - 2;
            const toX = nodeX(i + 1) - nodeW / 2 + 2;
            return (
              <line
                key={`edge-${i}`}
                x1={fromX}
                y1={cy}
                x2={toX}
                y2={cy}
                stroke="#b0a898"
                strokeWidth={1.5}
                markerEnd="url(#arrowGray)"
                style={{ transition: "all 0.3s" }}
              />
            );
          }
        })}

        {/* First node reversed edge to null */}
        {reversedEdges.has(0) && !step.highlightEdge?.includes(0) && (
          <g>
            <line
              x1={nodeX(0) - nodeW / 2}
              y1={cy}
              x2={nodeX(0) - nodeW / 2 - 30}
              y2={cy}
              stroke="#4CAF50"
              strokeWidth={2}
              markerEnd="url(#arrowGreen)"
            />
            <text
              x={nodeX(0) - nodeW / 2 - 38}
              y={cy + 4}
              textAnchor="end"
              fill="#4CAF50"
              fontSize="11"
              fontWeight="bold"
              fontFamily="var(--font-mono), monospace"
            >
              null
            </text>
          </g>
        )}

        {/* Null at end (original) */}
        {!reversedEdges.has(n - 1) && (
          <g>
            <line
              x1={nodeX(n - 1) + nodeW / 2}
              y1={cy}
              x2={nodeX(n - 1) + nodeW / 2 + 30}
              y2={cy}
              stroke="#b0a898"
              strokeWidth={1.5}
              markerEnd="url(#arrowGray)"
            />
            <text
              x={nodeX(n - 1) + nodeW / 2 + 38}
              y={cy + 4}
              textAnchor="start"
              fill="#b0a898"
              fontSize="11"
              fontFamily="var(--font-mono), monospace"
            >
              null
            </text>
          </g>
        )}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const x = nodeX(i);
          const isCurr = i === currIdx;
          const isPrev = i === prevIdx;
          const isNext = i === nextIdx;
          const isCompleted = step.kind === "complete";

          let fill = "#f5f0e8";
          let stroke = "#c5c0b8";
          let textFill = "#5a5549";

          if (isCompleted) {
            fill = "#4CAF50";
            stroke = "#2E7D32";
            textFill = "#fff";
          } else if (isCurr) {
            fill = "#2196F3";
            stroke = "#1565C0";
            textFill = "#fff";
          } else if (isPrev) {
            fill = "#FF9800";
            stroke = "#E65100";
            textFill = "#fff";
          } else if (isNext) {
            fill = "#9C27B0";
            stroke = "#6A1B9A";
            textFill = "#fff";
          } else if (reversedEdges.has(i)) {
            fill = "#E8F5E9";
            stroke = "#4CAF50";
            textFill = "#2E7D32";
          }

          return (
            <g key={node.id}>
              {/* Pulse for curr */}
              {isCurr && (
                <circle
                  cx={x}
                  cy={cy}
                  r={32}
                  fill="none"
                  stroke="#2196F3"
                  strokeWidth={2}
                  opacity={0.4}
                >
                  <animate
                    attributeName="r"
                    values="30;38;30"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0.15;0.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              <rect
                x={x - nodeW / 2}
                y={cy - 22}
                width={nodeW}
                height={44}
                rx={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurr || isPrev ? 3 : 2}
                style={{ transition: "fill 0.3s, stroke 0.3s" }}
              />
              <text
                x={x}
                y={cy + 5}
                textAnchor="middle"
                fill={textFill}
                fontSize="15"
                fontWeight="bold"
                fontFamily="var(--font-mono), monospace"
                style={{ transition: "fill 0.3s" }}
              >
                {node.value}
              </text>

              {/* Pointer labels above */}
              {isPrev && (
                <text
                  x={x}
                  y={cy - 34}
                  textAnchor="middle"
                  fill="#FF9800"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="var(--font-mono), monospace"
                >
                  prev
                </text>
              )}
              {isCurr && (
                <text
                  x={x}
                  y={cy - (isPrev ? 48 : 34)}
                  textAnchor="middle"
                  fill="#2196F3"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="var(--font-mono), monospace"
                >
                  curr
                </text>
              )}
              {isNext && (
                <text
                  x={x}
                  y={cy - (isPrev || isCurr ? 48 : 34)}
                  textAnchor="middle"
                  fill="#9C27B0"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="var(--font-mono), monospace"
                >
                  next
                </text>
              )}
            </g>
          );
        })}

        {/* prev = null label when prevIdx === -1 */}
        {prevIdx === -1 && step.kind !== "complete" && (
          <text
            x={nodeX(0) - nodeW / 2 - 20}
            y={cy - 30}
            textAnchor="middle"
            fill="#FF9800"
            fontSize="10"
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            prev=null
          </text>
        )}

        {/* curr = null label when currIdx === -1 and not complete */}
        {currIdx === -1 && step.kind !== "complete" && step.kind !== "init" && (
          <text
            x={nodeX(n - 1) + nodeW / 2 + 30}
            y={cy - 30}
            textAnchor="middle"
            fill="#2196F3"
            fontSize="10"
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            curr=null
          </text>
        )}
      </svg>
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
  if (!t) return { ok: false, error: "请输入至少一个数字" };
  const parts = t.split(",").map((s) => s.trim());
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^-?\d+$/.test(p)) return { ok: false, error: "请输入有效的整数" };
    nums.push(parseInt(p, 10));
  }
  if (nums.length > 8) return { ok: false, error: "最多支持 8 个节点" };
  if (nums.length < 1) return { ok: false, error: "至少需要 1 个节点" };
  return { ok: true, nums };
}

function randomList(): string {
  const len = Math.floor(Math.random() * 4) + 3;
  const nums: number[] = [];
  for (let i = 0; i < len; i++) {
    nums.push(Math.floor(Math.random() * 9) + 1);
  }
  return nums.join(",");
}

/* ================================================================
   Main component
   ================================================================ */

const PRESETS = [
  { label: "[1,2,3]", value: "1,2,3" },
  { label: "[1,2,3,4,5]", value: "1,2,3,4,5" },
];

export function ReverseLinkedListViz() {
  const [inputText, setInputText] = useState("1,2,3,4,5");
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
    const val = randomList();
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
    const prevVal =
      st.prevIdx >= 0 ? `节点(${st.nodes[st.prevIdx].value})` : "nullptr";
    const currVal =
      st.currIdx >= 0 ? `节点(${st.nodes[st.currIdx].value})` : "nullptr";
    const nextVal =
      st.nextIdx >= 0 ? `节点(${st.nodes[st.nextIdx].value})` : "nullptr";

    display[4] = `prev = ${prevVal}`;
    display[5] = `curr = ${currVal}`;
    if (st.kind === "save-next" || st.kind === "reverse-pointer") {
      display[7] = `next = ${nextVal}`;
    }
    return display;
  }, [currentStep]);

  const memoryVars = useMemo(() => {
    if (!currentStep) return undefined;
    const st = currentStep;
    return [
      {
        name: "prev",
        value:
          st.prevIdx >= 0 ? `节点(${st.nodes[st.prevIdx].value})` : "nullptr",
      },
      {
        name: "curr",
        value:
          st.currIdx >= 0 ? `节点(${st.nodes[st.currIdx].value})` : "nullptr",
      },
      {
        name: "next",
        value:
          st.nextIdx >= 0 ? `节点(${st.nodes[st.nextIdx].value})` : "nullptr",
      },
    ];
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
              <div className={s.overline}>LeetCode 206 · 简单</div>
              <h1 className={s.title}>
                <span className={s.titleIcon}>🔗 </span>反转链表
              </h1>
              <p className={s.description}>
                迭代法反转链表 — prev / curr / next
                三指针逐步推进，动画演示指针翻转全过程。
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
            placeholder="1,2,3,4,5"
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
              <LinkedListVis step={currentStep} />

              {/* Step explanation */}
              {currentStep && (
                <div
                  className={`${s.infoPanel} ${s.infoPanelAccent} ${
                    currentStep.kind === "reverse-pointer"
                      ? s.infoPanelOrange
                      : currentStep.kind === "complete"
                        ? s.infoPanelGreen
                        : s.infoPanelBlue
                  }`}
                >
                  <div className={s.stepHeader}>
                    <span className={s.stepIcon}>
                      {currentStep.kind === "reverse-pointer"
                        ? "🔄"
                        : currentStep.kind === "complete"
                          ? "✅"
                          : "➡️"}
                    </span>
                    <span className={s.stepTitle}>
                      {currentStep.kind === "init" && "初始化"}
                      {currentStep.kind === "save-next" && "保存 next"}
                      {currentStep.kind === "reverse-pointer" && "翻转指针"}
                      {currentStep.kind === "move-prev" && "移动 prev"}
                      {currentStep.kind === "move-curr" && "移动 curr"}
                      {currentStep.kind === "complete" && "反转完成"}
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
                      style={{ background: "#2196F3" }}
                    />
                    curr 指针
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#FF9800" }}
                    />
                    prev 指针
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#9C27B0" }}
                    />
                    next 指针
                  </div>
                  <div className={s.legendItem}>
                    <span
                      className={s.legendDot}
                      style={{ background: "#4CAF50" }}
                    />
                    已反转
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>🔗</div>
            <h3 className={s.emptyTitle}>输入链表数据开始可视化</h3>
            <p className={s.emptyText}>
              输入逗号分隔的数字（如 1,2,3,4,5），点击「开始」按钮
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
