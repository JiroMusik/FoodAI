import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/database';

const aiRateLimit = new Map<string, number[]>();

export function checkRateLimit(ip: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const timestamps = (aiRateLimit.get(ip) || []).filter(t => now - t < 60000);
  if (timestamps.length >= maxPerMinute) return false;
  timestamps.push(now);
  aiRateLimit.set(ip, timestamps);
  return true;
}

let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function getAIResponse(prompt: string, imageBase64?: string, schema?: any, useAdvisorModel: boolean = false) {
  const settings = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settingsMap = settings.reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  const provider = settingsMap.ai_provider || 'gemini';
  const customApiKey = settingsMap.ai_api_key;
  const modelName = useAdvisorModel ? (settingsMap.advisor_model || settingsMap.ai_model || 'gemini-3-flash-preview') : (settingsMap.ai_model || 'gemini-3-flash-preview');
  const ollamaUrl = settingsMap.ollama_url || 'http://localhost:11434';

  try {
    if (provider === 'gemini') {
      const key = customApiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Gemini API Key missing');
      const genAI = new GoogleGenAI({ apiKey: key });
      
      const contents = imageBase64 ? {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } },
          { text: prompt }
        ]
      } : { parts: [{ text: prompt }] };

      const response = await genAI.models.generateContent({
        model: modelName,
        contents,
        config: schema ? { responseMimeType: 'application/json', responseSchema: schema } : undefined
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      const cleanJson = text.replace(/```json\n?|```/g, '').trim();
      try {
        return JSON.parse(cleanJson);
      } catch (e) {
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }
    }

    if (provider === 'openai' || provider === 'deepseek' || provider === 'moonshot') {
      let baseURL = undefined;
      if (provider === 'deepseek') baseURL = 'https://api.deepseek.com';
      if (provider === 'moonshot') baseURL = 'https://api.moonshot.cn/v1';

      const client = new OpenAI({ apiKey: customApiKey || process.env.OPENAI_API_KEY, baseURL });
      const messages: any[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
      
      if (imageBase64) {
        messages[0].content.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
      }

      const response = await client.chat.completions.create({
        model: modelName,
        messages,
        response_format: schema ? { type: 'json_object' } : undefined
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response from AI');
      const cleanJson = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    }

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey: customApiKey || process.env.ANTHROPIC_API_KEY });
      const messages: any[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
      if (imageBase64) {
        messages[0].content.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') }
        });
      }
      const response = await client.messages.create({
        model: modelName,
        max_tokens: 4096,
        messages
      });
      const text = (response.content[0] as any).text;
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      return JSON.parse(cleanJson);
    }

    if (provider === 'ollama') {
      const messages: any[] = [{ role: 'user', content: prompt }];
      if (imageBase64) messages[0].images = [imageBase64.replace(/^data:image\/\w+;base64,/, '')];
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          images: imageBase64 ? [imageBase64.replace(/^data:image\/\w+;base64,/, '')] : [],
          format: 'json',
          stream: false
        })
      });
      const data = await response.json();
      return JSON.parse(data.response);
    }
  } catch (err: any) {
    console.error('AI Error:', err.message);
    throw err;
  }

  throw new Error('Unsupported AI Provider');
}
