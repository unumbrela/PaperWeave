---
name: cite-paper
description: Use this skill when the user gives a paper (arXiv ID, DOI, title, or arXiv/OpenAlex URL) and wants a citation — BibTeX, GB/T 7714, APA, or a .bib file (生成引文/导出 BibTeX/参考文献格式). Works without any API key.
---

## When to use

- 用户给了 arXiv ID（如 `2401.12345`）、DOI、论文标题或链接，要 BibTeX / GB-T 7714 / APA 引文。
- 用户在写论文，要把一批文献整理成 `.bib` 文件。
- 不适用：用户要「找」论文（用 paper-search skill）；用户已给全引文只要改格式（直接改写，不用查 API）。

## Inputs

- **论文标识**（必需，至少一种）：arXiv ID / DOI / 准确标题 / arXiv 或 OpenAlex URL。
- **目标格式**（可选）：BibTeX（默认）、GB/T 7714、APA；或多种同时。
- **依赖**：`curl`（假定已安装），免 API key。

## Steps

1. 识别标识类型并拉取**真实元数据**（绝不凭记忆写引文字段）：
   - DOI：`curl -s "https://api.openalex.org/works/doi:DOI值?mailto=ci@example.com"`
   - arXiv ID：`curl -s "http://export.arxiv.org/api/query?id_list=ARXIV_ID"`（Atom XML）
   - 标题：`curl -s "https://api.openalex.org/works?search=标题&per-page=3&mailto=ci@example.com"`，取最佳匹配；**匹配不唯一时把候选列给用户确认，不要擅自选**。
2. 提取字段：作者全名列表、标题、年份、venue（期刊/会议名）、DOI、arXiv ID、卷期页（如有）。
3. 生成 BibTeX：
   - 正式发表 → `@article` / `@inproceedings`；纯 arXiv 预印本 → `@misc` + `eprint={ID}` + `archivePrefix={arXiv}`。
   - citation key 用 `第一作者姓+年份+标题首个实词`（如 `vaswani2017attention`），全小写。
4. 按需生成其他格式：
   - **GB/T 7714**：`作者1, 作者2, 等. 题名[J]. 刊名, 年, 卷(期): 页码.`（预印本用 `[A/OL]` + arXiv 链接；3 名以上作者后接「等」/「et al」）。
   - **APA**：`Author, A. A., & Author, B. B. (Year). Title. Venue. DOI`。
5. 多篇时汇总写入用户指定路径的 `.bib` 文件（写文件前确认路径），并在对话里同时展示内容。

## Guardrails

- NEVER 凭训练记忆编造或补全引文字段（作者顺序、页码、年份极易记错）——每个字段都必须来自第 1 步拉到的元数据，缺失字段就留空并告知用户。
- NEVER 把预印本标成期刊论文；BibTeX 条目类型必须和发表状态一致。
- 标题搜索命中多条相近结果时，先向用户确认是哪一篇再生成。
- 网络不可达时如实说明，并提供「用户自己粘贴元数据 → 我来排版」的备选路径。

## Example

用户：「给我 attention is all you need 的 BibTeX 和 GB/T 7714」

1. `curl -s "https://api.openalex.org/works?search=attention%20is%20all%20you%20need&per-page=3&mailto=ci@example.com"` → 确认 Vaswani et al., NeurIPS 2017；
2. 输出 `@inproceedings{vaswani2017attention, ...}`（字段全部来自 API），随后输出 GB/T 7714 行文格式。
