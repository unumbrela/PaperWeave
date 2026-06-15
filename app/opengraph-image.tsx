import { ImageResponse } from "next/og";

// 站点默认社交卡片（1200×630）。任何未自带 OG 图的页面都会回退到这张。
export const alt = "PaperWeave · 研究型论文助手";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f7f2ea 0%, #efe6d8 100%)",
          color: "#1a1713",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 8, color: "#9b6b4d", textTransform: "uppercase" }}>
          PaperWeave
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
          研究型论文助手
        </div>
        <div style={{ fontSize: 32, marginTop: 28, color: "#5c554c", maxWidth: 900, lineHeight: 1.4 }}>
          把查文献 · 读文献 · 生 idea · 做验证 · 论文绘图
          串成一条打通的研究工作流
        </div>
        <div style={{ display: "flex", marginTop: 40, gap: 16 }}>
          {["检索", "PDF 批注", "引用网络", "语义检索", "统计看板"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 24,
                padding: "8px 20px",
                borderRadius: 999,
                border: "1px solid rgba(26,23,19,0.15)",
                color: "#1a1713",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
