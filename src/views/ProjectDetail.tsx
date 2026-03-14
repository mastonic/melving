
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { geminiService } from '../services/gemini';
import { Project, Client, Grant, ProjectStatus, DocumentFile } from '../types';
import { generateUUID } from '../utils/uuid';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'synthesis' | 'docs' | 'funding' | 'editor' | 'aid'>('synthesis');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [currentGrant, setCurrentGrant] = useState<Grant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => {
    const p = storage.getProject(projectId);
    if (p) {
      setProject(p);
      const c = storage.getClient(p.clientId);
      if (c) setClient(c);
      if (p.validatedGrant) {
        setCurrentGrant(p.validatedGrant);
      }
    }
  }, [projectId]);

  const saveProjectData = () => {
    if (project) {
      storage.saveProject({ ...project, updatedAt: new Date().toISOString() });
      setIsEditing(false);
    }
  };

  const handleAIError = (error: any) => {
    console.error("Erreur IA détaillée :", error);
    setIsAnalyzing(false);
    setLoading(false);

    const errorMsg = error?.message || "";
    if (errorMsg === "apikey_missing" || errorMsg.includes("API Key must be set")) {
      const newKey = prompt("Clé API Gemini manquante.\n\nVous pouvez en obtenir une gratuitement sur :\nhttps://aistudio.google.com/app/apikey\n\nVeuillez saisir votre clé API :");
      if (newKey && newKey.trim()) {
        localStorage.setItem('GEMINI_API_KEY', newKey.trim());
        alert("Clé API enregistrée localement ! Relancez l'opération.");
        window.location.reload();
      }
      return;
    }
    
    if (error?.message?.includes('quota') || error?.status === 429) {
      alert("quota atteint attendre 1 min");
    } else {
      alert("Une erreur est survenue avec l'IA : " + (error?.message || "Erreur inconnue"));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !project) return;

    setLoading(true);
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const newDoc: DocumentFile = {
          id: generateUUID(),
          name: file.name,
          type: file.type,
          content: content,
          uploadDate: new Date().toISOString()
        };
        
        setProject(prev => {
          if (!prev) return null;
          const updated = { ...prev, documents: [...(prev.documents || []), newDoc] };
          storage.saveProject(updated);
          return updated;
        });
      };
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
    setTimeout(() => setLoading(false), 800);
  };

  const handleAddNote = () => {
    if (!noteContent.trim() || !project) return;
    const newDoc: DocumentFile = {
      id: generateUUID(),
      name: `Note - ${new Date().toLocaleTimeString('fr-FR')}`,
      type: 'text/plain',
      content: noteContent,
      uploadDate: new Date().toISOString()
    };
    const updated = { ...project, documents: [...(project.documents || []), newDoc] };
    setProject(updated);
    storage.saveProject(updated);
    setNoteContent('');
    setShowNoteInput(false);
  };

  const handleDeleteDoc = (docId: string) => {
    if (!project) return;
    const updated = { ...project, documents: project.documents.filter(d => d.id !== docId) };
    setProject(updated);
    storage.saveProject(updated);
  };

  const handleRegenerateFromDocs = async () => {
    if (!project || !project.documents || project.documents.length === 0) {
      alert("Aucun document trouvé. Charger au moins une source.");
      return;
    }
    
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const extracted = await geminiService.analyzeDocument(project.documents);
      const cleanExtracted = extracted ? Object.fromEntries(
        Object.entries(extracted).filter(([_, v]) => v != null && v !== "")
      ) : {};

      const updatedProject = { ...project, ...cleanExtracted, updatedAt: new Date().toISOString() };
      setProject(updatedProject);
      storage.saveProject(updatedProject);

      if (currentGrant && client) {
        const newLetter = await geminiService.generateDocument(client, updatedProject, currentGrant, "Lettre d'Intention");
        setGeneratedDoc(newLetter);
      }

      setTimeout(() => {
        setIsAnalyzing(false);
        setActiveTab('synthesis');
      }, 1500);
    } catch (error: any) {
      handleAIError(error);
    }
  };

  const handleValidateAndSave = () => {
    if (!generatedDoc || !project || !currentGrant) return;
    
    const newDoc: DocumentFile = {
      id: generateUUID(),
      name: `Lettre_Intention_${currentGrant.provider}.txt`,
      type: 'text/plain',
      content: generatedDoc,
      uploadDate: new Date().toISOString()
    };

    const updated = { 
      ...project, 
      validatedGrant: currentGrant,
      documents: [...(project.documents || []), newDoc],
      status: ProjectStatus.PREPARATION,
      updatedAt: new Date().toISOString()
    };
    
    setProject(updated);
    storage.saveProject(updated);
    setActiveTab('aid');
    alert("Dossier validé et enregistré !");
  };

  const downloadExcel = () => {
    const csv = "Poste,Montant HT,Taux,Subvention\nInvestissement,10000,50%,5000\nConseil,5000,80%,4000";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Budget_${project?.title}.csv`;
    a.click();
  };

  const exportDoc = (format: 'pdf' | 'docx') => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: format === 'docx' ? 'application/msword' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Export_${project?.title}.${format === 'docx' ? 'doc' : 'pdf'}`;
    a.click();
  };

  if (!project || !client) return <div className="p-20 text-center font-bold">Chargement...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full text-center shadow-2xl relative overflow-hidden">
            <div className="w-32 h-32 mx-auto mb-10 relative">
              <div className="absolute inset-0 border-8 border-emerald-50 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
              <i className="fas fa-brain text-emerald-600 text-5xl absolute inset-0 flex items-center justify-center animate-pulse"></i>
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-6">Analyse Cognitive</h3>
            <p className="text-slate-500 font-bold leading-relaxed mb-8">Extraction et structuration intelligente...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center text-left">
          <button onClick={onBack} className="mr-6 w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-90">
            <i className="fas fa-chevron-left text-slate-900"></i>
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.title}</h1>
            <p className="text-emerald-600 font-bold text-[11px] uppercase tracking-widest mt-1">{client.name} • {client.region}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <button onClick={saveProjectData} className="bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 active:scale-95">
              <i className="fas fa-check mr-2"></i> Enregistrer
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-emerald-600 active:scale-95">
              <i className="fas fa-pen mr-2"></i> Éditer synthèse
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1.5 bg-slate-200/60 rounded-[1.25rem] mb-10 max-w-5xl overflow-x-auto whitespace-nowrap">
        <TabBtn active={activeTab === 'synthesis'} onClick={() => setActiveTab('synthesis')} label="Synthèse" icon="fa-file-lines" />
        <TabBtn active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} label="Sources" icon="fa-folder-open" />
        <TabBtn active={activeTab === 'funding'} onClick={() => setActiveTab('funding')} label="Détection" icon="fa-search-dollar" />
        {generatedDoc && <TabBtn active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} label="Éditeur" icon="fa-pen-nib" />}
        {(project.validatedGrant || currentGrant) && <TabBtn active={activeTab === 'aid'} onClick={() => setActiveTab('aid')} label="Aide Validée" icon="fa-hand-holding-dollar" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          
          {activeTab === 'synthesis' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10 animate-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <SynthesisField label="Nom du Projet" value={project.title} isEditing={isEditing} onChange={v => setProject({...project, title: v})} />
                <SynthesisField label="Thématique" value={project.theme} isEditing={isEditing} onChange={v => setProject({...project, theme: v})} />
                <SynthesisField label="Type de Projet" value={project.projectType} isEditing={isEditing} onChange={v => setProject({...project, projectType: v})} />
                <SynthesisField label="Durée" value={project.duration} isEditing={isEditing} onChange={v => setProject({...project, duration: v})} />
                <SynthesisField label="Début" type="date" value={project.startDate} isEditing={isEditing} onChange={v => setProject({...project, startDate: v})} />
                <SynthesisField label="Fin" type="date" value={project.endDate} isEditing={isEditing} onChange={v => setProject({...project, endDate: v})} />
                <SynthesisField label="Lieu" value={project.location} isEditing={isEditing} onChange={v => setProject({...project, location: v})} />
                <SynthesisField label="Objectif" value={project.target} isEditing={isEditing} onChange={v => setProject({...project, target: v})} />
              </div>
              <div className="space-y-10 pt-10 border-t border-slate-100">
                <SynthesisField isArea label="Contexte" value={project.context} isEditing={isEditing} onChange={v => setProject({...project, context: v})} />
                <SynthesisField isArea label="Objectif Technique" value={project.objectives} isEditing={isEditing} onChange={v => setProject({...project, objectives: v})} />
                <SynthesisField isArea isBudget label="Budget" value={project.financingPlan} isEditing={isEditing} onChange={v => setProject({...project, financingPlan: v})} />
              </div>
              {generatedDoc && (
                <div className="mt-12 pt-12 border-t-2 border-dashed border-slate-100">
                  <h3 className="text-lg font-black mb-6">Lettre d'Intention Prise</h3>
                  <div className="p-10 rounded-[2.5rem] bg-slate-900 text-slate-300 whitespace-pre-wrap text-sm text-left">{generatedDoc}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Centre de Connaissances</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sources analysées par l'intelligence cognitive</p>
                </div>
                <button 
                  onClick={handleRegenerateFromDocs}
                  disabled={isAnalyzing || !project.documents?.length}
                  className={`bg-emerald-600 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all flex items-center active:scale-95 shadow-xl shadow-emerald-100`}
                >
                  <i className="fas fa-magic mr-4"></i> Lancer l'analyse croisée
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="relative group">
                      <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl group-hover:bg-emerald-50 transition-all text-center">
                        <i className="fas fa-file-upload text-emerald-600 mb-3 block text-xl"></i>
                        <span className="text-[10px] font-black uppercase text-slate-600">Importer Fichiers</span>
                      </div>
                    </div>
                    <button onClick={() => setShowNoteInput(!showNoteInput)} className="w-full p-6 border-2 border-slate-50 rounded-3xl flex flex-col items-center hover:bg-slate-50 transition-all">
                      <i className="fas fa-pen-nib mb-3 text-xl text-slate-400"></i>
                      <span className="text-[10px] font-black uppercase">Saisir une Note</span>
                    </button>
                    {showNoteInput && (
                      <div className="space-y-4 pt-2">
                        <textarea className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs outline-none min-h-[150px]" value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Contenu de la note..." />
                        <button onClick={handleAddNote} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase">Enregistrer</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {project.documents?.map(doc => (
                      <div key={doc.id} onMouseEnter={() => setHoveredDoc(doc.id)} onMouseLeave={() => setHoveredDoc(null)} className="bg-white p-5 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:shadow-xl transition-all relative">
                        <div className="flex items-center space-x-4 min-w-0 pr-10">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${doc.name.includes('Note') ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-file-alt"></i>
                          </div>
                          <div className="truncate text-xs font-black text-slate-900">{doc.name}</div>
                        </div>
                        <button onClick={() => handleDeleteDoc(doc.id)} className="absolute right-4 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'funding' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="bg-emerald-600 p-12 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 border border-emerald-500">
                <div className="text-left">
                  <h3 className="text-3xl font-black tracking-tight"><i className="fas fa-robot mr-4"></i> Veille IA</h3>
                  <p className="text-emerald-100 text-xs font-bold uppercase mt-2">Financements territoriaux identifiés</p>
                </div>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await geminiService.detectFunding(client, project);
                      setGrants(res);
                    } catch (e) {
                      handleAIError(e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-white text-emerald-600 px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  {loading ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-sync-alt mr-3"></i>}
                  Lancer la détection
                </button>
              </div>
              <div className="grid gap-6">
                {grants.map((grant, idx) => (
                  <div key={idx} className="bg-white p-10 rounded-[3rem] border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 group text-left shadow-sm">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-xl">{grant.title}</h4>
                      <p className="text-sm text-slate-500 mt-6 leading-relaxed line-clamp-3">{grant.description}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          setCurrentGrant(grant);
                          const doc = await geminiService.generateDocument(client, project, grant, "Lettre d'Intention");
                          setGeneratedDoc(doc);
                          setActiveTab('editor');
                        } catch (e) {
                          handleAIError(e);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                      Sélectionner
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'editor' && generatedDoc && (
            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="p-12">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-10 pb-8 border-b border-slate-100 gap-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-xl"><i className="fas fa-file-signature text-lg"></i></div>
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Éditeur</h3>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={async () => {
                        if (client && project && currentGrant) {
                          setLoading(true);
                          try {
                            const doc = await geminiService.generateDocument(client, project, currentGrant, "Lettre d'Intention");
                            setGeneratedDoc(doc);
                            alert("Lettre mise à jour !");
                          } catch (e) {
                            handleAIError(e);
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      disabled={loading}
                      className="px-6 py-4 bg-emerald-600 text-white border-2 border-emerald-400 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <i className="fas fa-sync-alt mr-2"></i> Régénérer
                    </button>
                    <button onClick={handleValidateAndSave} className="px-6 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-green-700 active:scale-95 shadow-lg shadow-green-100">
                      Valider Dossier
                    </button>
                    <button onClick={() => exportDoc('pdf')} className="px-6 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 text-slate-700 active:scale-95">
                      PDF
                    </button>
                  </div>
                </div>
                <div className="relative p-12 bg-white border border-slate-50 min-h-[850px] text-left">
                  <textarea 
                    className="w-full min-h-[800px] text-slate-900 font-serif leading-[2.2] outline-none resize-none text-lg"
                    value={generatedDoc}
                    onChange={e => setGeneratedDoc(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aid' && (project.validatedGrant || currentGrant) && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden text-left">
                <h2 className="text-4xl font-black mb-3">{(project.validatedGrant || currentGrant)?.title}</h2>
                <div className="mt-12 grid grid-cols-2 gap-10">
                  <div className="bg-white/5 p-8 rounded-3xl border border-white/10 text-green-400 text-3xl font-black">
                    {(project.validatedGrant || currentGrant)?.amount}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 text-left">
                  <h3 className="font-black text-slate-900 uppercase text-xs mb-6">Plan de Financement</h3>
                  <button onClick={downloadExcel} className="w-full py-5 bg-green-50 text-green-700 font-black text-[11px] uppercase rounded-2xl">Excel (.csv)</button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white border border-slate-800 text-left">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-10">État du Dossier</h3>
            <div className="space-y-8">
              <SidebarStatus label="Qualification" done={!!project.title && !!project.target} />
              <SidebarStatus label="Sources" done={(project.documents?.length || 0) > 0} />
              <SidebarStatus label="Détection" done={grants.length > 0} />
              <SidebarStatus label="Validé" done={!!project.validatedGrant} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SynthesisField: React.FC<{ label: string, value?: string, isEditing: boolean, onChange: (v: string) => void, isArea?: boolean, type?: string, isBudget?: boolean }> = ({ label, value, isEditing, onChange, isArea, type="text", isBudget }) => (
  <div className={`space-y-2 ${isArea ? 'col-span-full' : ''} text-left`}>
    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block mb-1">{label}</label>
    {isEditing ? (
      isArea ? (
        <textarea className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-200 text-sm outline-none" rows={isBudget ? 10 : 5} value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={value || ''} onChange={e => onChange(e.target.value)} />
      )
    ) : (
      <div className="p-6 rounded-3xl bg-slate-50/50 text-slate-900 font-bold text-sm whitespace-pre-wrap">{value || <span className="text-slate-300 italic">Analyse IA requise...</span>}</div>
    )}
  </div>
);

const TabBtn: React.FC<{ active: boolean, onClick: () => void, label: string, icon: string }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center justify-center px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-emerald-600 shadow-xl border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}>
    <i className={`fas ${icon} mr-4 ${active ? 'text-emerald-600' : 'text-slate-400'}`}></i> {label}
  </button>
);

const SidebarStatus: React.FC<{ label: string, done: boolean }> = ({ label, done }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center space-x-5">
      <div className={`w-3 h-3 rounded-full ${done ? 'bg-emerald-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}></div>
      <span className={`text-xs font-black ${done ? 'text-white' : 'text-slate-600'}`}>{label}</span>
    </div>
    {done && <i className="fas fa-check-circle text-emerald-500"></i>}
  </div>
);

export default ProjectDetail;
