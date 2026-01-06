import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FrameData, PdfMode } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    const status = error?.status || 500;
    const isRetryable = status === 429 || status === 503 || status === 500;
    if (retries > 0 && isRetryable) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const narrateVideoFrames = async (frames: FrameData[], detailLevel: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview";
  const prompt = `Analise estes frames de vídeo e crie um roteiro narrativo envolvente em Português do Brasil. Nível de detalhe: ${detailLevel}.`;
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...frames.map(f => ({ inlineData: { mimeType: "image/jpeg", data: f.data } }))
          ]
        }
      ],
      config: { maxOutputTokens: 8192 },
    });
    return response.text || "";
  });
};

export const listPdfChapters = async (pdfBase64: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview";
  const prompt = "Analise este PDF e extraia uma lista dos títulos de todos os capítulos ou seções principais. Responda APENAS um JSON array de strings contendo os títulos.";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
          ]
        }
      ],
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
      const text = response.text || "[]";
      return JSON.parse(text);
    } catch (e) {
      console.error("Falha ao parsear capítulos:", e);
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";
  
  let modePrompt = "";
  if (mode === PdfMode.UltraFast) {
    modePrompt = "META: Resumo executivo ultra-focado (30% do volume original). Foque em conclusões e ações.";
  } else if (mode === PdfMode.Essential) {
    modePrompt = "META: Desestruturação equilibrada (50% do volume original). Preserve a lógica argumentativa e exemplos principais.";
  } else {
    modePrompt = `META: Preservação detalhada e narrativa. Transforme esta seção em uma estrutura rica de Capítulos e Cenas.
Para cada subdivisão ou momento importante, estruture da seguinte forma:
1. **Cena [Número]**: [Título Curto]
2. **Cenário**: Descreva o ambiente, a atmosfera e o contexto espacial.
3. **Personagens**: Identifique quem está envolvido e seu provável estado mental/emocional baseado no texto.
4. **Ação**: Narre o que está acontecendo, os eventos e a progressão do pensamento/argumento.
5. **Diálogos/Voz**: Transcreva ou infira diálogos e discursos importantes, mantendo a voz do autor ou das figuras citadas.

Seja prolixo e preserve nuances técnicas e dramáticas.`;
  }

  const prompt = `Você está processando a seção "${chapterTitle}" (${chapterIndex + 1} de ${totalChapters}) do documento fornecido.
${modePrompt}

REGRAS:
1. Responda em Português do Brasil.
2. Use Markdown estruturado com cabeçalhos claros.
3. Mantenha a essência técnica mas use um tom narrativo envolvente.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } }
          ]
        }
      ],
      config: {
        temperature: mode === PdfMode.Detailed ? 0.9 : 0.5,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: mode === PdfMode.Detailed ? 4000 : 2000 }
      },
    });
    return response.text || "";
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return "";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash-preview-tts";
  
  // Limpando markdown para o TTS não ler caracteres especiais como asteriscos
  const cleanText = text.replace(/[*#_~`>]/g, '').substring(0, 3000);
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};