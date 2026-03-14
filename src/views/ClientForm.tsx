
import React, { useState } from 'react';
import { storage } from '../services/storage';
import { geminiService } from '../services/gemini';
import { Client, Project, ProjectStatus } from '../types';
import { generateUUID } from '../utils/uuid';

interface ClientFormProps {
  onSuccess: (projectId: string) => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ onSuccess }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [roughText, setRoughText] = useState('');
  const [showMagicFill, setShowMagicFill] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', siret: '',
    sector: 'Technologie / Numérique', region: 'Martinique', size: 'TPE' as 'TPE' | 'PME' | 'GE',
    title: '', theme: '', context: ''
  });

  const handleMagicFill = async () => {
    if (!roughText) return;
    setLoadingAI(true);
    try {
      const extracted = await geminiService.analyzeDocument(roughText);
      setFormData(prev => ({ 
        ...prev, 
        title: extracted.title || prev.title,
        theme: extracted.theme || prev.theme,
        context: extracted.context || prev.context
      }));
      setShowMagicFill(false);
    } catch (e: any) {
      handleAIError(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientId = generateUUID();
    const projectId = generateUUID();

    const client: Client = {
      id: clientId, name: formData.name, email: formData.email, phone: formData.phone,
      siret: formData.siret, sector: formData.sector, region: formData.region, size: formData.size,
      createdAt: new Date().toISOString()
    };

    const project: Project = {
      id: projectId, clientId, 
      title: formData.title || "Nouveau Projet",
      description: '',
      theme: formData.theme,
      context: formData.context,
      status: ProjectStatus.QUALIFICATION,
      selectedGrantIds: [], documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.saveClient(client);
    storage.saveProject(project);
    onSuccess(projectId);
  };

  const handleAIError = (error: any) => {
    console.error("Erreur IA détaillée :", error);
    setLoadingAI(false);

    const errorMsg = error?.message || "";
    const isApiKeyError = 
      errorMsg === "apikey_missing" || 
      errorMsg.includes("API Key must be set") ||
      errorMsg.includes("leaked") ||
      error?.status === 403;

    if (isApiKeyError) {
      const reason = errorMsg.includes("leaked") ? "Votre clé API a été bloquée (leaked)." : "Clé API Gemini manquante ou invalide.";
      const newKey = prompt(`${reason}\n\nVous pouvez en obtenir une sur :\nhttps://aistudio.google.com/app/apikey\n\nVeuillez saisir une nouvelle clé API :`);
      if (newKey && newKey.trim()) {
        localStorage.setItem('GEMINI_API_KEY', newKey.trim());
        alert("Nouvelle clé enregistrée ! Relancez l'opération.");
        window.location.reload();
      }
      return;
    }
    
    if (error?.message?.includes('quota') || error?.status === 429) {
      if (error?.message?.includes('PerDay')) {
        alert("Quota QUOTIDIEN atteint. La limite gratuite par jour a été consommée. Veuillez patienter jusqu'à demain ou utiliser une clé payante.");
      } else {
        alert("quota atteint attendre 1 min");
      }
    } else {
      alert("Une erreur est survenue avec l'IA : " + (error?.message || "Erreur inconnue"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div className="text-left">
            <h2 className="text-2xl font-black tracking-tight">Initialisation du Dossier</h2>
            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mt-1">Étape 1 : Profil & Projet</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowMagicFill(!showMagicFill)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
          >
            <i className="fas fa-magic mr-2"></i> Remplissage IA
          </button>
        </div>

        {showMagicFill && (
          <div className="p-8 bg-emerald-50 border-b border-emerald-100 animate-in slide-in-from-top duration-300">
            <h4 className="text-sm font-black text-blue-900 mb-3 uppercase tracking-tight">Analyse de brouillon</h4>
            <textarea 
              className="w-full p-5 rounded-2xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm min-h-[120px] bg-white"
              placeholder="Collez ici votre texte pour extraire le titre et le contexte..."
              value={roughText}
              onChange={e => setRoughText(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <button onClick={handleMagicFill} disabled={loadingAI} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50">
                {loadingAI ? 'Analyse...' : 'Extraire les Données'}
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-10 space-y-10 text-left">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Identité Client</h3>
            </div>
            <FormField label="Raison Sociale" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
            <FormField label="SIRET" value={formData.siret} onChange={v => setFormData({...formData, siret: v})} />
            
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest block">Région</label>
              <select 
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
              >
                <option>Martinique</option>
                <option>Guadeloupe</option>
                <option>Guyane</option>
                <option>La Réunion</option>
                <option>France Métropolitaine</option>
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Le Projet</h3>
            </div>
            <FormField label="Nom du Projet" value={formData.title} onChange={v => setFormData({...formData, title: v})} required placeholder="Ex: Modernisation Digitale 2024" />
            <FormField label="Thématique" value={formData.theme} onChange={v => setFormData({...formData, theme: v})} placeholder="Ex: Numérique / Écologie" />
            
            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest block">Contexte opérationnel</label>
              <textarea 
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-sm min-h-[120px] focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-slate-900"
                placeholder="Expliquez brièvement le besoin..."
                value={formData.context}
                onChange={e => setFormData({...formData, context: e.target.value})}
              />
            </div>
          </section>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xl hover:bg-emerald-600 transition-all flex items-center justify-center group shadow-xl shadow-slate-200">
            Créer le Dossier <i className="fas fa-chevron-right ml-4 group-hover:translate-x-2 transition-transform"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string, required?: boolean }> = ({ label, value, onChange, placeholder, type = "text", required }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest block">{label}</label>
    <input 
      type={type}
      required={required}
      className="w-full px-5 py-3 rounded-2xl border border-slate-200 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export default ClientForm;
