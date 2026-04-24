export interface AlgorithmMeta {
  slug: string;
  title: string;
  icon: string;
  subtitle: string;
  description: string;
  tags: string[];
  difficulty: "简单" | "中等" | "困难";
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    slug: "permutations",
    title: "LeetCode 46 · 全排列",
    icon: "🌳",
    subtitle: "Permutations",
    description:
      "回溯法经典入门：决策树可视化，逐步演示「选择 → 递归 → 回溯」全过程。",
    tags: ["回溯", "DFS", "递归"],
    difficulty: "中等",
  },
  {
    slug: "reverse-linked-list",
    title: "LeetCode 206 · 反转链表",
    icon: "🔗",
    subtitle: "Reverse Linked List",
    description:
      "迭代法反转链表：prev / curr / next 三指针逐步推进，动画演示指针翻转全过程。",
    tags: ["链表", "双指针", "迭代"],
    difficulty: "简单",
  },
  {
    slug: "longest-increasing-subsequence",
    title: "LeetCode 300 · 最长递增子序列",
    icon: "📈",
    subtitle: "Longest Increasing Subsequence",
    description:
      "O(n²) 动态规划：双重循环逐步比较 + DP 数组更新，直观理解状态转移方程。",
    tags: ["动态规划", "数组"],
    difficulty: "中等",
  },
];

export function getAlgorithm(slug: string): AlgorithmMeta | undefined {
  return ALGORITHMS.find((a) => a.slug === slug);
}
