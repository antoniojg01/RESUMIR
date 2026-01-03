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
  const prompt = `Analise os frames e gere um roteiro. Nível: ${detailLevel}.`;
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }, ...frames.map(f => ({ inlineData: { mimeType: "image/jpeg", data: f.data } }))] },
      config: { maxOutputTokens: 8192 },
    });
    return response.text || "";
  });
};

/**
 * Mapeia os capítulos/seções do PDF para processamento segmentado.
 */
export const listPdfChapters = async (pdfBase64: string): Promise<string[]> => {
  const modelId = "gemini-3-flash-preview";
  const prompt = "Analise este PDF e liste apenas os títulos dos capítulos ou seções principais. Retorne apenas uma lista simples, um por linha.";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }],
      config: { 
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    return JSON.parse(response.text || "[]");
  });
};

/**
 * Processa um capítulo específico com densidade variável (30%, 50%, 80%).
 */
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
    densityInstruction = "MISSÃO: Extraia APENAS os 30% mais essenciais deste capítulo. Seja conciso mas mantenha a cronologia e fatos chave.";
  } else if (mode === PdfMode.Essential) {
    densityInstruction = "MISSÃO: Extraia 50% do volume original deste capítulo. Equilibre detalhes técnicos/narrativos com objetividade.";
  } else {
    densityInstruction = "MISSÃO: Realize uma desestruturação total mantendo 80% do volume original. NÃO RESUMA. Expanda cada detalhe, diálogo e nuance.";
  }

  const prompt = `Você está processando o capítulo "${chapterTitle}" (Seção ${chapterIndex + 1} de ${totalChapters}).
${densityInstruction}

REGRAS:
1. Use o formato de roteiro ou texto corrido detalhado conforme o conteúdo.
2. Ignore os outros capítulos, foque APENAS em "${chapterTitle}".
3. Responda em Português do Brasil.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ text: prompt }, { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }],
      config: {
        temperature: mode === PdfMode.Detailed ? 0.9 : 0.5,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: mode === PdfMode.Detailed ? 4000 : 2000 }
      },
    });
    return response.text || "";
  });
};

// Mantido apenas para compatibilidade se necessário, mas o fluxo agora é por capítulo
export const destructurePdf = async (pdfBase64: string, mode: PdfMode): Promise<{ text: string }> => {
  const modelId = "gemini-3-pro-preview";
  const prompt = mode === PdfMode.UltraFast 
    ? "Extraia 30% do conteúdo." 
    : "Extraia 50% do conteúdo.";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ text: `${prompt} Responda em PT-BR.` }, { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }],
      config: { maxOutputTokens: 8192 },
    });
    return { text: response.text || "" };
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  const modelId = "gemini-2.5-flash-preview-tts";
  const charLimit = 5000;
  const safeText = text.substring(0, charLimit);
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: `Narração: ${safeText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};