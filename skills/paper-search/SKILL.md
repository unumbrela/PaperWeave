---
name: paper-search
description: Use this skill when the user asks to find, search, or survey academic papers on a topic (查论文/找文献/调研某方向的论文), wants recent or highly-cited work in a research area, or asks "有哪些论文做了 X". Works without any API key.
---

## When to use

- 用户想按关键词 / 领域 / 年份找学术论文（中英文主题都可以）。
- 用户想知道某方向被引最高或最新的工作。
- 用户给了模糊的研究方向，需要先圈出代表性论文再深入。
- 不适用：用户已有具体论文要生成引文（用 cite-paper skill）；要全文 PDF 内容分析（先拿到 PDF 再说）。

## Inputs

- **主题关键词**（必需）：英文检索效果最好；用户给中文主题时先翻译成英文术语再查。
- **可选过滤**：起止年份、最少被引数、排序偏好（相关度 / 被引 / 最新）。
- **依赖**：`curl`（假定已安装）。两个数据源都**免 API key**。

## Steps

1. 把用户主题归一成英文检索词；多词概念加引号（如 `"diffusion model"`）。如果用户主题太宽（如「深度学习」），先反问收窄到可检索的具体问题。
2. 查 OpenAlex（覆盖广、带被引数和期刊/会议信息）：
   ```bash
   curl -s "https://api.openalex.org/works?search=QUERY&per-page=15&sort=cited_by_count:desc&filter=from_publication_date:2022-01-01&mailto=ci@example.com" 
   ```
   - 按相关度排序就去掉 `sort` 参数；调年份就改 `from_publication_date`。
   - 从 JSON 取：`title`、`publication_year`、`cited_by_count`、`primary_location.source.display_name`（venue）、`doi`、`id`。
   - 摘要是倒排索引（`abstract_inverted_index`），需要时按 position 还原成文本。
3. 查 arXiv 补充最新预印本（Atom XML）：
   ```bash
   curl -s "http://export.arxiv.org/api/query?search_query=all:%22QUERY%22&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending"
   ```
   - 从 XML 取：`<title>`、`<published>`、`<id>`（含 arXiv ID）、`<summary>`。
4. 合并去重：同一篇论文以 DOI 或 arXiv ID 对齐，OpenAlex 条目优先（有被引数）。
5. 按用户要的排序整理成 Markdown 表格输出：标题（带链接）/ 年份 / venue / 被引数 / 一句话摘要。默认给 8–12 篇，标注哪些是预印本。
6. 收尾时问用户是否需要：换关键词再查、扩大年份、或对某几篇生成 BibTeX（转 cite-paper skill）。

## Guardrails

- NEVER 编造论文标题、作者、被引数或 venue——表格里每个字段都必须来自 API 返回的 JSON/XML，取不到的字段写「—」。
- NEVER 把 arXiv 预印本伪装成正式发表：venue 一栏写 `arXiv (preprint)`。
- 同一会话内对 arXiv API 的请求间隔 ≥ 3 秒（官方礼貌限速）；OpenAlex 带 `mailto=` 参数进 polite pool。
- 网络请求失败时如实报告失败的源并继续展示另一源的结果，不要静默丢源。
- 检索结果为空时直接说没查到并建议改写关键词，不要硬凑相邻主题的论文。

## Example

用户：「帮我查一下 mamba 在医学图像分割里的论文，要 2023 年以后的」

1. 检索词定为 `"mamba" "medical image segmentation"`；
2. `curl -s "https://api.openalex.org/works?search=mamba%20medical%20image%20segmentation&per-page=15&sort=cited_by_count:desc&filter=from_publication_date:2023-01-01&mailto=ci@example.com"`
3. `curl -s "http://export.arxiv.org/api/query?search_query=all:%22mamba%22+AND+all:%22medical+image+segmentation%22&max_results=10&sortBy=submittedDate&sortOrder=descending"`
4. 去重合并后输出表格，并问要不要对其中几篇出 BibTeX。
