import React, { useState, useRef, useMemo } from 'react';
import { PdfMode } from '../types';
import { fileToBase64, base64ToUint8Array, decodeRawPcm } from '../utils/mediaUtils';
import { listPdfChapters, destructurePdfChapter, generateSpeech } from '../services/geminiService';
import { Upload, Play, Loader2, Download, AlertCircle, Zap, BookOpen, Layers, Volume2, CheckCircle2, ChevronRight, ListOrdered } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const PdfProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PdfMode>(PdfMode.Essential);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [chapters, setChapters] = useState<{title: string, content?: string, done: boolean}[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [accumulatedText, setAccumulatedText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const wordCount = useMemo(() => accumulatedText.trim() ? accumulatedText.trim().split(/\s+/).length : 0, [accumulatedText]);
  const percentageLabel = mode === PdfMode.UltraFast ? "30%" : mode === PdfMode.Essential ? "50%" : "80%";

  const mapChapters = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Mapeando Estrutura...');
    try {
      const base64 = await fileToBase64(file);
      const list = await listPdfChapters(base64);
      setChapters(list.map(title => ({ title, done: false })));
      setCurrentChapterIndex(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processChapter = async () => {
    if (!file || currentChapterIndex === null) return;
    setLoading(true);
    setStatus(`Destrinchando: ${chapters[currentChapterIndex].title}...`);
    try {
      const base64 = await fileToBase64(file);
      const text = await destructurePdfChapter(base64, chapters[currentChapterIndex].title, currentChapterIndex, chapters.length, mode);
      
      const up = [...chapters];
      up[currentChapterIndex] = { ...up[currentChapterIndex], content: text, done: true };
      setChapters(up);
      setAccumulatedText(prev => prev + (prev ? "\n\n---\n\n" : "") + `### ${chapters[currentChapterIndex!].title}\n\n${text}`);

      setStatus('Sintetizando...');
      const audio = await generateSpeech(text);
      if (audio) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioBufferRef.current = await decodeRawPcm(base64ToUint8Array(audio), audioContextRef.current);
      }
      setStatus('Concluído');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="st-card">
        <label className="block text-sm font-bold mb-4">Carregar Documento PDF</label>
        <div className="border border-slate-200 rounded-lg p-8 bg-slate-50 text-center hover:bg-slate-100 transition-colors border-dashed relative">
          <input type="file" accept="application/pdf" onChange={e => e.target.files && setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 font-medium">{file ? file.name : 'Selecione o arquivo PDF'}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Meta de Densidade do Roteiro</label>
            <div className="flex gap-2">
              {Object.values(PdfMode).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-3 text-[10px] font-bold rounded border flex flex-col items-center gap-1 transition-all ${mode === m ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                >
                  {m === PdfMode.UltraFast ? <Zap className="w-3 h-3" /> : m === PdfMode.Essential ? <BookOpen className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                  {m === PdfMode.UltraFast ? '30%' : m === PdfMode.Essential ? '50%' : '80%'}
                </button>
              ))}
            </div>
          </div>

          {!chapters.length && (
            <button onClick={mapChapters} disabled={!file || loading} className="st-button-primary w-full h-12">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Listar Seções do Livro'}
            </button>
          )}
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="st-card space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <ListOrdered className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Seções Detectadas</span>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => setCurrentChapterIndex(idx)}
                className={`flex items-center justify-between p-3 rounded text-xs text-left transition-all ${idx === currentChapterIndex ? 'bg-red-50 text-red-700 font-bold border-l-4 border-red-500' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                <span className="truncate mr-4">{idx + 1}. {ch.title}</span>
                {ch.done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>

          {currentChapterIndex !== null && (
            <div className="pt-4 border-t border-slate-100">
               <button onClick={processChapter} disabled={loading} className="st-button-primary w-full flex items-center justify-center gap-2">
                 {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {status}</> : <><Play className="w-4 h-4" /> Destrinchar Seção Atual</>}
               </button>
            </div>
          )}
        </div>
      )}

      {accumulatedText && (
        <div className="st-card">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-slate-900 text-white px-3 py-1 rounded text-[10px] font-bold">{wordCount} PALAVRAS</div>
            <div className="flex gap-2">
               {audioBufferRef.current && (
                 <button onClick={() => {
                   const src = audioContextRef.current!.createBufferSource();
                   src.buffer = audioBufferRef.current;
                   src.connect(audioContextRef.current!.destination);
                   src.start();
                 }} className="p-2 bg-slate-100 text-slate-600 rounded"><Volume2 className="w-4 h-4" /></button>
               )}
               <button onClick={() => {
                 const blob = new Blob([accumulatedText], { type: 'text/plain' });
                 const a = document.createElement('a');
                 a.href = URL.createObjectURL(blob);
                 a.download = `analise_${percentageLabel}.txt`;
                 a.click();
               }} className="p-2 bg-slate-100 text-slate-600 rounded"><Download className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown>{accumulatedText}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};