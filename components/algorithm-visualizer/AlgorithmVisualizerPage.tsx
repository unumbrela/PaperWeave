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
import * as d3 from "d3";
import s from "./algorithm-visualizer.module.css";

/* ================================================================
   Types
   ================================================================ */

type StepType = "select" | "backtrack" | "complete";
type AnimationState = "idle" | "playing" | "paused" | "completed";
type NodeVisualState =
  | "unvisited"
  | "visiting"
  | "visited"
  | "backtracked"
  | "complete";

interface AnimationStep {
  type: StepType;
  nodeId: string;
  currentPath: number[];
  available: number[];
  result?: number[];
}

interface TreeNode {
  id: string;
  value: number | null;
  children: TreeNode[];
  depth: number;
  path: number[];
}

interface StepContext {
  stepType: StepType;
  currentPath: number[];
  available: number[];
  selectedNumber: number | null;
  alternatives: number[];
}

interface StepExplanationData {
  title: string;
  main: string;
  reason: string;
  next: string;
}

const NODE_COLORS: Record<NodeVisualState, string> = {
  unvisited: "#d6d3cd",
  visiting: "#4CAF50",
  visited: "#3b6ef6",
  backtracked: "#FF9800",
  complete: "#9C27B0",
};

const LEGEND = [
  { color: NODE_COLORS.unvisited, label: "未访问" },
  { color: NODE_COLORS.visiting, label: "正在访问" },
  { color: NODE_COLORS.visited, label: "已访问" },
  { color: NODE_COLORS.backtracked, label: "回溯" },
  { color: NODE_COLORS.complete, label: "完成" },
];

/* ================================================================
   Engine — permutation tree + steps
   ================================================================ */

function nodeIdFromPath(path: number[]): string {
  return path.length === 0 ? "node-root" : `node-${path.join("-")}`;
}

function buildTree(nums: number[]): TreeNode {
  const root: TreeNode = {
    id: nodeIdFromPath([]),
    value: null,
    children: [],
    depth: 0,
    path: [],
  };
  buildTreeRec(root, nums, []);
  return root;
}

function buildTreeRec(
  parent: TreeNode,
  available: number[],
  currentPath: number[],
) {
  for (const num of available) {
    const newPath = [...currentPath, num];
    const child: TreeNode = {
      id: nodeIdFromPath(newPath),
      value: num,
      children: [],
      depth: parent.depth + 1,
      path: newPath,
    };
    parent.children.push(child);
    const remaining = available.filter((n) => n !== num);
    if (remaining.length > 0) buildTreeRec(child, remaining, newPath);
  }
}

function generateSteps(nums: number[]): AnimationStep[] {
  const steps: AnimationStep[] = [];
  backtrack(nums, [], nums, steps);
  return steps;
}

function backtrack(
  original: number[],
  currentPath: number[],
  available: number[],
  steps: AnimationStep[],
): { finalPath: number[]; finalAvailable: number[] } {
  if (available.length === 0) {
    steps.push({
      type: "complete",
      nodeId: nodeIdFromPath(currentPath),
      currentPath: [...currentPath],
      available: [],
      result: [...currentPath],
    });
    return { finalPath: [...currentPath], finalAvailable: [] };
  }

  let lastFinalPath = [...currentPath];
  let lastFinalAvailable = [...available];

  for (let i = 0; i < available.length; i++) {
    const num = available[i];
    const newPath = [...currentPath, num];
    const newAvailable = available.filter((_, idx) => idx !== i);

    steps.push({
      type: "select",
      nodeId: nodeIdFromPath(newPath),
      currentPath: newPath,
      available: newAvailable,
    });

    const result = backtrack(original, newPath, newAvailable, steps);
    lastFinalPath = result.finalPath;
    lastFinalAvailable = result.finalAvailable;

    if (i < available.length - 1) {
      generateBacktrackSteps(
        steps,
        lastFinalPath,
        lastFinalAvailable,
        currentPath,
        original,
      );
      lastFinalPath = [...currentPath];
      lastFinalAvailable = [...available];
    }
  }
  return { finalPath: lastFinalPath, finalAvailable: lastFinalAvailable };
}

function generateBacktrackSteps(
  steps: AnimationStep[],
  fromPath: number[],
  fromAvailable: number[],
  toPath: number[],
  original: number[],
) {
  const tempPath = [...fromPath];
  let tempAvailable = [...fromAvailable];

  while (tempPath.length > toPath.length) {
    const removedNum = tempPath.pop()!;
    tempAvailable = [...tempAvailable, removedNum].sort(
      (a, b) => original.indexOf(a) - original.indexOf(b),
    );
    steps.push({
      type: "backtrack",
      nodeId: nodeIdFromPath(tempPath),
      currentPath: [...tempPath],
      available: [...tempAvailable],
    });
  }
}

/* ================================================================
   Engine — helpers (progress, annotations)
   ================================================================ */

function getHighlightPath(tree: TreeNode, nodeId: string): string[] {
  function find(node: TreeNode, path: string[]): string[] | null {
    const p = [...path, node.id];
    if (node.id === nodeId) return p;
    for (const c of node.children) {
      const found = find(c, p);
      if (found) return found;
    }
    return null;
  }
  return find(tree, []) ?? [];
}

