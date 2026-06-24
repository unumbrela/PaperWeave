import { chatCompletion } from './client';
import type { ResolvedKeys } from './keys';

export interface AIExplanationResult {
  coreIdea: string;
  relatedConcepts: string;
  whyItMatters: string;
  applications: string;
}

export async function getAIExplanation(text: string, keys?: ResolvedKeys): Promise<AIExplanationResult> {
  const prompt = `
  Analyze the following text from a research paper and provide a structured explanation:

  Text: ${text}

  Please provide your analysis in the following structured format:

  CORE_IDEA:
  Summarize the core idea or finding in 1-2 sentences.

  RELATED_CONCEPTS:
  List key related concepts, theories, or methodologies mentioned or implied.

  WHY_IT_MATTERS:
  Explain why this finding is important in the context of the research field.

  APPLICATIONS:
  Suggest potential applications or implications of this finding.

  Keep your response concise and focused on research understanding. Do not include any extra formatting or markdown.
  `;

  try {
    const content = await chatCompletion([
      { role: 'system', content: 'You are a research assistant helping to understand academic papers. Provide clear, concise, and insightful explanations.' },
      { role: 'user', content: prompt },
    ], { model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 1000 }, keys);

    const parseSection = (sectionName: string): string => {
      // 容忍冒号后到换行间的空白（部分模型会输出 `CORE_IDEA:  \n`，多余空格会让严格的 `:\n` 失配）
      const regex = new RegExp(`${sectionName}:[^\\S\\r\\n]*\\r?\\n([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`);
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    return {
      coreIdea: parseSection('CORE_IDEA'),
      relatedConcepts: parseSection('RELATED_CONCEPTS'),
      whyItMatters: parseSection('WHY_IT_MATTERS'),
      applications: parseSection('APPLICATIONS'),
    };
  } catch (error) {
    console.error('AI explanation failed:', error);
    throw error;
  }
}
