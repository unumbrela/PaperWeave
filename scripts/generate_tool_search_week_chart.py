from __future__ import annotations

import csv
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np


DATA = [
    {"date": "2026-04-20", "weekday": "周一", "total_pages": 472, "tool_pages": 119, "note": "周一较忙，工具搜索明显偏高"},
    {"date": "2026-04-21", "weekday": "周二", "total_pages": 438, "tool_pages": 108, "note": "延续前一天的高频使用"},
    {"date": "2026-04-22", "weekday": "周三", "total_pages": 396, "tool_pages": 68, "note": "工作流趋于稳定，搜索回落"},
    {"date": "2026-04-23", "weekday": "周四", "total_pages": 371, "tool_pages": 56, "note": "中段任务减少，工具相关继续下降"},
    {"date": "2026-04-24", "weekday": "周五", "total_pages": 429, "tool_pages": 97, "note": "周五集中收尾，工具使用再次上升"},
    {"date": "2026-04-25", "weekday": "周六", "total_pages": 263, "tool_pages": 16, "note": "周末仍有少量工具使用"},
    {"date": "2026-04-26", "weekday": "周日", "total_pages": 227, "tool_pages": 10, "note": "周日更低，但仍非零"},
]


def enrich_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    enriched = []
    for row in rows:
        total = int(row["total_pages"])
        tool = int(row["tool_pages"])
        enriched.append(
            {
                **row,
                "non_tool_pages": total - tool,
                "ratio": round(tool / total * 100, 1),
                "label": row["date"][5:],
            }
        )
    return enriched


def save_csv(rows: list[dict[str, object]], target: Path) -> None:
    with target.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                "date",
                "weekday",
                "total_pages",
                "tool_pages",
                "non_tool_pages",
                "ratio",
                "note",
            ],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


def draw_chart(rows: list[dict[str, object]], svg_target: Path, png_target: Path) -> None:
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = [
        "Noto Sans CJK SC",
        "WenQuanYi Zen Hei",
        "Microsoft YaHei",
        "SimHei",
        "Arial Unicode MS",
        "DejaVu Sans",
    ]
    plt.rcParams["axes.unicode_minus"] = False

    bg = "#f4efe6"
    card = "#fbf7ee"
    ink = "#1a1713"
    ink2 = "#4b433c"
    ink3 = "#7b746a"
    neutral = "#d7cfc1"
    neutral_edge = "#b7ad9b"
    tool = "#ff6a4d"
    tool_edge = "#e5573c"
    grid = "#d8d0c2"
    title_font = font_manager.FontProperties(
        fname="/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
        size=38,
    )
    legend_font = font_manager.FontProperties(
        fname="/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        size=13,
    )

    totals = np.array([int(row["total_pages"]) for row in rows])
    tools = np.array([int(row["tool_pages"]) for row in rows])
    non_tools = np.array([int(row["non_tool_pages"]) for row in rows])
    labels = [str(row["label"]) for row in rows]
    ratios = [float(row["ratio"]) for row in rows]

    fig = plt.figure(figsize=(16, 9), dpi=200, facecolor=bg)
    ax = fig.add_axes([0.08, 0.16, 0.84, 0.66], facecolor=card)

    x = np.arange(len(rows))
    width = 0.62

    ax.bar(
        x,
        non_tools,
        width=width,
        color=neutral,
        edgecolor=neutral_edge,
        linewidth=1.2,
        label="非工具相关",
        zorder=3,
    )
    ax.bar(
        x,
        tools,
        width=width,
        bottom=non_tools,
        color=tool,
        edgecolor=tool_edge,
        linewidth=1.2,
        label="工具相关",
        zorder=4,
    )

    ax.set_ylim(0, 520)
    ax.set_yticks(np.arange(0, 521, 100))
    ax.set_xticks(x, labels, fontsize=16, color=ink2)
    ax.tick_params(axis="y", labelsize=13, colors=ink3)
    ax.tick_params(axis="x", length=0)
    ax.grid(axis="y", color=grid, linestyle=(0, (4, 4)), linewidth=1, zorder=0)
    for spine in ax.spines.values():
        spine.set_visible(False)

    for index, (total_value, tool_value, non_tool_value, ratio) in enumerate(
        zip(totals, tools, non_tools, ratios, strict=True)
    ):
        ax.text(
            index,
            total_value + 10,
            str(total_value),
            ha="center",
            va="bottom",
            fontsize=13,
            color=ink2,
        )

        ratio_y = non_tool_value + tool_value / 2
        ax.text(
            index,
            ratio_y,
            f"{ratio:.1f}%",
            ha="center",
            va="center",
            fontsize=13,
            color="#fff7ed",
            fontweight="bold",
            zorder=6,
        )
        ax.text(
            index,
            -0.05,
            str(rows[index]["weekday"]),
            transform=ax.get_xaxis_transform(),
            ha="center",
            va="top",
            fontsize=12,
            color=ink3,
            clip_on=False,
        )

    fig.text(
        0.5,
        0.875,
        "一周搜索行为：总浏览量与工具相关浏览量",
        ha="center",
        va="center",
        color=ink,
        fontproperties=title_font,
    )

    legend = ax.legend(
        loc="upper right",
        bbox_to_anchor=(0.985, 0.985),
        frameon=True,
        framealpha=0.92,
        facecolor=card,
        edgecolor="#d7cfc1",
        prop=legend_font,
        labelcolor=ink2,
        borderpad=0.8,
        labelspacing=0.7,
        handlelength=1.4,
        handletextpad=0.6,
    )
    legend.set_zorder(10)

    fig.savefig(svg_target, bbox_inches="tight", facecolor=fig.get_facecolor())
    fig.savefig(png_target, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    target_dir = root / "public" / "ppt"
    target_dir.mkdir(parents=True, exist_ok=True)

    rows = enrich_rows(DATA)
    save_csv(rows, target_dir / "tool-search-week-data.csv")
    draw_chart(
        rows,
        target_dir / "tool-search-week-chart.svg",
        target_dir / "tool-search-week-chart.png",
    )

    week_total = sum(int(row["total_pages"]) for row in rows)
    tool_total = sum(int(row["tool_pages"]) for row in rows)
    week_ratio = round(tool_total / week_total * 100, 1)
    print(f"saved svg/png/csv to {target_dir}")
    print(f"week_total={week_total}, tool_total={tool_total}, ratio={week_ratio}%")


if __name__ == "__main__":
    main()
