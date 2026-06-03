import { streamText } from "ai";
import { getDeepSeek, MODELS, aiNotConfiguredResponse } from "@/lib/ai";
import { resolveKeys } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  name: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "name 必须为 kebab-case"),
  trigger: z.string().min(1).max(2000),
  capability: z.string().min(1).max(4000),
  tools: z.array(z.string()).max(20).default([]),
});

export async function POST(req: Request) {
  const { deepseek: dsKey } = resolveKeys(req);
  if (!dsKey) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", {
      status: 400,
    });
  }

  const allowedTools =
    parsed.tools.length > 0 ? parsed.tools.join(", ") : "（未指定，默认全部）";

  const system = `你是 Claude Code 的 Skill 工程师。用户会给你 skill 的名字、触发时机、核心能力和允许使用的工具，你要产出一个可以**直接保存为 ~/.claude/skills/<name>/SKILL.md** 的文件内容。

硬性约束：
- 输出**纯文本**，首行就是 \`---\`，**不要**用 \`\`\`markdown 代码块包裹整个文件。
- frontmatter 只有两个字段：\`name\`（kebab-case）和 \`description\`。
- description 必须写**触发条件**，以 "Use this skill when ..." 开头，单行，控制在 200 字以内。Claude 靠它判断是否要加载这个 skill，**不是**对 skill 本身的描述。
- body 严格按以下章节顺序输出，标题用二级：
  ## When to use
  ## Inputs
  ## Steps
  ## Guardrails
  ## Example
- Steps 必须是可机械执行的有序列表，每步以动词开头，覆盖用户描述里的全部分支（包括异常和冲突）。
- Guardrails 至少 3 条，其中必须包含 NEVER 开头的硬禁令；如果涉及破坏性操作（push/删除/迁移/写入远端），必须加"先向用户确认"一条。
- Example 给一个最小但可信的调用脚本或对话范例。
- 不要编造用户未提到的外部依赖；如需 CLI（gh / drawio-export 等），在 Inputs 里说清楚"假定已安装"。
- 写完 SKILL.md 后，在文件末尾空一行，再追加一段 HTML 注释形式的落地提示：\`<!-- install: mkdir -p ~/.claude/skills/<name> && save this file as ~/.claude/skills/<name>/SKILL.md -->\`，<name> 替换为真实 name。`;

  const prompt = `请为以下需求生成 SKILL.md。

- **name**: \`${parsed.name}\`
- **允许使用的工具**: ${allowedTools}

**触发时机（description 要据此改写成 "Use this skill when ..."）**：
${parsed.trigger}

**核心能力与分支（Steps 必须覆盖这里列出的每一条）**：
${parsed.capability}

严格按系统提示中的章节结构输出，不要多加别的段落，不要加 "这是你的 SKILL.md" 之类的前言。`;

  const result = streamText({
    model: getDeepSeek(dsKey)(MODELS.chat),
    system,
    prompt,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
