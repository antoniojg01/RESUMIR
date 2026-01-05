
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FrameData, PdfMode } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || 500;
    const isRetryable = status === 429 || status === 503 || status === 500;
    if (retries > 0 && isRetryable) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const narrateVideoFrames = async (frames: FrameData[], detailLevel: string): Promise<string> => {
  const modelId = "gemini-3-flash-preview";
  const prompt = `Analise os frames e gere um roteiro narrativo detalhado. Nível de detalhe: ${detailLevel}.`;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { 
        parts: [
          { text: prompt }, 
          ...frames.map(f => ({ inlineData: { mimeType: "image/jpeg", data: f.data } }))
        ] 
      },
      config: { maxOutputTokens: 8192 },
    });
    return response.text || "";
  });
};

export const listPdfChapters = async (pdfBase64: string): Promise<string[]> => {
  const modelId = "gemini-3-flash-preview";
  const prompt = "Analise este PDF e extraia os títulos de todos os capítulos ou seções principais. Retorne APENAS um array JSON de strings.";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { 
        parts: [
          { text: prompt }, 
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
        ] 
      },
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    try {
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  });
};

export const destructurePdfChapter = async (
  pdfBase64: string, 
  chapterTitle: string,
  chapterIndex: number,
  totalChapters: number,
  mode: PdfMode
): Promise<string> => {
  const modelId = "gemini-3-pro-preview";
  
  let densityInstruction = "";
  if (mode === PdfMode.UltraFast) {
    densityInstruction = "MISSÃO: Extraia APENAS os 30% mais vitais. Foco em conceitos centrais e conclusões.";
  } else if (mode === PdfMode.Essential) {
    densityInstruction = "MISSÃO: Preserve 50% do conteúdo. Mantenha a estrutura de argumentos e exemplos principais.";
  } else {
    densityInstruction = "MISSÃO: Desestruturação PROFUNDA (80% do volume). Transcreva detalhes, nuances e todos os pontos secundários importantes.";
  }

  const prompt = `Você é um especialista em análise de documentos. Processe a seção "${chapterTitle}" (${chapterIndex + 1}/${totalChapters}).
${densityInstruction}

REGRAS:
1. Responda em Markdown.
2. Use Português do Brasil.
3. Não resuma se o modo for 80%, expanda conforme o original.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { 
        parts: [
          { text: prompt }, 
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
        ] 
      },
      config: {
        temperature: mode === PdfMode.Detailed ? 0.7 : 0.4,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: mode === PdfMode.Detailed ? 4000 : 2000 }
      },
    });
    return response.text || "";
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  const modelId = "gemini-2.5-flash-preview-tts";
  const charLimit = 5000;
  const safeText = text.substring(0, charLimit);
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: `Narração clara e profissional: ${safeText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};
