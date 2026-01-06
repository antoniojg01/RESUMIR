import React, { useState, useRef, useMemo } from 'react';
import { PdfMode } from '../types';
import { fileToBase64, base64ToUint8Array, decodeRawPcm } from '../utils/mediaUtils';
import { listPdfChapters, destructurePdfChapter, generateSpeech } from '../services/geminiService';
import { Upload, Play, Loader2, Download, AlertCircle, Zap, BookOpen, Layers, Volume2, CheckCircle2, ListOrdered } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PdfProcessorProps {
  onFastRead: (text: string) => void;
}

export const PdfProcessor: React.FC<PdfProcessorProps> = ({ onFastRead }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PdfMode>(PdfMode.Essential);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  const [chapters, setChapters] = useState<{title: string, content?: string, done: boolean}[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [accumulatedText, setAccumulatedText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const wordCount = useMemo(() => accumulatedText.trim() ? accumulatedText.trim().split(/\s+/).length : 0, [accumulatedText]);

  const mapChapters = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setStatus('Lendo estrutura do PDF...');
    try {
      const base64 = await fileToBase64(file);
      const list = await listPdfChapters(base64);
      if (!list || list.length === 0) throw new Error("A IA não conseguiu detectar uma estrutura de capítulos clara.");
      setChapters(list.map(title => ({ title, done: false })));
      setCurrentChapterIndex(0);
    } catch (err: any) {
      setError(err.message || "Erro ao mapear PDF.");
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const processChapter = async () => {
    if (!file || currentChapterIndex === null) return;
    setLoading(true);
    setError(null);
    setAudioLoaded(false);
    setStatus(`Destrinchando: ${chapters[currentChapterIndex].title}...`);
    try {
      const base64 = await fileToBase64(file);
      const text = await destructurePdfChapter(
        base64, 
        chapters[currentChapterIndex].title, 
        currentChapterIndex, 
        chapters.length, 
        mode
      );
      
      const up = [...chapters];
      up[currentChapterIndex] = { ...up[currentChapterIndex], content: text, done: true };
      setChapters(up);
      setAccumulatedText(prev => prev + (prev ? "\n\n---\n\n" : "") + `### ${chapters[currentChapterIndex!].title}\n\n${text}`);

      setStatus('Sintetizando áudio...');
      const audio = await generateSpeech(text);
      if (audio) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioBufferRef.current = await decodeRawPcm(base64ToUint8Array(audio), audioContextRef.current);
        setAudioLoaded(true);
      }
      setStatus('Concluído');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const playAudio = async () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    const src = audioContextRef.current.createBufferSource();
    src.buffer = audioBufferRef.current;
    src.connect(audioContextRef.current.destination);
    src.start();
  };

  return (
    <div className="space-y-6">
      <div className="st-card">
        <label className="block text-sm font-bold mb-4">Mapear Documento PDF</label>
        <div className="border border-slate-200 rounded-lg p-10 bg-slate-50 text-center hover:bg-slate-100 transition-all border-dashed relative">
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
                setChapters([]);
                setAccumulatedText('');
                setAudioLoaded(false);
              }
            }} 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            disabled={loading}
          />
          <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-semibold">{file ? file.name : 'Selecione o PDF'}</p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Densidade do Roteiro</label>
            <div className="flex gap-2">
              {Object.values(PdfMode).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-3 text-[10px] font-bold rounded border flex flex-col items-center gap-1.5 transition-all ${mode === m ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                >
                  {m === PdfMode.UltraFast ? <Zap className="w-3 h-3" /> : m === PdfMode.Essential ? <BookOpen className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                  {m === PdfMode.UltraFast ? '30%' : m === PdfMode.Essential ? '50%' : '80%'}
                </button>
              ))}
            </div>
          </div>

          {!chapters.length && (
            <button 
              onClick={mapChapters} 
              disabled={!file || loading} 
              className="st-button-primary w-full h-14"
            >
              {loading ? <><Loader2 className="animate-spin w-5 h-5" /> {status}</> : <><ListOrdered className="w-5 h-5" /> Listar Seções do Livro</>}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {chapters.length > 0 && (
        <div className="st-card animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-5">
            <ListOrdered className="w-4 h-4 text-red-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Estrutura Encontrada</span>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-3 custom-scrollbar">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => {
                  setCurrentChapterIndex(idx);
                  audioBufferRef.current = null;
                  setAudioLoaded(false);
                }}
                className={`flex items-center justify-between p-4 rounded-lg text-xs text-left transition-all border ${idx === currentChapterIndex ? 'bg-red-50 text-red-700 font-bold border-red-200 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'}`}
              >
                <span className="truncate mr-4">{idx + 1}. {ch.title}</span>
                {ch.done && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>

          {currentChapterIndex !== null && (
            <div className="pt-6 border-t border-slate-100 mt-6">
               <button 
                 onClick={processChapter} 
                 disabled={loading} 
                 className="st-button-primary w-full h-14"
               >
                 {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {status}</> : <><Play className="w-5 h-5" /> Destrinchar "{chapters[currentChapterIndex].title}"</>}
               </button>
            </div>
          )}
        </div>
      )}

      {accumulatedText && (
        <div className="st-card animate-in fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div className="bg-slate-900 text-white px-3 py-1.5 rounded text-[10px] font-black">{wordCount} PALAVRAS GERADAS</div>
            <div className="flex gap-2">
               <button 
                onClick={() => onFastRead(accumulatedText)}
                className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm flex items-center gap-2"
               >
                 <Zap className="w-5 h-5" />
                 <span className="text-[10px] font-bold uppercase hidden md:inline">Fast Read</span>
               </button>
               {audioLoaded && (
                 <button 
                  onClick={playAudio} 
                  title="Ouvir Narração da Seção"
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 shadow-sm flex items-center gap-2"
                 >
                   <Volume2 className="w-5 h-5" />
                   <span className="text-[10px] font-bold uppercase hidden md:inline">Ouvir</span>
                 </button>
               )}
               <button onClick={() => {
                 const blob = new Blob([accumulatedText], { type: 'text/plain' });
                 const a = document.createElement('a');
                 a.href = URL.createObjectURL(blob);
                 a.download = `analise_pdf.txt`;
                 a.click();
               }} className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 shadow-sm"><Download className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-slate bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <ReactMarkdown>{accumulatedText}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};