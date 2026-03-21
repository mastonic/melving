
import React, { useState, useEffect } from 'react';

const AdminSettings: React.FC = () => {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>(
    (localStorage.getItem('AI_PROVIDER') as any) || 'gemini'
  );
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('OPENAI_API_KEY') || '');
  const [claudeKey, setClaudeKey] = useState(localStorage.getItem('CLAUDE_API_KEY') || '');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  const handleSave = () => {
    localStorage.setItem('AI_PROVIDER', provider);
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('OPENAI_API_KEY', openaiKey);
    localStorage.setItem('CLAUDE_API_KEY', claudeKey);

    // Also update the active key based on provider for backward compatibility
    if (provider === 'openai') {
        localStorage.setItem('ACTIVE_API_KEY', openaiKey);
    } else if (provider === 'claude') {
        localStorage.setItem('ACTIVE_API_KEY', claudeKey);
    } else {
        localStorage.setItem('ACTIVE_API_KEY', geminiKey);
    }

    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-12 text-left">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-4">Administration IA</h1>
        <p className="text-slate-500 font-medium">Configurez vos accès aux moteurs d'intelligence artificielle pour SUB'ÉCO IMPACT.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar help */}
        <div className="col-span-1 space-y-6 text-left">
            <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100">
                <h3 className="text-emerald-900 font-bold mb-4 flex items-center">
                    <i className="fas fa-lightbulb mr-2 text-emerald-500"></i> Conseil Expert
                </h3>
                <p className="text-emerald-700 text-sm leading-relaxed font-medium">
                    Pour une utilisation stable en Martinique/Guadeloupe, nous recommandons <strong>OpenAI (GPT-4o mini)</strong>. 
                    Gemini est excellent mais peut subir des restrictions géographiques en zone EEA.
                </p>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                <h3 className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-4">Statut Système</h3>
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${(provider === 'openai' && openaiKey) || (provider === 'gemini' && geminiKey) || (provider === 'claude' && claudeKey) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                    <span className="text-xs font-bold uppercase tracking-tight">Connecté à {provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Claude' : 'Gemini'}</span>
                </div>
            </div>
        </div>

        {/* Form area */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-100 border border-slate-100 text-left">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center">
                <i className="fas fa-plug mr-3 text-emerald-600"></i> Configuration des Moteurs
            </h2>

            <div className="space-y-10">
              {/* Provider Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Choisir le moteur par défaut</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setProvider('gemini')}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${provider === 'gemini' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                  >
                    <i className={`fab fa-google text-2xl mb-3 ${provider === 'gemini' ? 'text-emerald-600' : 'text-slate-300'}`}></i>
                    <span className="font-black uppercase text-xs tracking-widest">Google Gemini</span>
                  </button>
                  <button
                    onClick={() => setProvider('openai')}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${provider === 'openai' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                  >
                    <i className={`fas fa-bolt text-2xl mb-3 ${provider === 'openai' ? 'text-emerald-600' : 'text-slate-300'}`}></i>
                    <span className="font-black uppercase text-xs tracking-widest">OpenAI ChatGPT</span>
                  </button>
                  <button
                    onClick={() => setProvider('claude')}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${provider === 'claude' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                  >
                    <i className={`fas fa-robot text-2xl mb-3 ${provider === 'claude' ? 'text-emerald-600' : 'text-slate-300'}`}></i>
                    <span className="font-black uppercase text-xs tracking-widest">Claude</span>
                  </button>
                </div>
              </div>

              {/* API Keys */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex justify-between items-center">
                    <span>Clé API Google Gemini</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-emerald-600 hover:underline">Obtenir →</a>
                  </label>
                  <input 
                    type="password" 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-sm focus:bg-white focus:border-emerald-600 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex justify-between items-center">
                    <span>Clé API OpenAI</span>
                    <a href="https://platform.openai.com/api-keys" target="_blank" className="text-emerald-600 hover:underline">Obtenir →</a>
                  </label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-sm focus:bg-white focus:border-emerald-600 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex justify-between items-center">
                    <span>Clé API Claude (Anthropic)</span>
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-emerald-600 hover:underline">Obtenir →</a>
                  </label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-sm focus:bg-white focus:border-emerald-600 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-slate-900 text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center transform active:scale-95"
              >
                {status === 'saved' ? (
                    <><i className="fas fa-check mr-2"></i> Paramètres Enregistrés</>
                ) : (
                    <><i className="fas fa-save mr-2"></i> Enregistrer la Configuration</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
