/**
 * 科研示意图「提示词」产物的解析 + 出图平台直达。
 *
 * 提示词路由按固定格式输出：`## 科研绘图提示词` 下的第一个代码块即可直接粘贴给
 * 文生图模型的正文。`extractFigurePrompt` 把它从整段 Markdown 里抠出来，供「复制」
 * 与「直接出图」复用；取不到代码块时退回整段纯文本。
 */

/** 从模型输出的 Markdown 里抠出第一个 ``` 代码块（即可粘贴的提示词正文）。 */
export function extractFigurePrompt(raw: string): string {
  if (!raw) return "";
  const fence = raw.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fence && fence[1].trim()) return fence[1].trim();
  // 没有代码块（模型偶尔不守格式）：去掉 Markdown 标题行后返回正文
  return raw.replace(/^#{1,6}\s.*$/gm, "").trim();
}

export interface ImagePlatform {
  id: string;
  label: string;
  url: string;
  /** 一句话说明 / 推荐理由 */
  hint: string;
  recommended?: boolean;
}

/** 常用文生图平台直达（点按钮先复制提示词，再新开平台粘贴）。 */
export const IMAGE_PLATFORMS: ImagePlatform[] = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/", hint: "GPT-image 实测出图效果最佳", recommended: true },
  { id: "jimeng", label: "即梦", url: "https://jimeng.jianying.com/", hint: "字节·中文友好" },
  { id: "kling", label: "可灵", url: "https://app.klingai.com/", hint: "快手·可灵 AI" },
  { id: "dalle", label: "Bing 图像创建", url: "https://www.bing.com/images/create", hint: "DALL·E 3 免费" },
  { id: "midjourney", label: "Midjourney", url: "https://www.midjourney.com/imagine", hint: "需订阅" },
];
