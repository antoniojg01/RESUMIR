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
  const prompt = `Gere um roteiro narrativo para o vídeo baseado nestes frames. Nível de detalhe: ${detailLevel}.`;
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
  const prompt = "Analise o PDF e retorne uma lista com os títulos das seções/capítulos. Responda APENAS um JSON array de strings.";

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
  
  let modePrompt = "";
  if (mode === PdfMode.UltraFast) {
    modePrompt = "META: Resumo ultra-focado (30% do volume). Extraia apenas o essencial absoluto e conclusões.";
  } else if (mode === PdfMode.Essential) {
    modePrompt = "META: Desestruturação equilibrada (50% do volume). Mantenha todos os argumentos principais e estrutura lógica.";
  } else {
    modePrompt = "META: Preservação TOTAL (80% do volume). NÃO RESUMA. Expanda cada parágrafo, transcreva detalhes técnicos, nuances e exemplos exaustivamente.";
  }

  const prompt = `Você está processando o capítulo "${chapterTitle}" (${chapterIndex + 1} de ${totalChapters}).
${modePrompt}

Instruções Adicionais:
- Responda em Português do Brasil.
- Use Markdown.
- Se a meta for 80%, sinta-se à vontade para ser longo e detalhista como o original.`;

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
        temperature: mode === PdfMode.Detailed ? 0.9 : 0.5,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: mode === PdfMode.Detailed ? 5000 : 2000 }
      },
    });
    return response.text || "";
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  const modelId = "gemini-2.5-flash-preview-tts";
  const safeText = text.substring(0, 3000); // Limite seguro para TTS rápido
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: `Narração profissional: ${safeText}` }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};