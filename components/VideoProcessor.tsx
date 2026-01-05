import React, { useState, useRef } from 'react';
import { VideoDetailLevel, ProcessingResult } from '../types';
import { extractFramesFromVideo, base64ToUint8Array, decodeRawPcm, audioBufferToWav } from '../utils/mediaUtils';
import { narrateVideoFrames, generateSpeech } from '../services/geminiService';
import { Upload, Play, Loader2, Download, AlertCircle, Volume2, Clock, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const VideoProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [detailLevel, setDetailLevel] = useState<VideoDetailLevel>(VideoDetailLevel.Balanced);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const processVideo = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setStatus('Extraindo Frames...');
      const frames = await extractFramesFromVideo(file, detailLevel === VideoDetailLevel.Fast ? 1 : 2, (p) => setProgress(p));
      setStatus('Analisando Visualmente...');
      const narrative = await narrateVideoFrames(frames, detailLevel);
      setResult({ text: narrative, stats: { inputCount: frames.length, outputWordCount: narrative.split(/\s+/).length, readTimeMinutes: narrative.split(/\s+/).length / 200 } });
      setStatus('Gerando Áudio...');
      const audioBase64 = await generateSpeech(narrative);
      if (audioBase64) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioBufferRef.current = await decodeRawPcm(base64ToUint8Array(audioBase64), audioContextRef.current);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
      setStatus('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="st-card">
        <label className="block text-sm font-bold mb-4">Carregar Vídeo</label>
        <div className="border border-slate-200 rounded-lg p-8 bg-slate-50 text-center hover:bg-slate-100 transition-colors border-dashed relative">
          <input type="file" accept="video/*" onChange={e => e.target.files && setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 font-medium">{file ? file.name : 'Arraste seu arquivo aqui'}</p>
          <p className="text-[10px] text-slate-400 mt-1">Limite recomendado: 50MB</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Intensidade da Análise</label>
            <div className="flex gap-2">
              {Object.values(VideoDetailLevel).map(level => (
                <button
                  key={level}
                  onClick={() => setDetailLevel(level)}
                  className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${detailLevel === level ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}
                >
                  {level === 'fast' ? 'Rápida' : level === 'balanced' ? 'Normal' : 'Profunda'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={processVideo}
            disabled={!file || loading}
            className="st-button-primary w-full flex items-center justify-center gap-2 h-12"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {status} {progress > 0 && `(${progress}%)`}</> : <><Play className="w-5 h-5" /> Executar Análise</>}
          </button>
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
      </div>

      {result && (
        <div className="st-card space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
               <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Processado com Sucesso</div>
               <div className="flex items-center gap-1 text-slate-500 text-xs"><Clock className="w-3 h-3" /> {result.stats?.readTimeMinutes.toFixed(1)} min</div>
            </div>
            <div className="flex gap-2">
              {audioBufferRef.current && (
                <button onClick={() => {
                   const src = audioContextRef.current!.createBufferSource();
                   src.buffer = audioBufferRef.current;
                   src.connect(audioContextRef.current!.destination);
                   src.start();
                }} className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Volume2 className="w-4 h-4" /></button>
              )}
              <button onClick={() => {
                const blob = new Blob([result.text], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'narrativa.txt';
                a.click();
              }} className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><Download className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};