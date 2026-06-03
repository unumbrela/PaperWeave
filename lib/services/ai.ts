/**
 * AI 总结服务
 * 
 * 提供论文内容的 AI 分析和总结功能
 * 支持 OpenAI 和 Google Gemini 两种大模型
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI 分析结果接口
 */
export interface AIAnalysisResult {
  problem: string;       // 研究问题
  method: string;        // 核心方法
  contribution: string;  // 创新点
  application: string;   // 应用方向
}

/**
 * AI 服务配置
 */
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai' | 'gemini'

// OpenAI 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Gemini 客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

/**
 * 构建论文分析的 Prompt
 */
function buildAnalysisPrompt(textOrAbstract: string): string {
  return `总结这篇论文的内容，必须严格按照以下 JSON 格式返回，不要包含任何 Markdown 标记或多余文字：

{
  "problem": "研究问题",
  "method": "核心方法",
  "contribution": "创新点",
  "application": "应用方向"
}

论文内容：
${textOrAbstract.substring(0, 5000)}`; // 限制长度，避免超过模型 token 限制
}

/**
 * 使用 OpenAI 分析论文内容
 */
async function analyzeWithOpenAI(textOrAbstract: string): Promise<AIAnalysisResult> {
  const prompt = buildAnalysisPrompt(textOrAbstract);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的学术论文分析助手。请严格按照要求的 JSON 格式输出结果。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3, // 较低温度，更确定性输出
    max_tokens: 500,
  });
  
  const content = response.choices[0]?.message?.content || '';
  
  try {
    return JSON.parse(content);
  } catch {
    // 如果解析失败，返回结构化的错误响应
    return {
      problem: '分析失败',
      method: '无法解析响应',
      contribution: '',
      application: '',
    };
  }
}

/**
 * 使用 Google Gemini 分析论文内容
 */
async function analyzeWithGemini(textOrAbstract: string): Promise<AIAnalysisResult> {
  const prompt = buildAnalysisPrompt(textOrAbstract);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      problem: '分析失败',
      method: '无法解析响应',
      contribution: '',
      application: '',
    };
  }
}

/**
 * 分析论文内容（主入口）
 * 
 * 根据配置选择使用 OpenAI 或 Gemini
 * 
 * @param textOrAbstract 论文摘要或全文文本
 * @returns AI 分析结果
 */
export async function analyzePaperContent(textOrAbstract: string): Promise<AIAnalysisResult> {
  if (!textOrAbstract.trim()) {
    throw new Error('论文内容不能为空');
  }
  
  // 根据环境变量选择 AI 服务提供商
  switch (AI_PROVIDER.toLowerCase()) {
    case 'gemini':
      return analyzeWithGemini(textOrAbstract);
    
    case 'openai':
    default:
      return analyzeWithOpenAI(textOrAbstract);
  }
}

/**
 * 批量分析多篇论文
 * 
 * @param papers 论文内容数组
 * @returns AI 分析结果数组
 */
export async function analyzePapersBatch(papers: string[]): Promise<AIAnalysisResult[]> {
  const results: AIAnalysisResult[] = [];
  
  for (const content of papers) {
    try {
      const result = await analyzePaperContent(content);
      results.push(result);
    } catch (error) {
      console.error(`Failed to analyze paper: ${error}`);
      results.push({
        problem: '分析失败',
        method: '',
        contribution: '',
        application: '',
      });
    }
  }
  
  return results;
}