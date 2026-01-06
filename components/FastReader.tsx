import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Gauge, Type, AlignCenter } from 'lucide-react';

interface FastReaderProps {
  initialText?: string;
}

export const FastReader: React.FC<FastReaderProps> = ({ initialText = '' }) => {
  const [text, setText] = useState(initialText);
  const [wpm, setWpm] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const words = useMemo(() => {
    return text.trim().split(/\s+/).filter(w => w.length > 0);
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
  
  // Lógica para destacar o ponto focal (ORP)
  const renderWord = (word: string) => {
    if (!word) return <span className="text-slate-300">Pronto?</span>;
    const mid = Math.floor(word.length / 2);
    return (
      <>
        <span className="opacity-40">{word.slice(0, mid)}</span>
        <span className="text-red-500 font-black">{word[mid]}</span>
        <span className="opacity-40">{word.slice(mid + 1)}</span>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="st-card">
        <label className="block text-sm font-bold mb-4">Texto para Leitura</label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); reset(); }}
          placeholder="Cole aqui o texto que deseja ler rapidamente..."
          className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none font-medium text-slate-700"
        />
      </div>

      <div className="st-card bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
        {/* Marcadores de Foco */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 w-px h-4 bg-red-500/30"></div>
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 w-px h-4 bg-red-500/30"></div>

        <div className="h-64 flex items-center justify-center">
          <div className="text-5xl md:text-7xl font-bold text-white tracking-tight text-center font-mono">
            {renderWord(currentWord)}
          </div>
        </div>

        {/* Progresso */}
        <div className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-200" style={{ width: `${(currentIndex / words.length) * 100}%` }}></div>
      </div>

      <div className="st-card flex flex-col md:flex-row items-center gap-8">
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${isPlaying ? 'bg-slate-100 text-slate-900' : 'bg-red-500 text-white'}`}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
        </div>

        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Velocidade: {wpm} WPM</span>
            <span>{currentIndex} / {words.length} palavras</span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={wpm}
            onChange={(e) => setWpm(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>
    </div>
  );
};