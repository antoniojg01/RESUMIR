import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Gauge, Zap, Info } from 'lucide-react';

interface FastReaderProps {
  initialText?: string;
}

export const FastReader: React.FC<FastReaderProps> = ({ initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [wpm, setWpm] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sincroniza o texto se ele mudar externamente (ex: vindo do PDF ou Vídeo)
  useEffect(() => {
    if (initialText) {
      setText(initialText);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [initialText]);

  const words = useMemo(() => {
    // Remove markdown básico para não poluir a leitura dinâmica
    const cleanText = text.replace(/[*#_~`>]/g, '');
    return cleanText.trim().split(/\s+/).filter(w => w.length > 0);
  }, [text]);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && currentIndex < words.length) {
      const delay = 60000 / wpm;
      timerRef.current = window.setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, delay);
    } else if (currentIndex >= words.length) {
      setIsPlaying(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, words, wpm]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const reset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const currentWord = words[currentIndex] || '';
  
  const renderWord = (word: string) => {
    if (!word) return <span className="text-slate-600 animate-pulse text-2xl uppercase tracking-tighter">Aguardando Texto...</span>;
    const mid = Math.floor(word.length / 2);
    return (
      <div className="flex justify-center">
        <span className="opacity-30 text-right min-w-[45%]">{word.slice(0, mid)}</span>
        <span className="text-red-500 font-black inline-block text-center min-w-[10%]">{word[mid]}</span>
        <span className="opacity-30 text-left min-w-[45%]">{word.slice(mid + 1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="st-card border-l-4 border-l-red-500 bg-red-50/30">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Modo de Leitura Ativo</h4>
            <p className="text-xs text-red-700/70">O conteúdo gerado pela IA foi carregado. Ajuste a velocidade e foque no ponto vermelho.</p>
          </div>
        </div>
      </div>

      <div className="st-card bg-slate-900 border-none shadow-2xl relative overflow-hidden h-80 flex flex-col items-center justify-center">
        {/* Marcadores de Foco Superior/Inferior */}
        <div className="absolute left-1/2 top-10 -translate-x-1/2 w-0.5 h-6 bg-red-500/40"></div>
        <div className="absolute left-1/2 bottom-10 -translate-x-1/2 w-0.5 h-6 bg-red-500/40"></div>

        <div className="w-full px-4">
          <div className="text-4xl md:text-6xl font-bold text-white tracking-tight font-mono">
            {renderWord(currentWord)}
          </div>
        </div>

        {/* Barra de Progresso Minimalista */}
        <div className="absolute bottom-0 left-0 h-1.5 bg-red-500 transition-all duration-150" style={{ width: `${(currentIndex / words.length) * 100}%` }}></div>
      </div>

      <div className="st-card flex flex-col md:flex-row items-center gap-8">
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
            title="Recomeçar"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={togglePlay}
            disabled={words.length === 0}
            className={`w-16 h-16 flex items-center justify-center rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-30 ${isPlaying ? 'bg-white text-slate-900 border border-slate-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Velocidade de Processamento</span>
              <span className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-red-500" /> {wpm} <span className="text-xs text-slate-400 font-bold">WPM</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Progresso</span>
              <span className="text-sm font-bold text-slate-600">{currentIndex} / {words.length}</span>
            </div>
          </div>
          <input
            type="range"
            min="100"
            max="1200"
            step="50"
            value={wpm}
            onChange={(e) => setWpm(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>

      <div className="st-card">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Texto Fonte</label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); reset(); }}
          placeholder="O texto gerado aparecerá aqui..."
          className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none text-slate-700 font-medium"
        />
      </div>
    </div>
  );
};