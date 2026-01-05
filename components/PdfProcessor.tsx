import React, { useState, useRef, useMemo } from 'react';
import { PdfMode } from '../types';
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
      if (chapterList.length === 0) throw new Error("Estrutura não detectada. Tente outro PDF.");
      setChapters(chapterList.map(title => ({ title, done: false })));
      setCurrentChapterIndex(0);
    } catch (err: any) {
      setError(err.message || "Erro no carregamento do arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const processSelectedChapter = async () => {
    if (!file || currentChapterIndex === null || currentChapterIndex >= chapters.length) return;

    setLoading(true);
    setStatus(`Analisando Seção: ${chapters[currentChapterIndex].title}...`);
    
    try {
      const base64 = await fileToBase64(file);
      const chapterTitle = chapters[currentChapterIndex].title;
      const chapterText = await destructurePdfChapter(base64, chapterTitle, currentChapterIndex, chapters.length, mode);
      
      const updatedChapters = [...chapters];
      updatedChapters[currentChapterIndex] = { ...updatedChapters[currentChapterIndex], content: chapterText, done: true };
      setChapters(updatedChapters);
      
      setAccumulatedText(prev => prev + (prev ? "\n\n---\n\n" : "") + `## ${chapterTitle}\n\n${chapterText}`);

      if (generateAudio) {
        setStatus('Sintetizando áudio...');
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800">
          <FileText className="w-6 h-6 text-emerald-600" />
          Análise Dinâmica de PDF
        </h2>
        
        <div className="space-y-6">
          <div className="border-4 border-dashed border-slate-100 rounded-2xl p-10 text-center hover:border-emerald-200 transition-all bg-slate-50/50 group">
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-4">
               {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                      <FileText className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-slate-700 text-lg">{file.name}</span>
                  </div>
               ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="text-slate-500 font-medium">Carregue o PDF para começar</span>
                  </div>
               )}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Nível de Preservação</label>
               <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                 {(Object.values(PdfMode)).map((m) => (
                   <button
                     key={m}
                     onClick={() => { setMode(m); setChapters([]); setAccumulatedText(''); }}
                     className={`py-3 text-[11px] font-bold rounded-lg flex flex-col items-center gap-1.5 transition-all ${mode === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {m === PdfMode.UltraFast ? <Zap className="w-3 h-3" /> : m === PdfMode.Essential ? <BookOpen className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                     {m === PdfMode.UltraFast ? '30%' : m === PdfMode.Essential ? '50%' : '80%'}
                   </button>
                 ))}
               </div>
             </div>

             <div className="flex flex-col justify-end">
                <label className="flex items-center gap-4 cursor-pointer p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all group">
                  <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} className="w-5 h-5 accent-emerald-600 rounded" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">Narrar com Gemini TTS</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Áudio gerado por seção</span>
                  </div>
                </label>
             </div>
          </div>

          {!chapters.length && (
            <button
              onClick={mapChapters}
              disabled={!file || loading}
              className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-3 transform active:scale-[0.98]
                ${!file || loading ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100'}
              `}
            >
              {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> {status}</> : <><Play className="w-6 h-6 fill-current" /> Listar Capítulos</>}
            </button>
          )}

          {error && (
            <div className="p-5 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black flex items-center gap-3">
              <ListOrdered className="w-6 h-6 text-emerald-600" />
              Estrutura do Livro
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter flex items-center gap-1">
              <MousePointer2 className="w-3 h-3" /> Escolha uma seção para processar
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3 mb-8 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => {
                   setCurrentChapterIndex(idx);
                   audioBufferRef.current = null;
                }}
                className={`flex items-center justify-between p-5 rounded-2xl border-2 text-left transition-all
                  ${idx === currentChapterIndex 
                    ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-50' 
                    : 'bg-white border-slate-50 hover:border-emerald-100 hover:bg-slate-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors
                    ${idx === currentChapterIndex ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className={`text-base font-bold block ${idx === currentChapterIndex ? 'text-emerald-900' : 'text-slate-600'}`}>
                      {ch.title}
                    </span>
                    {ch.done && <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1 block">Analisado</span>}
                  </div>
                </div>
                {ch.done ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <ChevronRight className="w-6 h-6 text-slate-200" />}
              </button>
            ))}
          </div>

          {currentChapterIndex !== null && (
            <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                 <Layers className="w-48 h-48" />
               </div>
               
               <div className="text-center md:text-left relative z-10 flex-1">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Pronto para processar</p>
                  <h4 className="text-2xl font-black leading-tight mb-4">{chapters[currentChapterIndex].title}</h4>
                  <div className="flex items-center gap-3">
                    <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-white/80 border border-white/10">Modo: {percentageLabel}</span>
                  </div>
               </div>
               
               <button
                 onClick={processSelectedChapter}
                 disabled={loading}
                 className="relative z-10 px-12 py-6 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black shadow-2xl transition-all flex items-center gap-4 disabled:bg-emerald-800 disabled:text-emerald-400 transform active:scale-95"
               >
                 {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Analisando...</> : <><Play className="w-6 h-6 fill-emerald-900" /> {chapters[currentChapterIndex].done ? 'Analisar Novamente' : 'Destrinchar Agora'}</>}
               </button>
            </div>
          )}
        </div>
      )}

      {accumulatedText && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
          <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="bg-emerald-200 px-4 py-1.5 rounded-full text-emerald-900 font-black text-xs shadow-sm border border-emerald-300">
                 {wordCount} PALAVRAS
               </div>
               <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                 Roteiro Expandido ({percentageLabel})
               </span>
             </div>
             <div className="flex gap-3">
               {audioBufferRef.current && (
                 <button onClick={() => {
                   if (!audioContextRef.current) return;
                   const src = audioContextRef.current.createBufferSource();
                   src.buffer = audioBufferRef.current;
                   src.connect(audioContextRef.current.destination);
                   src.start();
                 }} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"><Volume2 className="w-5 h-5" /></button>
               )}
               <button onClick={() => {
                  const blob = new Blob([accumulatedText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analise_${percentageLabel}.txt`;
                  a.click();
               }} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"><Download className="w-5 h-5" /></button>
             </div>
          </div>
          <div className="p-12 prose prose-slate max-w-none max-h-[700px] overflow-y-auto custom-scrollbar bg-white">
            <ReactMarkdown>{accumulatedText}</ReactMarkdown>
          </div>
          
          {currentChapterIndex !== null && currentChapterIndex < chapters.length - 1 && chapters[currentChapterIndex].done && (
            <div className="p-8 bg-slate-50 border-t flex justify-center">
              <button 
                onClick={() => {
                  setCurrentChapterIndex(prev => prev! + 1);
                  audioBufferRef.current = null;
                  window.scrollTo({ top: 500, behavior: 'smooth' });
                }} 
                className="flex items-center gap-4 px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl transform active:scale-95"
              >
                Ir para: {chapters[currentChapterIndex + 1].title} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};