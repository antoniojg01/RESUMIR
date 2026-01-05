
import React, { useState, useRef, useMemo } from 'react';
import { PdfMode, ProcessingResult } from '../types';
import { fileToBase64, base64ToUint8Array, decodeRawPcm } from '../utils/mediaUtils';
import { listPdfChapters, destructurePdfChapter, generateSpeech } from '../services/geminiService';
import { Upload, Play, FileText, Loader2, Download, AlertCircle, Zap, BookOpen, Layers, Volume2, CheckCircle2, ChevronRight, ListOrdered, MousePointer2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const PdfProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PdfMode>(PdfMode.Essential);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [chapters, setChapters] = useState<{title: string, content?: string, done: boolean}[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [accumulatedText, setAccumulatedText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const wordCount = useMemo(() => {
    return accumulatedText.trim() ? accumulatedText.trim().split(/\s+/).length : 0;
  }, [accumulatedText]);

  const percentageLabel = mode === PdfMode.UltraFast ? "30%" : mode === PdfMode.Essential ? "50%" : "80%";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setChapters([]);
      setCurrentChapterIndex(null);
      setAccumulatedText('');
    }
  };

  const mapChapters = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStatus('Mapeando estrutura do PDF...');
    try {
      const base64 = await fileToBase64(file);
      const chapterList = await listPdfChapters(base64);
      if (chapterList.length === 0) throw new Error("Não foi possível detectar capítulos. Tente outro arquivo.");
      setChapters(chapterList.map(title => ({ title, done: false })));
      setCurrentChapterIndex(0);
    } catch (err: any) {
      setError(err.message || "Erro ao mapear PDF.");
    } finally {
      setLoading(false);
    }
  };

  const processSelectedChapter = async () => {
    if (!file || currentChapterIndex === null || currentChapterIndex >= chapters.length) return;

    setLoading(true);
    setStatus(`Processando Seção: ${chapters[currentChapterIndex].title}...`);
    
    try {
      const base64 = await fileToBase64(file);
      const chapterTitle = chapters[currentChapterIndex].title;
      const chapterText = await destructurePdfChapter(base64, chapterTitle, currentChapterIndex, chapters.length, mode);
      
      const updatedChapters = [...chapters];
      updatedChapters[currentChapterIndex] = { ...updatedChapters[currentChapterIndex], content: chapterText, done: true };
      setChapters(updatedChapters);
      
      setAccumulatedText(prev => prev + (prev ? "\n\n---\n\n" : "") + `## ${chapterTitle}\n\n${chapterText}`);

      if (generateAudio) {
        setStatus('Gerando áudio da seção...');
        const audioBase64 = await generateSpeech(chapterText);
        if (audioBase64) {
          if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          audioBufferRef.current = await decodeRawPcm(base64ToUint8Array(audioBase64), audioContextRef.current);
        }
      }

      setStatus('Concluído!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadText = () => {
    const blob = new Blob([accumulatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.split('.')[0]}_${percentageLabel}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
          <FileText className="w-5 h-5 text-emerald-600" />
          Análise por Seções ({percentageLabel})
        </h2>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors bg-slate-50">
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
               {file ? (
                 <>
                  <FileText className="w-10 h-10 text-emerald-600" />
                  <span className="font-medium text-slate-700">{file.name}</span>
                 </>
               ) : (
                 <>
                  <Upload className="w-10 h-10 text-slate-400" />
                  <span className="text-slate-600">Arraste ou clique para enviar o PDF</span>
                 </>
               )}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Meta de Densidade</label>
               <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-lg">
                 {(Object.values(PdfMode)).map((m) => (
                   <button
                     key={m}
                     onClick={() => { setMode(m); setChapters([]); setAccumulatedText(''); }}
                     className={`py-2 text-[10px] sm:text-xs font-bold rounded-md flex flex-col items-center gap-1 transition-all ${mode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     {m === PdfMode.UltraFast ? <Zap className="w-3 h-3" /> : m === PdfMode.Essential ? <BookOpen className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                     {m === PdfMode.UltraFast ? '30%' : m === PdfMode.Essential ? '50%' : '80%'}
                   </button>
                 ))}
               </div>
             </div>

             <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-lg border border-slate-200 w-full hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Narração por Seção</span>
                    <span className="text-xs text-slate-500">Gera áudio para cada capítulo</span>
                  </div>
                </label>
             </div>
          </div>

          {!chapters.length && (
            <button
              onClick={mapChapters}
              disabled={!file || loading}
              className={`w-full py-4 rounded-lg font-bold text-white transition-all shadow-md flex items-center justify-center gap-2
                ${!file || loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}
              `}
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {status}</> : <><Play className="w-5 h-5 fill-current" /> Mapear Capítulos</>}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-emerald-600" />
              Estrutura Detectada
            </h3>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Clique para selecionar
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 mb-6 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => {
                   setCurrentChapterIndex(idx);
                   audioBufferRef.current = null;
                }}
                className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all group
                  ${idx === currentChapterIndex 
                    ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20' 
                    : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${idx === currentChapterIndex ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className={`text-sm font-bold block ${idx === currentChapterIndex ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {ch.title}
                    </span>
                    {ch.done && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Processado</span>}
                  </div>
                </div>
                {ch.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  idx === currentChapterIndex && loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-400" />
                )}
              </button>
            ))}
          </div>

          {currentChapterIndex !== null && (
            <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                 <Layers className="w-32 h-32" />
               </div>
               
               <div className="text-center md:text-left relative z-10">
                  <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Seção Atual</p>
                  <h4 className="text-2xl font-black leading-tight max-w-md">{chapters[currentChapterIndex].title}</h4>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="bg-emerald-800/50 px-3 py-1 rounded-full text-xs font-bold text-emerald-200 border border-emerald-700">Meta: {percentageLabel}</span>
                  </div>
               </div>
               
               <button
                 onClick={processSelectedChapter}
                 disabled={loading}
                 className="relative z-10 px-10 py-5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black shadow-2xl transition-all flex items-center gap-3 disabled:bg-emerald-800 disabled:text-emerald-400 transform active:scale-95"
               >
                 {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Aguarde...</> : <><Play className="w-6 h-6 fill-emerald-900" /> {chapters[currentChapterIndex].done ? 'Reprocessar' : 'Processar Agora'}</>}
               </button>
            </div>
          )}
        </div>
      )}

      {accumulatedText && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                 <span className="bg-emerald-200 px-2 py-0.5 rounded mr-2 text-emerald-900 font-black">{wordCount} PALAVRAS</span>
                 Roteiro Expandido ({percentageLabel})
               </span>
             </div>
             <div className="flex gap-2">
               {audioBufferRef.current && (
                 <button onClick={() => {
                   if (!audioContextRef.current) return;
                   const src = audioContextRef.current.createBufferSource();
                   src.buffer = audioBufferRef.current;
                   src.connect(audioContextRef.current.destination);
                   src.start();
                 }} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"><Volume2 className="w-5 h-5" /></button>
               )}
               <button onClick={downloadText} className="p-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><Download className="w-5 h-5" /></button>
             </div>
          </div>
          <div className="p-10 prose prose-slate max-w-none max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/10">
            <ReactMarkdown>{accumulatedText}</ReactMarkdown>
          </div>
          
          {currentChapterIndex !== null && currentChapterIndex < chapters.length - 1 && chapters[currentChapterIndex].done && (
            <div className="p-6 bg-white border-t flex justify-center">
              <button 
                onClick={() => {
                  setCurrentChapterIndex(prev => prev! + 1);
                  audioBufferRef.current = null;
                }} 
                className="flex items-center gap-3 px-8 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 transform active:scale-95"
              >
                Próxima Seção: {chapters[currentChapterIndex + 1].title} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
