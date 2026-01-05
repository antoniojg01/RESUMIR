import React, { useState } from 'react';
import { VideoProcessor } from './components/VideoProcessor';
import { PdfProcessor } from './components/PdfProcessor';
import { Clapperboard, FileText, Info, Settings, Layout, Github, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'pdf' | 'about'>('video');

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - O "Coração" do Streamlit */}
      <aside className="st-sidebar flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-red-500 p-2 rounded-lg">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Content Narrator</h1>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Ferramentas</p>
            <button
              onClick={() => setActiveTab('video')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'video' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Clapperboard className="w-4 h-4" />
              Narrar Vídeo
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pdf' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <FileText className="w-4 h-4" />
              Destrinchar PDF
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'about' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              <Info className="w-4 h-4" />
              Sobre o App
            </button>
          </nav>

          <div className="mt-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Configurações Ativas</p>
            <div className="bg-slate-200/50 rounded-lg p-3 text-[11px] text-slate-500 space-y-2">
              <div className="flex justify-between"><span>Modelo:</span> <span className="font-bold text-slate-700">Gemini 3 Pro</span></div>
              <div className="flex justify-between"><span>Audio:</span> <span className="font-bold text-slate-700">Gemini TTS</span></div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200">
           <a href="#" className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors">
             <Github className="w-4 h-4" /> Ver no GitHub
           </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="st-main flex-1">
        <header className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {activeTab === 'video' ? '🎬 Narração de Vídeo com IA' : activeTab === 'pdf' ? '📄 Análise Estruturada de PDF' : 'ℹ️ Sobre o Projeto'}
          </h2>
          <p className="text-slate-500">
            {activeTab === 'video' ? 'Envie um vídeo para gerar roteiros narrativos automáticos.' : activeTab === 'pdf' ? 'Desmonte documentos longos em seções compreensíveis.' : 'Conheça a tecnologia por trás do Content Narrator.'}
          </p>
          <div className="h-1 w-20 bg-red-500 mt-4 rounded-full"></div>
        </header>

        <section className="animate-in fade-in duration-500">
          {activeTab === 'video' && <VideoProcessor />}
          {activeTab === 'pdf' && <PdfProcessor />}
          {activeTab === 'about' && (
            <div className="st-card prose prose-slate max-w-none">
              <h3 className="text-xl font-bold mb-4">Tecnologia Multimodal</h3>
              <p>O <strong>Content Narrator</strong> é uma plataforma experimental que utiliza os modelos de última geração do Google Gemini para processar mídia localmente.</p>
              
              <div className="grid md:grid-cols-2 gap-4 my-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-blue-900 font-bold mb-1 flex items-center gap-2 text-sm"><Settings className="w-4 h-4" /> Gemini 3 Flash</h4>
                  <p className="text-xs text-blue-700">Utilizado para mapeamento rápido de capítulos e análise de frames de vídeo.</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <h4 className="text-emerald-900 font-bold mb-1 flex items-center gap-2 text-sm"><ExternalLink className="w-4 h-4" /> Gemini 3 Pro</h4>
                  <p className="text-xs text-emerald-700">Processamento pesado de texto para garantir densidade de 30%, 50% ou 80% do conteúdo original.</p>
                </div>
              </div>

              <h4 className="font-bold mb-2">Segurança de Dados</h4>
              <p className="text-sm">Todo o processamento de arquivos (extração de frames, leitura de PDFs) ocorre diretamente no seu navegador. Os dados são enviados de forma segura apenas para inferência da IA.</p>
            </div>
          )}
        </section>

        <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <span>Build v2.1.0 • Streamlit Theme</span>
           <span>Powered by Google GenAI</span>
        </footer>
      </main>
    </div>
  );
};

export default App;