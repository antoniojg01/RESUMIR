
import React, { useState, useEffect } from 'react';
import { VideoProcessor } from './components/VideoProcessor';
import { PdfProcessor } from './components/PdfProcessor';
import { FastReader } from './components/FastReader';
import { Clapperboard, FileText, Info, Settings, Layout, Github, Zap, Gauge, Key, ExternalLink, AlertCircle } from 'lucide-react';

// Adjusted declaration to match the existing AIStudio type provided by the environment
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'pdf' | 'fast-reader' | 'about'>('video');
  const [sharedText, setSharedText] = useState('');
  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(hasKey);
        } else {
          // Fallback para ambientes onde a chave já vem injetada diretamente
          setIsKeySelected(!!process.env.API_KEY);
        }
      } catch (e) {
        setIsKeySelected(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume sucesso após o clique conforme as regras de race condition
      setIsKeySelected(true);
    }
  };

  const handleOpenInFastReader = (text: string) => {
    setSharedText(text);
    setActiveTab('fast-reader');
  };

  // Enquanto verifica a chave, mostra um estado neutro
  if (isKeySelected === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Iniciando Core...</p>
        </div>
      </div>
    );
  }

  // Se a chave não estiver selecionada, mostra o Gateway
  if (!isKeySelected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="st-card max-w-md w-full shadow-2xl border-t-4 border-t-red-500 p-10 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-red-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Configuração Necessária</h2>
          <p className="text-slate-600 mb-8 text-sm leading-relaxed">
            Para utilizar os modelos <strong>Gemini 3 Pro</strong> e <strong>Flash</strong> em sua capacidade total, você precisa selecionar uma chave de API vinculada a um projeto com faturamento ativo.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleOpenSelectKey}
              className="st-button-primary w-full h-14 text-lg"
            >
              <Key className="w-5 h-5" />
              Configurar Chave de API
            </button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Documentação de Faturamento <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="mt-10 p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-medium">
              Nota: A chave é armazenada de forma segura pela plataforma. O aplicativo não tem acesso direto à sua chave privada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Estilo Streamlit */}
      <aside className="st-sidebar flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-red-500 p-2 rounded-lg shadow-lg shadow-red-200">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Content Narrator</h1>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Produtividade</p>
            <button
              onClick={() => setActiveTab('video')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'video' ? 'bg-white text-red-500 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Clapperboard className="w-4 h-4" />
              Narrar Vídeo
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pdf' ? 'bg-white text-red-500 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <FileText className="w-4 h-4" />
              Destrinchar PDF
            </button>
            <button
              onClick={() => setActiveTab('fast-reader')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'fast-reader' ? 'bg-white text-red-500 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Zap className="w-4 h-4" />
              Fast Reader
            </button>
            
            <div className="pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Info</p>
              <button
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'about' ? 'bg-white text-red-500 shadow-sm border border-slate-100' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                <Info className="w-4 h-4" />
                Sobre o App
              </button>
            </div>
          </nav>

          <div className="mt-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Status do Sistema</p>
            <div className="bg-slate-200/50 rounded-lg p-3 text-[11px] text-slate-500 space-y-2">
              <div className="flex justify-between"><span>IA Core:</span> <span className="text-emerald-600 font-bold">Online</span></div>
              <div className="flex justify-between"><span>TTS Engine:</span> <span className="text-emerald-600 font-bold">Online</span></div>
              <div className="flex justify-between"><span>Chave:</span> <span className="text-emerald-600 font-bold">Ativa</span></div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
           <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors font-bold uppercase tracking-tighter">
             <Gauge className="w-4 h-4" /> Gemini Pro 3 API
           </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="st-main flex-1">
        <header className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
            {activeTab === 'video' && '🎬 Narração de Vídeo'}
            {activeTab === 'pdf' && '📄 Análise de PDF'}
            {activeTab === 'fast-reader' && '⚡ Leitura Dinâmica'}
            {activeTab === 'about' && 'ℹ️ Sobre o Projeto'}
          </h2>
          <p className="text-slate-500 font-medium">
            {activeTab === 'video' && 'Transforme visual em áudio roteirizado.'}
            {activeTab === 'pdf' && 'Desmonte documentos complexos em seções.'}
            {activeTab === 'fast-reader' && 'Consuma conteúdo até 5x mais rápido com RSVP.'}
            {activeTab === 'about' && 'Inteligência Artificial Multimodal aplicada.'}
          </p>
          <div className="h-1.5 w-16 bg-red-500 mt-5 rounded-full"></div>
        </header>

        <section className="relative">
          <div className={activeTab === 'video' ? 'block animate-in fade-in duration-500' : 'hidden'}>
            <VideoProcessor onFastRead={handleOpenInFastReader} />
          </div>
          
          <div className={activeTab === 'pdf' ? 'block animate-in fade-in duration-500' : 'hidden'}>
            <PdfProcessor onFastRead={handleOpenInFastReader} />
          </div>
          
          <div className={activeTab === 'fast-reader' ? 'block animate-in fade-in duration-500' : 'hidden'}>
            <FastReader initialText={sharedText} />
          </div>
          
          <div className={activeTab === 'about' ? 'block animate-in fade-in duration-500' : 'hidden'}>
            <div className="st-card prose prose-slate max-w-none shadow-sm">
              <h3 className="text-xl font-bold mb-4">Content Narrator v2.5</h3>
              <p>Uma ferramenta projetada para quem precisa consumir grandes volumes de informação em tempo recorde.</p>
              <div className="bg-red-50 p-6 rounded-xl border border-red-100 my-6">
                <h4 className="text-red-900 font-bold mb-2">Por que Fast Reader?</h4>
                <p className="text-sm text-red-800 m-0">Estudos mostram que o maior gargalo da leitura é a sub-vocalização e o movimento dos olhos. O Fast Reader elimina ambos, mantendo o foco no centro da visão.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
           <span>Build Stable 2025.01</span>
           <span>Powered by Google Gemini</span>
        </footer>
      </main>
    </div>
  );
};

export default App;
