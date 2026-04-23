export type ToolSearchDay = {
  date: string;
  label: string;
  weekday: string;
  totalPages: number;
  toolPages: number;
  ratio: number;
  note: string;
};

function toRatio(toolPages: number, totalPages: number) {
  return Number(((toolPages / totalPages) * 100).toFixed(1));
}

export const toolSearchWeekData: ToolSearchDay[] = [
  {
    date: "2026-04-20",
    label: "04/20",
    weekday: "周一",
    totalPages: 472,
    toolPages: 119,
    ratio: toRatio(119, 472),
    note: "周一较忙，工具搜索明显偏高",
  },
  {
    date: "2026-04-21",
    label: "04/21",
    weekday: "周二",
    totalPages: 438,
    toolPages: 108,
    ratio: toRatio(108, 438),
    note: "延续前一天的高频使用",
  },
  {
    date: "2026-04-22",
    label: "04/22",
    weekday: "周三",
    totalPages: 396,
    toolPages: 68,
    ratio: toRatio(68, 396),
    note: "工作流趋于稳定，搜索回落",
  },
  {
    date: "2026-04-23",
    label: "04/23",
    weekday: "周四",
    totalPages: 371,
    toolPages: 56,
    ratio: toRatio(56, 371),
    note: "中段任务减少，工具相关继续下降",
  },
  {
    date: "2026-04-24",
    label: "04/24",
    weekday: "周五",
    totalPages: 429,
    toolPages: 97,
    ratio: toRatio(97, 429),
    note: "周五集中收尾，工具使用再次上升",
  },
  {
    date: "2026-04-25",
    label: "04/25",
    weekday: "周六",
    totalPages: 263,
    toolPages: 16,
    ratio: toRatio(16, 263),
    note: "周末仍有少量工具使用",
  },
  {
    date: "2026-04-26",
    label: "04/26",
    weekday: "周日",
    totalPages: 227,
    toolPages: 10,
    ratio: toRatio(10, 227),
    note: "周日更低，但仍非零",
  },
];

export const toolSearchWeekSummary = toolSearchWeekData.reduce(
  (acc, day) => {
    acc.totalPages += day.totalPages;
    acc.toolPages += day.toolPages;
    return acc;
  },
  { totalPages: 0, toolPages: 0 },
);

export const toolSearchWeekRatio = Number(
  ((toolSearchWeekSummary.toolPages / toolSearchWeekSummary.totalPages) * 100).toFixed(1),
);