function getDimmedNodes(
  tree: TreeNode,
  currentNodeId: string,
  visitedNodes: Set<string>,
): Set<string> {
  const dimmed = new Set<string>();
  const highlightSet = new Set(getHighlightPath(tree, currentNodeId));
  function traverse(node: TreeNode) {
    if (!highlightSet.has(node.id) && !visitedNodes.has(node.id))
      dimmed.add(node.id);
    for (const c of node.children) traverse(c);
  }
  traverse(tree);
  return dimmed;
}

function createStepContext(
  stepType: StepType,
  currentPath: number[],
  available: number[],
  previousPath: number[],
  previousAvailable: number[],
): StepContext {
  let selectedNumber: number | null = null;
  let alternatives: number[] = [];

  if (stepType === "select") {
    selectedNumber = currentPath[currentPath.length - 1];
    alternatives = previousAvailable.filter((n) => n !== selectedNumber);
  } else if (stepType === "backtrack") {
    selectedNumber = previousPath[previousPath.length - 1];
    alternatives = available.filter((n) => n !== selectedNumber);
  }
  return { stepType, currentPath, available, selectedNumber, alternatives };
}

function generateStepExplanation(ctx: StepContext): StepExplanationData {
  switch (ctx.stepType) {
    case "select":
      return {
        title: "选择数字",
        main: `选择数字 ${ctx.selectedNumber} 放在第 ${ctx.currentPath.length} 个位置`,
        reason: `当前按顺序尝试可选数字，选择了 ${ctx.selectedNumber}`,
        next:
          ctx.alternatives.length > 0
            ? `如果这条路径走不通，会回来尝试 ${ctx.alternatives[0]}`
            : "继续向下探索",
      };
    case "backtrack":
      return {
        title: "回溯",
        main: `撤销选择，将 ${ctx.selectedNumber} 放回可选列表`,
        reason: "当前分支已探索完毕",
        next:
          ctx.alternatives.length > 0
            ? "返回上一层，尝试其他选择"
            : "继续回溯到更上一层",
      };
    case "complete":
      return {
        title: "找到排列",
        main: `成功找到一个排列：[${ctx.currentPath.join(", ")}]`,
        reason: "所有数字都已使用，当前路径就是一个完整的排列",
        next: "记录这个结果，然后回溯寻找其他排列",
      };
  }
}

/* ================================================================
   C++ Code Panel — code, tokenizer, line mappings
   ================================================================ */

type TokenType =
  | "keyword"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "variable"
  | "method"
  | "operator"
  | "punctuation"
  | "plain";

interface CodeToken {
  type: TokenType;
  value: string;
}

const CPP_CODE = `class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> res;
        int n = nums.size();
        vector<bool> used(n, false);
        vector<int> path;
        dfs(nums, n, 0, path, used, res);
        return res;
    }

    void dfs(vector<int>& nums, int n, int depth,
             vector<int>& path, vector<bool>& used,
             vector<vector<int>>& res) {
        if (depth == n) {
            res.push_back(path);
            return;
        }
        for (int i = 0; i < n; i++) {
            if (used[i]) continue;
            path.push_back(nums[i]);
            used[i] = true;
            dfs(nums, n, depth + 1, path, used, res);
            path.pop_back();
            used[i] = false;
        }
    }
};`;

const CPP_KEYWORDS = [
  "class", "public", "private", "protected", "void", "if", "else",
  "for", "while", "do", "switch", "case", "break", "continue",
  "return", "new", "delete", "this", "true", "false", "nullptr",
  "const", "static", "virtual", "override", "template", "typename",
  "using", "namespace", "struct", "enum", "typedef",
];

const CPP_TYPES = [
  "int", "long", "short", "char", "float", "double", "bool",
  "string", "vector", "deque", "array", "map", "set", "pair",
  "size_t", "auto",
];

// Which lines get a soft background highlight for each step type
const CPP_LINE_HIGHLIGHT: Record<StepType, number[]> = {
  select: [19, 20, 21, 22, 23],
  backtrack: [24, 25],
  complete: [15, 16, 17],
};

// The single "current execution" line with ▶ arrow
const CPP_EXEC_LINE: Record<StepType, number> = {
  select: 21,
  backtrack: 24,
  complete: 16,
};

// Variables to show inline on certain lines
const CPP_VAR_LINES: Record<number, string[]> = {
  4: ["res"],
  5: ["n"],
  6: ["used"],
  7: ["path"],
  15: ["depth", "n"],
  19: ["i", "n"],
  20: ["used[i]"],
  21: ["nums[i]"],
  22: ["used[i]"],
};

function tokenizeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;
  while (i < line.length) {
    if (/\s/.test(line[i])) {
      let ws = "";
      while (i < line.length && /\s/.test(line[i])) ws += line[i++];
      tokens.push({ type: "plain", value: ws });
      continue;
    }
    if (line.slice(i, i + 2) === "//") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let str = q;
      i++;
      while (i < line.length && line[i] !== q) {
        if (line[i] === "\\" && i + 1 < line.length) {
          str += line[i] + line[i + 1];
          i += 2;
        } else str += line[i++];
      }
      if (i < line.length) { str += q; i++; }
      tokens.push({ type: "string", value: str });
      continue;
    }
    if (/\d/.test(line[i])) {
      let num = "";
      while (i < line.length && /[\d.xXa-fA-F]/.test(line[i])) num += line[i++];
      tokens.push({ type: "number", value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(line[i])) {
      let id = "";
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) id += line[i++];
      let t: TokenType = "variable";
      if (CPP_KEYWORDS.includes(id)) t = "keyword";
      else if (CPP_TYPES.includes(id)) t = "type";
      else if (i < line.length && line[i] === "(") t = "method";
      tokens.push({ type: t, value: id });
      continue;
    }
    const ops = [
      "::", "<<", ">>", "==", "!=", "<=", ">=", "&&", "||",
      "++", "--", "+=", "-=", "->",
      "<", ">", "+", "-", "*", "/", "%", "=", "!", "&", "|", ":",
    ];
    let found = false;
    for (const op of ops) {
      if (line.slice(i, i + op.length) === op) {
        tokens.push({ type: "operator", value: op });
        i += op.length;
        found = true;
        break;
      }
    }
    if (found) continue;
    if (/[{}()\[\];,.<>@#]/.test(line[i])) {
      tokens.push({ type: "punctuation", value: line[i] });
      i++;
      continue;
    }
    tokens.push({ type: "plain", value: line[i] });
    i++;
  }
  return tokens;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  keyword: "tkKeyword",
  type: "tkType",
  string: "tkString",
  number: "tkNumber",
  comment: "tkComment",
  variable: "tkVariable",
  method: "tkMethod",
  operator: "tkOperator",
  punctuation: "tkPunctuation",
  plain: "tkPlain",
};

interface CodePanelProps {
  stepType: StepType | null;
  currentPath: number[];
  available: number[];
  inputNumbers: number[];
  resultCount: number;
}

