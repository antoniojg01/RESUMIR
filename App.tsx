import React, { useState } from 'react';
import { VideoProcessor } from './components/VideoProcessor';
import { PdfProcessor } from './components/PdfProcessor';
import { Clapperboard, FileText, Info, BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'pdf' | 'about'>('video');

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-4 shadow-sm">
             <Clapperboard className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Content Narrator</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Narrativas visuais com Gemini 2.5 Flash e desestruturação profunda de PDFs com <span className="text-emerald-600 font-bold">Gemini 3 Pro</span>.
          </p>
        </div>
        
        {/* Navigation */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-center">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-all ${activeTab === 'video' ? 'border-indigo-600 text-indigo-600 scale-105' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Clapperboard className="w-4 h-4" />
                Narrar Vídeo
              </button>

              <button
                onClick={() => setActiveTab('pdf')}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-all ${activeTab === 'pdf' ? 'border-emerald-600 text-emerald-600 scale-105' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FileText className="w-4 h-4" />
                Destrinchar PDF
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-bold text-sm transition-all ${activeTab === 'about' ? 'border-slate-900 text-slate-900 scale-105' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Info className="w-4 h-4" />
                Sobre
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'video' && <VideoProcessor />}
        {activeTab === 'pdf' && <PdfProcessor />}
        {activeTab === 'about' && (
           <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-in zoom-in-95 duration-300">
             <div className="flex items-center gap-3 mb-6">
               <BrainCircuit className="w-8 h-8 text-indigo-600" />
               <h2 className="text-2xl font-black text-slate-900">Tecnologia de Ponta</h2>
             </div>
             
             <div className="space-y-6 text-slate-600 leading-relaxed">
               <div className="grid md:grid-cols-2 gap-8">
                 <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                   <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                     <Clapperboard className="w-4 h-4" /> Vídeo (Flash 2.5)
                   </h3>
                   <p className="text-sm">Extração de frames locais e análise multimodal instantânea para gerar roteiros de cena.</p>
                 </div>
                 
                 <div className="bg-emerald-50/50 p-6 rounded-xl border border-emerald-100">
                    <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                     <FileText className="w-4 h-4" /> PDF (Pro 3.0)
                   </h3>
                    <p className="text-sm">O modo <strong>Detalhado</strong> busca preservar 80% do volume original, realizando uma reescrita narrativa exaustiva do documento.</p>
                 </div>
               </div>

               <div className="bg-slate-900 text-slate-100 p-6 rounded-xl">
                 <h3 className="font-bold mb-3">Privacidade & Performance</h3>
                 <p className="text-sm opacity-90">Todo o processamento de mídia é feito localmente no seu navegador. Apenas os dados necessários para a análise são enviados via criptografia para os servidores do Google Gemini.</p>
               </div>
             </div>
           </div>
        )}
      </main>
      
      <footer className="text-center text-slate-400 text-xs mt-12 mb-8">
        <p>Desenvolvido com Google GenAI SDK • 2024</p>
      </footer>
    </div>
  );
};

export default App;