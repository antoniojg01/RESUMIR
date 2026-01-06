import React, { useState, useRef } from 'react';
import { VideoDetailLevel, ProcessingResult } from '../types';
import { extractFramesFromVideo, base64ToUint8Array, decodeRawPcm } from '../utils/mediaUtils';
import { narrateVideoFrames, generateSpeech } from '../services/geminiService';
import { Upload, Play, Loader2, Download, AlertCircle, Volume2, Clock, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface VideoProcessorProps {
  onFastRead: (text: string) => void;
}

export const VideoProcessor: React.FC<VideoProcessorProps> = ({ onFastRead }) => {
  const [file, setFile] = useState<File | null>(null);
  const [detailLevel, setDetailLevel] = useState<VideoDetailLevel>(VideoDetailLevel.Balanced);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const processVideo = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAudioLoaded(false);
    audioBufferRef.current = null;
    
    try {
      setStatus('Extraindo Frames...');
      const frames = await extractFramesFromVideo(file, detailLevel === VideoDetailLevel.Fast ? 1 : 2, (p) => setProgress(p));
      
      setStatus('IA Analisando Vídeo...');
      const narrative = await narrateVideoFrames(frames, detailLevel);
      
      setResult({ 
        text: narrative, 
        stats: { 
          inputCount: frames.length, 
          outputWordCount: narrative.split(/\s+/).length, 
          readTimeMinutes: narrative.split(/\s+/).length / 200 
        } 
      });

      setStatus('Sintetizando Narração...');
      const audioBase64 = await generateSpeech(narrative);
      if (audioBase64) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioBufferRef.current = await decodeRawPcm(base64ToUint8Array(audioBase64), audioContextRef.current);
        setAudioLoaded(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro no processamento. Verifique sua conexão ou tamanho do vídeo.");
    } finally {
      setLoading(false);
      setProgress(0);
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
        <label className="block text-sm font-bold mb-4">Carregar Vídeo para Análise</label>
        <div className="border border-slate-200 rounded-lg p-10 bg-slate-50 text-center hover:bg-slate-100 transition-all border-dashed relative">
          <input 
            type="file" 
            accept="video/*" 
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
                setResult(null);
                setAudioLoaded(false);
              }
            }} 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            disabled={loading}
          />
          <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 font-semibold">{file ? file.name : 'Clique ou arraste o vídeo aqui'}</p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Profundidade da IA</label>
            <div className="flex gap-2">
              {Object.values(VideoDetailLevel).map(level => (
                <button
                  key={level}
                  onClick={() => setDetailLevel(level)}
                  className={`flex-1 py-3 text-xs font-bold rounded-md border transition-all ${detailLevel === level ? 'bg-red-50 border-red-500 text-red-600 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                >
                  {level === 'fast' ? 'Rápida' : level === 'balanced' ? 'Equilibrada' : 'Detalhada'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={processVideo}
            disabled={!file || loading}
            className="st-button-primary w-full h-14"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {status} {progress > 0 ? `${progress}%` : ''}</> : <><Play className="w-5 h-5" /> Iniciar Análise Multimodal</>}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="st-card animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
               <div className="bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider">Resultado</div>
               <div className="flex items-center gap-1 text-slate-400 text-xs font-medium"><Clock className="w-4 h-4" /> {result.stats?.readTimeMinutes.toFixed(1)} min de leitura</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onFastRead(result.text)}
                className="p-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-2"
                title="Leitura Dinâmica"
              >
                <Zap className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase hidden md:inline">Fast Read</span>
              </button>
              {audioLoaded && (
                <button 
                  onClick={playAudio} 
                  title="Ouvir Narração"
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase hidden md:inline">Ouvir</span>
                </button>
              )}
              <button onClick={() => {
                const blob = new Blob([result.text], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `roteiro_${file?.name}.txt`;
                a.click();
              }} className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors shadow-sm"><Download className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-slate bg-slate-50 p-6 rounded-xl border border-slate-100">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};