function CodePanel({
  stepType,
  currentPath,
  available,
  inputNumbers,
  resultCount,
}: CodePanelProps) {
  const lines = useMemo(() => {
    return CPP_CODE.split("\n").map((content, idx) => ({
      lineNumber: idx + 1,
      content,
      tokens: tokenizeLine(content),
    }));
  }, []);

  const highlightedLines = useMemo(
    () => (stepType ? CPP_LINE_HIGHLIGHT[stepType] ?? [] : []),
    [stepType],
  );

  const execLine = useMemo(
    () => (stepType ? CPP_EXEC_LINE[stepType] ?? null : null),
    [stepType],
  );

  // Compute variable values for inline display
  const getVarValue = useMemo(() => {
    const depth = currentPath.length;
    const n = inputNumbers.length;
    const used = inputNumbers.map((num) => !available.includes(num));
    const curI =
      currentPath.length > 0
        ? inputNumbers.indexOf(currentPath[currentPath.length - 1])
        : 0;

    return (name: string): string | null => {
      switch (name) {
        case "res":
          return `size=${resultCount}`;
        case "n":
          return `${n}`;
        case "used":
          return `{${used.map((u) => (u ? "T" : "F")).join(",")}}`;
        case "path":
          return `{${currentPath.join(",")}}`;
        case "depth":
          return `${depth}`;
        case "i":
          return `${curI}`;
        case "used[i]":
          return curI >= 0 && curI < used.length ? `${used[curI]}` : null;
        case "nums[i]":
          return curI >= 0 && curI < inputNumbers.length
            ? `${inputNumbers[curI]}`
            : null;
        default:
          return null;
      }
    };
  }, [currentPath, available, inputNumbers, resultCount]);

  const getLineVarDisplay = (ln: number): string | null => {
    const vars = CPP_VAR_LINES[ln];
    if (!vars || inputNumbers.length === 0) return null;
    const parts = vars
      .map((v) => {
        const val = getVarValue(v);
        return val !== null ? `${v}=${val}` : null;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className={s.codePanel}>
      <div className={s.codeHeader}>
        <div className={s.codeFileInfo}>
          <span className={s.codeFileIcon}>📄</span>
          <span>Solution.cpp</span>
        </div>
        <span style={{ fontSize: "0.65rem", color: "#858585" }}>C++</span>
      </div>

      <div className={s.codeContent}>
        {lines.map((line) => {
          const isHL = highlightedLines.includes(line.lineNumber);
          const isCur = execLine === line.lineNumber;
          const varDisplay = getLineVarDisplay(line.lineNumber);

          return (
            <div
              key={line.lineNumber}
              className={[
                s.codeLine,
                isHL ? s.codeLineHighlighted : "",
                isCur ? s.codeLineCurrent : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={s.gutter}>
                <span className={s.lineNumber}>{line.lineNumber}</span>
                {isCur && <span className={s.execArrow}>▶</span>}
              </div>
              <div className={s.lineContent}>
                {line.tokens.map((tok, ti) => (
                  <span key={ti} className={s[TOKEN_CLASS[tok.type]]}>
                    {tok.value}
                  </span>
                ))}
                {varDisplay && (
                  <span className={s.inlineVar}>{`// ${varDisplay}`}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini memory panel */}
      {inputNumbers.length > 0 && (
        <div className={s.memoryPanel}>
          <div className={s.memoryTitle}>Variables</div>
          <div className={s.memoryRow}>
            <span className={s.memoryName}>path</span>
            <span className={s.memoryEq}>=</span>
            <span className={s.memoryValue}>
              {"{"}{currentPath.join(", ")}
              {"}"}
            </span>
          </div>
          <div className={s.memoryRow}>
            <span className={s.memoryName}>used</span>
            <span className={s.memoryEq}>=</span>
            <span className={s.memoryValue}>
              {"{"}{inputNumbers.map((n) => (!available.includes(n) ? "T" : "F")).join(", ")}
              {"}"}
            </span>
          </div>
          <div className={s.memoryRow}>
            <span className={s.memoryName}>res</span>
            <span className={s.memoryEq}>=</span>
            <span className={s.memoryValue}>size={resultCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Engine — input validation
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
    const n = parseInt(p, 10);
    if (n < -10 || n > 10) return { ok: false, error: "数字必须在 -10 到 10 之间" };
    nums.push(n);
  }
  if (nums.length > 6) return { ok: false, error: "最多支持 6 个数字" };
  if (new Set(nums).size !== nums.length)
    return { ok: false, error: "数字不能重复" };
  return { ok: true, nums };
}

function randomArray(): string {
  const len = Math.floor(Math.random() * 4) + 2;
  const pool = [1, 2, 3, 4, 5, 6];
  const nums: number[] = [];
  for (let i = 0; i < len; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    nums.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return nums.join(",");
}

/* ================================================================
   Hook — animation controller
   ================================================================ */

function useAnimationController(
  steps: AnimationStep[],
  onStepChange: (step: AnimationStep, index: number) => void,
) {
  const [state, setState] = useState<AnimationState>("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [speed, setSpeedRaw] = useState(500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const executeStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStepIndex(index);
        onStepChange(steps[index], index);
        if (index === steps.length - 1) {
          setState("completed");
          clearTimer();
        }
      }
    },
    [steps, onStepChange, clearTimer],
  );

  const play = useCallback(() => {
    if (steps.length === 0) return;
    if (state === "completed") setCurrentStepIndex(-1);
    setState("playing");
  }, [steps.length, state]);

  const pause = useCallback(() => {
    setState("paused");
    clearTimer();
  }, [clearTimer]);

  const stepForward = useCallback(() => {
    if (!steps.length) return;
    const next = currentStepIndex + 1;
    if (next < steps.length) {
      executeStep(next);
      if (state === "idle") setState("paused");
    }
  }, [steps.length, currentStepIndex, executeStep, state]);

  const stepBackward = useCallback(() => {
    if (!steps.length) return;
    const prev = currentStepIndex - 1;
    if (prev >= 0) {
      executeStep(prev);
      if (state === "completed") setState("paused");
    } else if (currentStepIndex === 0) {
      setCurrentStepIndex(-1);
      setState("idle");
    }
  }, [steps.length, currentStepIndex, executeStep, state]);

  const goToStep = useCallback(
    (index: number) => {
      if (!steps.length || index < 0 || index >= steps.length) return;
      clearTimer();
      executeStep(index);
      if (state === "playing" || state === "idle") setState("paused");
    },
    [steps.length, executeStep, clearTimer, state],
  );

  const reset = useCallback(() => {
    clearTimer();
    setState("idle");
    setCurrentStepIndex(-1);
  }, [clearTimer]);

  const setSpeed = useCallback((ms: number) => {
    setSpeedRaw(Math.max(100, Math.min(2000, ms)));
  }, []);

  useEffect(() => {
    if (state === "playing") {
      clearTimer();
      const tick = () => {
        setCurrentStepIndex((prev) => {
          const next = prev + 1;
          if (next < steps.length) {
            onStepChange(steps[next], next);
            if (next === steps.length - 1) {
              setState("completed");
              clearTimer();
            }
            return next;
          }
          return prev;
        });
      };
      if (currentStepIndex === -1) tick();
      intervalRef.current = setInterval(tick, speed);
    }
    return () => {
      if (state !== "playing") clearTimer();
    };
  }, [state, speed, steps, onStepChange, clearTimer, currentStepIndex]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    state,
    currentStepIndex,
    speed,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    setSpeed,
    goToStep,
  };
}

/* ================================================================
   D3 Tree Visualization — as a sub-component
   ================================================================ */

interface TreeVisProps {
  tree: TreeNode | null;
  currentNodeId: string | null;
  visitedNodes: Set<string>;
  completedNodes: Set<string>;
  backtrackedNodes: Set<string>;
  highlightPath: string[] | null;
  stepType: StepType | null;
}

interface D3TreeNode {
  id: string;
  value: number | null;
  children?: D3TreeNode[];
  path: number[];
}

function TreeVisualization({
  tree,
  currentNodeId,
  visitedNodes,
  completedNodes,
  backtrackedNodes,
  highlightPath,
  stepType,
}: TreeVisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tree || !svgRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 500);
    const height = Math.max(rect.height, 380);
    const margin = { top: 50, right: 30, bottom: 30, left: 30 };

    const sel = d3.select(svgRef.current);
    sel.selectAll("*").remove();

    const svg = sel
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy<D3TreeNode>(tree as D3TreeNode);
    const treeLayout = d3
      .tree<D3TreeNode>()
      .size([
        width - margin.left - margin.right,
        height - margin.top - margin.bottom - 20,
      ]);
    const treeData = treeLayout(root);

    const currentPathIds = currentNodeId
      ? new Set(getHighlightPath(tree, currentNodeId))
      : new Set<string>();
    const dimmedNodes =
      currentNodeId
        ? getDimmedNodes(tree, currentNodeId, visitedNodes)
        : new Set<string>();

    const getNodeState = (id: string): NodeVisualState => {
      if (id === currentNodeId) return "visiting";
      if (completedNodes.has(id)) return "complete";
      if (backtrackedNodes.has(id)) return "backtracked";
      if (visitedNodes.has(id)) return "visited";
      return "unvisited";
    };

    const isHL = (id: string) => highlightPath?.includes(id) ?? false;
    const inPath = (id: string) => currentPathIds.has(id);
    const isDim = (id: string) => dimmedNodes.has(id);

    // Links
    g.selectAll(".link")
      .data(treeData.links())
      .enter()
      .append("path")
      .attr(
        "d",
        (d) =>
          `M${d.source.x},${d.source.y}C${d.source.x},${(d.source.y + d.target.y) / 2} ${d.target.x},${(d.source.y + d.target.y) / 2} ${d.target.x},${d.target.y}`,
      )
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const id = d.target.data.id;
        if (isHL(id)) return "#9C27B0";
        if (inPath(id)) return "#4CAF50";
        if (isDim(id)) return "#d6d3cd";
        return "#c5c0b8";
      })
      .attr("stroke-width", (d) => {
        const id = d.target.data.id;
        return isHL(id) || inPath(id) ? 3 : 1.5;
      })
      .attr("opacity", (d) => (isDim(d.target.data.id) ? 0.3 : 1))
      .style("transition", "stroke 0.3s, stroke-width 0.3s, opacity 0.3s");

    // Node groups
    const nodes = g
      .selectAll<SVGGElement, d3.HierarchyPointNode<D3TreeNode>>(".node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");

    // Pulse ring on current node
    nodes
      .filter((d) => d.data.id === currentNodeId)
      .append("circle")
      .attr("r", 20)
      .attr("fill", "none")
      .attr("stroke", "#4CAF50")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6)
      .style("animation", "pulseAnimation 1.5s ease-in-out infinite");

    // Main node circle
    nodes
      .append("circle")
      .attr("r", (d) => (d.data.value === null ? 12 : 16))
      .attr("fill", (d) => {
        if (isHL(d.data.id)) return "#9C27B0";
        return NODE_COLORS[getNodeState(d.data.id)];
      })
      .attr("stroke", (d) => {
        if (d.data.id === currentNodeId) return "#2E7D32";
        if (isHL(d.data.id)) return "#7B1FA2";
        if (inPath(d.data.id)) return "#4CAF50";
        return "transparent";
      })
      .attr("stroke-width", 3)
      .attr("opacity", (d) => (isDim(d.data.id) ? 0.3 : 1))
      .style(
        "transition",
        "fill 0.3s ease, stroke 0.3s ease, opacity 0.3s ease",
      )
      .style(
        "filter",
        (d) =>
          d.data.id === currentNodeId
            ? "drop-shadow(0 0 8px rgba(76,175,80,0.6))"
            : "none",
      );

    // Node label
    nodes
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", (d) => {
        const st = getNodeState(d.data.id);
        return st === "unvisited" && !isHL(d.data.id) ? "#8a8578" : "#fff";
      })
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("opacity", (d) => (isDim(d.data.id) ? 0.3 : 1))
      .style("pointer-events", "none")
      .text((d) => (d.data.value === null ? "根" : String(d.data.value)));

    // Annotation above current node
    if (currentNodeId) {
      const cur = treeData
        .descendants()
        .find((d) => d.data.id === currentNodeId);
      if (cur) {
        const labelText = annotationLabel(stepType);
        const labelW = labelText.length * 10 + 16;
        const ag = g
          .append("g")
          .attr("transform", `translate(${cur.x},${cur.y})`)
          .style("pointer-events", "none");

        ag.append("rect")
          .attr("x", -labelW / 2)
          .attr("y", -38)
          .attr("width", labelW)
          .attr("height", 20)
          .attr("rx", 10)
          .attr("fill", annotationColor(stepType))
          .attr("opacity", 0.9)
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))");

        ag.append("text")
          .attr("y", -24)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .attr("font-size", "11px")
          .attr("font-weight", "bold")
          .text(labelText);

        ag.append("path")
          .attr("d", "M0,-18 L-5,-12 L5,-12 Z")
          .attr("fill", annotationColor(stepType));
      }
    }
  }, [
    tree,
    currentNodeId,
    visitedNodes,
    completedNodes,
    backtrackedNodes,
    highlightPath,
    stepType,
  ]);

  return (
    <div className={s.canvasArea} ref={containerRef}>
      <svg ref={svgRef} />
    </div>
  );
}

function annotationLabel(st: StepType | null): string {
  if (st === "select") return "选择";
  if (st === "backtrack") return "回溯";
  if (st === "complete") return "找到排列!";
  return "访问中";
}

function annotationColor(st: StepType | null): string {
  if (st === "select") return "#4CAF50";
  if (st === "backtrack") return "#FF9800";
  if (st === "complete") return "#9C27B0";
  return "#3b6ef6";
}

/* ================================================================
   Main page component
   ================================================================ */

const PRESETS = [
  { label: "[1,2]", value: "1,2" },
  { label: "[1,2,3]", value: "1,2,3" },
  { label: "[1,2,3,4]", value: "1,2,3,4" },
];

export function AlgorithmVisualizerPage() {
  // === state ===
  const [inputNumbers, setInputNumbers] = useState<number[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [steps, setSteps] = useState<AnimationStep[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [backtrackedNodes, setBacktrackedNodes] = useState<Set<string>>(
    new Set(),
  );
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [available, setAvailable] = useState<number[]>([]);
  const [currentStepType, setCurrentStepType] = useState<StepType | null>(
    null,
  );
  const [lastSelected, setLastSelected] = useState<number | undefined>();
  const [results, setResults] = useState<number[][]>([]);
  const [hlPath, setHlPath] = useState<string[] | null>(null);
  const [prevPath, setPrevPath] = useState<number[]>([]);
  const [prevAvailable, setPrevAvailable] = useState<number[]>([]);

  // input
  const [inputText, setInputText] = useState("1,2,3");
  const [inputError, setInputError] = useState<string | null>(null);

  // rebuild accumulated state from step 0..targetIndex
  const rebuildState = useCallback(
    (targetIndex: number) => {
      const v = new Set<string>();
      const c = new Set<string>();
      const b = new Set<string>();
      const res: number[][] = [];
      for (let i = 0; i <= targetIndex; i++) {
        const step = steps[i];
        if (step.type === "select") v.add(step.nodeId);
        else if (step.type === "complete") {
          c.add(step.nodeId);
          if (step.result) res.push(step.result);
        } else if (step.type === "backtrack") {
          b.add(step.nodeId);
        }
      }
      setVisitedNodes(v);
      setCompletedNodes(c);
      setBacktrackedNodes(b);
      setResults(res);
    },
    [steps],
  );

  const handleStepChange = useCallback(
    (step: AnimationStep, index: number) => {
      setPrevPath(currentPath);
      setPrevAvailable(available);
      setCurrentNodeId(step.nodeId);
      setCurrentPath(step.currentPath);
      setAvailable(step.available);
      setCurrentStepType(step.type);
      rebuildState(index);
      if (step.type === "select") {
        setLastSelected(step.currentPath[step.currentPath.length - 1]);
      } else if (step.type === "backtrack") {
        setLastSelected(step.available[step.available.length - 1]);
      }
    },
    [currentPath, available, rebuildState],
  );

  const {
    state: animState,
    currentStepIndex,
    speed,
    play,
    pause,
    stepForward,
    stepBackward,
    reset: resetAnim,
    setSpeed,
    goToStep,
  } = useAnimationController(steps, handleStepChange);

  const isPlaying = animState === "playing";
  const isPaused = animState === "paused";

  // Submit new input
  const handleSubmit = useCallback(
    (nums: number[]) => {
      const t = buildTree(nums);
      const st = generateSteps(nums);
      setInputNumbers(nums);
      setTree(t);
      setSteps(st);
      setCurrentNodeId(null);
      setVisitedNodes(new Set());
      setCompletedNodes(new Set());
      setBacktrackedNodes(new Set());
      setCurrentPath([]);
      setAvailable(nums);
      setPrevPath([]);
      setPrevAvailable(nums);
      setResults([]);
      setHlPath(null);
      setCurrentStepType(null);
      setLastSelected(undefined);
      resetAnim();
    },
    [resetAnim],
  );

  const handleReset = useCallback(() => {
    resetAnim();
    setCurrentNodeId(null);
    setVisitedNodes(new Set());
    setCompletedNodes(new Set());
    setBacktrackedNodes(new Set());
    setCurrentPath([]);
    setAvailable(inputNumbers);
    setPrevPath([]);
    setPrevAvailable(inputNumbers);
    setResults([]);
    setHlPath(null);
    setCurrentStepType(null);
    setLastSelected(undefined);
  }, [resetAnim, inputNumbers]);

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

  // Result hover → highlight tree path
  const handleResultHover = useCallback(
    (result: number[] | null) => {
      if (!result || !tree) {
        setHlPath(null);
        return;
      }
      const findP = (
        node: TreeNode,
        target: number[],
        ids: string[],
      ): string[] | null => {
        const newIds = [...ids, node.id];
        if (
          node.children.length === 0 &&
          node.path.length === target.length &&
          node.path.every((v, i) => v === target[i])
        )
          return newIds;
        for (const c of node.children) {
          const f = findP(c, target, newIds);
          if (f) return f;
        }
        return null;
      };
      setHlPath(findP(tree, result, []));
    },
    [tree],
  );

  const displayAvailable = useMemo(() => {
    if (
      currentPath.length === 0 &&
      available.length === 0 &&
      inputNumbers.length > 0
    )
      return inputNumbers;
    return available;
  }, [currentPath, available, inputNumbers]);

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
        if (isPlaying) {
          pause();
        } else if (steps.length > 0) {
          play();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBackward();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, steps.length, play, pause, stepForward, stepBackward]);

  // Step explanation
  const explanation = useMemo<StepExplanationData | null>(() => {
    if (!currentStepType) return null;
    const ctx = createStepContext(
      currentStepType,
      currentPath,
      displayAvailable,
      prevPath,
      prevAvailable,
    );
    return generateStepExplanation(ctx);
  }, [currentStepType, currentPath, displayAvailable, prevPath, prevAvailable]);

  const stepCtx = useMemo<StepContext | null>(() => {
    if (!currentStepType) return null;
    return createStepContext(
      currentStepType,
      currentPath,
      displayAvailable,
      prevPath,
      prevAvailable,
    );
  }, [currentStepType, currentPath, displayAvailable, prevPath, prevAvailable]);

  const stepIcon =
    currentStepType === "select"
      ? "+"
      : currentStepType === "backtrack"
        ? "\u21A9"
        : currentStepType === "complete"
          ? "\u2713"
          : "\u2022";

  // Progress for step slider
  const sliderPct =
    steps.length > 1
      ? (Math.max(0, currentStepIndex) / (steps.length - 1)) * 100
      : 0;

  return (
    <div className={s.page}>
      <div className={s.container}>
        {/* Back link */}
        <Link href="/tools/algorithm-visualizer" className={s.backLink}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>返回 · 算法可视化</span>
        </Link>

        {/* Header */}
        <header className={s.header}>
          <div className={s.headerTop}>
            <div>
              <div className={s.overline}>学习 · 工具</div>
              <h1 className={s.title}>
                <span className={s.titleIcon}>🌳 </span>算法可视化
              </h1>
              <p className={s.description}>
                交互式回溯算法可视化 — 输入数字即刻生成决策树，逐步演示全排列的
                「选择 → 递归 → 回溯」全过程。
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
            placeholder="1,2,3"
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
          <div className={s.controlBar}>
            {isPlaying ? (
              <button
                className={`${s.controlBtn} ${s.pauseBtn}`}
                onClick={pause}
              >
                ⏸ 暂停 <span className={s.shortcutHint}>[空格]</span>
              </button>
            ) : (
              <button
                className={`${s.controlBtn} ${s.playBtn}`}
                onClick={play}
              >
                ▶{" "}
                {animState === "completed" ? "重播" : "播放"}{" "}
                <span className={s.shortcutHint}>[空格]</span>
              </button>
            )}

            <button
              className={`${s.controlBtn} ${s.stepBackBtn}`}
              onClick={stepBackward}
              disabled={currentStepIndex < 0 || isPlaying}
            >
              ⏮ 上一步 <span className={s.shortcutHint}>[←]</span>
            </button>
            <button
              className={`${s.controlBtn} ${s.stepFwdBtn}`}
              onClick={stepForward}
              disabled={
                currentStepIndex >= steps.length - 1 || isPlaying
              }
            >
              ⏭ 下一步 <span className={s.shortcutHint}>[→]</span>
            </button>
            <button
              className={`${s.controlBtn} ${s.resetBtn}`}
              onClick={handleReset}
              disabled={animState === "idle"}
            >
              ↺ 重置
            </button>

            <div className={s.speedControl}>
              <span className={s.speedLabel}>速度</span>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={2100 - speed}
                onChange={(e) => setSpeed(2100 - Number(e.target.value))}
                className={s.speedSlider}
              />
              <span className={s.speedValue}>{speed}ms</span>
            </div>

            <div className={s.stepIndicator}>
              <span className={s.stepText}>
                {currentStepIndex + 1} / {steps.length}
              </span>
              <input
                type="range"
                className={s.stepSlider}
                min={0}
                max={steps.length - 1}
                value={Math.max(0, currentStepIndex)}
                onChange={(e) => goToStep(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${sliderPct}%, var(--line, #ddd) ${sliderPct}%, var(--line, #ddd) 100%)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        {steps.length > 0 ? (
          <div className={s.mainContent}>
            {/* Left — C++ code panel */}
            <CodePanel
              stepType={currentStepType}
              currentPath={currentPath}
              available={displayAvailable}
              inputNumbers={inputNumbers}
              resultCount={results.length}
            />

            {/* Center — tree + state */}
            <div className={s.centerPanel}>
              <TreeVisualization
                tree={tree}
                currentNodeId={currentNodeId}
                visitedNodes={visitedNodes}
                completedNodes={completedNodes}
                backtrackedNodes={backtrackedNodes}
                highlightPath={hlPath}
                stepType={currentStepType}
              />

              {/* State display */}
              <div className={s.stateBar}>
                <div className={s.stateRow}>
                  <span className={s.stateLabel}>当前路径</span>
                  <div className={s.numberBoxes}>
                    {currentPath.length === 0 ? (
                      <span className={s.emptyHint}>[ 空 ]</span>
                    ) : (
                      currentPath.map((num, idx) => (
                        <div
                          key={`p-${idx}`}
                          className={`${s.numberBox} ${s.pathBox} ${
                            idx === currentPath.length - 1 &&
                            currentStepType === "select"
                              ? s.pathBoxAdded
                              : ""
                          }`}
                        >
                          {num}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {currentStepType && (
                  <div
                    className={`${s.arrowIndicator} ${
                      currentStepType === "select"
                        ? s.arrowSelect
                        : currentStepType === "backtrack"
                          ? s.arrowBacktrack
                          : s.arrowComplete
                    }`}
                  >
                    <span className={s.arrowIcon}>
                      {currentStepType === "select"
                        ? "↑"
                        : currentStepType === "backtrack"
                          ? "↓"
                          : "✓"}
                    </span>
                    <span>
                      {currentStepType === "select"
                        ? "选择"
                        : currentStepType === "backtrack"
                          ? "回溯"
                          : "完成"}
                    </span>
                  </div>
                )}

                <div className={s.stateRow}>
                  <span className={s.stateLabel}>可选数字</span>
                  <div className={s.numberBoxes}>
                    {displayAvailable.length === 0 ? (
                      <span className={s.emptyHint}>[ 空 ]</span>
                    ) : (
                      displayAvailable.map((num, idx) => (
                        <div
                          key={`a-${idx}`}
                          className={`${s.numberBox} ${s.availableBox} ${
                            num === lastSelected &&
                            currentStepType === "backtrack"
                              ? s.availableBoxReturned
                              : ""
                          }`}
                        >
                          {num}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <aside className={s.rightPanel}>
              {/* Step explanation */}
              <div
                className={`${s.stepExplanation} ${
                  currentStepType === "select"
                    ? s.stepExplanationSelect
                    : currentStepType === "backtrack"
                      ? s.stepExplanationBacktrack
                      : currentStepType === "complete"
                        ? s.stepExplanationComplete
                        : ""
                }`}
              >
                <div className={s.stepHeader}>
                  <span className={s.stepIcon}>{stepIcon}</span>
                  <span className={s.stepTitle}>
                    {explanation?.title ?? "准备开始"}
                  </span>
                  {currentStepIndex >= 0 && (
                    <span className={s.stepProgress}>
                      {currentStepIndex + 1} / {steps.length}
                    </span>
                  )}
                </div>

                <div className={s.stepMain}>
                  {explanation?.main ??
                    "点击「播放」或「下一步」按钮开始演示回溯算法"}
                </div>

                {explanation && (
                  <div>
                    {explanation.reason && (
                      <div className={s.detailSection}>
                        <span className={s.detailLabel}>为什么：</span>
                        <span className={s.detailText}>
                          {explanation.reason}
                        </span>
                      </div>
                    )}
                    {explanation.next && (
                      <div className={s.detailSection}>
                        <span className={s.detailLabel}>接下来：</span>
                        <span className={s.detailText}>
                          {explanation.next}
                        </span>
                      </div>
                    )}
                    {currentStepType === "select" &&
                      stepCtx?.alternatives &&
                      stepCtx.alternatives.length > 0 && (
                        <div className={s.alternativesSection}>
                          <span className={s.detailLabel}>其他选择：</span>
                          {stepCtx.alternatives.map((n, i) => (
                            <span key={i} className={s.alternativeNum}>
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {isPaused && currentStepType && (
                  <div className={s.pausedHint}>
                    ⏸ 动画已暂停 — 仔细观察当前状态，理解算法的决策过程
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className={s.legendPanel}>
                <div className={s.legendTitle}>图例</div>
                <div className={s.legendGrid}>
                  {LEGEND.map((l) => (
                    <div key={l.label} className={s.legendItem}>
                      <span
                        className={s.legendDot}
                        style={{ background: l.color }}
                      />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div className={s.resultsPanel}>
                <div className={s.resultsHeader}>
                  <span className={s.resultsTitle}>生成的排列</span>
                  <span className={s.resultsCount}>
                    共 {results.length} 个
                  </span>
                </div>
                <div className={s.resultsList}>
                  {results.length === 0 ? (
                    <div className={s.noResults}>等待生成排列…</div>
                  ) : (
                    results.map((r, i) => (
                      <div
                        key={i}
                        className={s.resultItem}
                        onMouseEnter={() => handleResultHover(r)}
                        onMouseLeave={() => handleResultHover(null)}
                      >
                        [{r.join(", ")}]
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          /* Empty state */
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>🌳</div>
            <h2 className={s.emptyTitle}>输入数字开始演示</h2>
            <p className={s.emptyText}>
              在上方输入框中输入 1-6 个不重复的数字（如 1,2,3），然后点击「开始」
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
