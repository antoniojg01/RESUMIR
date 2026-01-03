import React, { useState, useRef } from 'react';
import { VideoDetailLevel, ProcessingResult } from '../types';
import { extractFramesFromVideo, base64ToUint8Array, decodeRawPcm, audioBufferToWav } from '../utils/mediaUtils';
import { narrateVideoFrames, generateSpeech } from '../services/geminiService';
import { Upload, Play, FileVideo, Clock, Loader2, Download, AlertCircle, Volume2, Music } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const VideoProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [detailLevel, setDetailLevel] = useState<VideoDetailLevel>(VideoDetailLevel.Balanced);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
      audioBufferRef.current = null;
    }
  };

  const processVideo = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    audioBufferRef.current = null;
    
    try {
      setStatus('Extraindo frames...');
      setProgress(0);
      
      const framesPerMin = detailLevel === VideoDetailLevel.Fast ? 1 : detailLevel === VideoDetailLevel.Balanced ? 2 : 4;
      const frames = await extractFramesFromVideo(file, framesPerMin, (p) => setProgress(p));
      
      setStatus('Analisando com Gemini...');
      const narrative = await narrateVideoFrames(frames, detailLevel);
      
      const wordCount = narrative.split(/\s+/).length;
      
      const res: ProcessingResult = {
        text: narrative,
        stats: {
          inputCount: frames.length,
          outputWordCount: wordCount,
          readTimeMinutes: wordCount / 200,
        }
      };
      setResult(res);

      if (generateAudio) {
        setStatus('Gerando narração...');
        const audioBase64 = await generateSpeech(narrative);
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const uint8Array = base64ToUint8Array(audioBase64);
        const buffer = await decodeRawPcm(uint8Array, audioContextRef.current);
        audioBufferRef.current = buffer;
      }
      setStatus('Concluído!');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao processar o vídeo.");
    } finally {
      setLoading(false);
      setProgress(0);
      setStatus('');
    }
  };

  const playAudio = () => {
    if (audioContextRef.current && audioBufferRef.current) {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.start();
    }
  };
  
  const downloadAudio = () => {
    if (!audioBufferRef.current) return;
    const wavBlob = audioBufferToWav(audioBufferRef.current);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.split('.')[0]}_narration.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name.split('.')[0]}_narrative.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
          <FileVideo className="w-5 h-5 text-indigo-600" />
          Configuração do Vídeo
        </h2>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors bg-slate-50">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
               {file ? (
                 <>
                  <FileVideo className="w-10 h-10 text-indigo-600" />
                  <span className="font-medium text-slate-700">{file.name}</span>
                  <span className="text-sm text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                 </>
               ) : (
                 <>
                  <Upload className="w-10 h-10 text-slate-400" />
                  <span className="text-slate-600">Clique para selecionar um vídeo</span>
                  <span className="text-xs text-slate-400">MP4, MKV, AVI, MOV</span>
                 </>
               )}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Nível de Detalhe (Frames/min)</label>
               <div className="flex bg-slate-100 p-1 rounded-lg">
                 {Object.values(VideoDetailLevel).map((level) => (
                   <button
                     key={level}
                     onClick={() => setDetailLevel(level)}
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                       detailLevel === level 
                       ? 'bg-white text-indigo-700 shadow-sm' 
                       : 'text-slate-500 hover:text-slate-700'
                     }`}
                   >
                     {level === 'fast' ? 'Rápido (1)' : level === 'balanced' ? 'Balanceado (2)' : 'Detalhado (4)'}
                   </button>
                 ))}
               </div>
             </div>

             <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-lg border border-slate-200 w-full hover:bg-slate-100 transition-colors group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${generateAudio ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 group-hover:border-indigo-400'}`}>
                    {generateAudio && <span className="text-white text-xs">✓</span>}
                  </div>
                  <input 
                    type="checkbox" 
                    checked={generateAudio} 
                    onChange={(e) => setGenerateAudio(e.target.checked)} 
                    className="hidden"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Gerar narração em áudio (TTS)</span>
                    <span className="text-xs text-slate-500">Narração natural com Gemini 2.5</span>
                  </div>
                </label>
             </div>
          </div>

          <button
            onClick={processVideo}
            disabled={!file || loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all shadow-md flex items-center justify-center gap-2
              ${!file || loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-[0.99]'}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {status} {progress > 0 && progress < 100 ? `(${progress}%)` : ''}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Iniciar Processamento
              </>
            )}
          </button>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center flex-wrap gap-4">
             <div className="flex gap-4 text-sm text-indigo-900">
               <div className="flex items-center gap-1">
                 <Clock className="w-4 h-4 text-indigo-500" />
                 {result.stats?.readTimeMinutes.toFixed(1)} min leitura
               </div>
               <div className="flex items-center gap-1">
                 <span className="font-bold">{result.stats?.outputWordCount}</span> palavras
               </div>
             </div>
             
             <div className="flex gap-2">
                {audioBufferRef.current && (
                  <>
                    <button onClick={playAudio} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors">
                      <Volume2 className="w-4 h-4" /> Ouvir
                    </button>
                    <button onClick={downloadAudio} title="Baixar Áudio WAV" className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm rounded-md hover:bg-indigo-200 transition-colors">
                      <Music className="w-4 h-4" /> Áudio (WAV)
                    </button>
                  </>
                )}
                <button onClick={downloadText} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4" /> Texto
                </button>
             </div>
          </div>
          
          <div className="p-8 prose prose-slate max-w-none">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
