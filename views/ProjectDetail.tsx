
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { geminiService } from '../services/gemini';
import { Project, Client, Grant, ProjectStatus, DocumentFile } from '../types';

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !project) return;

    setLoading(true);
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const newDoc: DocumentFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
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
      
      // On lit en texte si c'est du texte, sinon en DataURL pour PDF/PPT/Images
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    // Reset de l'input pour permettre de re-sélectionner le même fichier si besoin
    e.target.value = '';
    setTimeout(() => setLoading(false), 800);
  };

  const handleRegenerateFromDocs = async () => {
    console.log("Clic sur Scanner les documents...");
    if (!project || !project.documents || project.documents.length === 0) {
      alert("Aucun document trouvé. Veuillez charger des fichiers (TXT, PDF ou PPT) pour permettre l'analyse.");
      return;
    }
    
    // On force l'affichage de l'animation avant de lancer l'appel API
    setIsAnalyzing(true);
    console.log("Animation d'analyse activée");
    
    // On laisse un court délai pour que le DOM se mette à jour et affiche l'overlay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      console.log("Appel au service Gemini pour analyse...");
      // Appel au service avec tous les documents (multimodal)
      const extracted = await geminiService.analyzeDocument(project.documents);
      console.log("Données extraites reçues :", extracted);
      
      const updatedProject = { 
        ...project, 
        ...extracted, 
        updatedAt: new Date().toISOString() 
      };

      setProject(updatedProject);
      storage.saveProject(updatedProject);

      if (currentGrant && client) {
        console.log("Régénération de la lettre d'intention...");
        const newLetter = await geminiService.generateDocument(client, updatedProject, currentGrant, "Lettre d'Intention");
        setGeneratedDoc(newLetter);
      }

      // On maintient l'animation un peu pour que l'utilisateur voie qu'il se passe quelque chose
      setTimeout(() => {
        setIsAnalyzing(false);
        setActiveTab('synthesis');
        console.log("Analyse terminée avec succès");
      }, 2000);

    } catch (error: any) {
      console.error("Erreur d'analyse détaillée :", error);
      setIsAnalyzing(false);
      
      if (error?.message?.includes('quota') || error?.status === 429) {
        alert("Quota de l'API Gemini atteint. Veuillez patienter une minute avant de réessayer.");
      } else {
        alert("Une erreur est survenue lors de l'analyse : " + (error?.message || "Erreur inconnue"));
      }
    }
  };

  const handleValidateAndSave = () => {
    if (!generatedDoc || !project || !currentGrant) return;
    
    const newDoc: DocumentFile = {
      id: crypto.randomUUID(),
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

  if (!project || !client) return <div className="p-20 text-center font-bold">Chargement du projet...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 relative">
      
      {/* OVERLAY ANIMATION IA - ANALYSE EN COURS */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full text-center shadow-[0_0_100px_rgba(59,130,246,0.4)] animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
              <div className="h-full bg-blue-600 animate-[progress_2.5s_ease-in-out_infinite]"></div>
            </div>
            
            <div className="relative w-32 h-32 mx-auto mb-10">
              <div className="absolute inset-0 border-8 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-600 text-5xl">
                <i className="fas fa-brain animate-pulse"></i>
              </div>
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Analyse Cognitive en cours</h3>
            <p className="text-slate-500 font-bold leading-relaxed text-lg mb-8">
              Extraction des données stratégiques et structuration de votre dossier à partir des documents...
            </p>
            
            <div className="flex justify-center items-center space-x-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">
              <span className="animate-pulse">Traitement neuronal</span>
              <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
              <span className="animate-pulse delay-150">Lecture sémantique</span>
            </div>

            <style>{`
              @keyframes progress {
                0% { width: 0%; left: 0%; }
                50% { width: 100%; left: 0%; }
                100% { width: 0%; left: 100%; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-6 w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm active:scale-90">
            <i className="fas fa-chevron-left text-slate-900"></i>
          </button>
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.title}</h1>
            <p className="text-blue-600 font-bold text-[11px] uppercase tracking-widest mt-1">{client.name} • {client.region}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <button onClick={saveProjectData} className="bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-green-100 flex items-center hover:bg-green-700 transition-all active:scale-95">
              <i className="fas fa-check mr-2"></i> Enregistrer les modifications
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-lg shadow-slate-200 flex items-center hover:bg-blue-600 transition-all active:scale-95">
              <i className="fas fa-pen mr-2"></i> Éditer la synthèse
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 p-1.5 bg-slate-200/60 rounded-[1.25rem] mb-10 max-w-5xl overflow-x-auto whitespace-nowrap">
        <TabBtn active={activeTab === 'synthesis'} onClick={() => setActiveTab('synthesis')} label="Synthèse Projet" icon="fa-file-lines" />
        <TabBtn active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} label="Documents Client" icon="fa-folder-open" />
        <TabBtn active={activeTab === 'funding'} onClick={() => setActiveTab('funding')} label="Détection Aides" icon="fa-search-dollar" />
        {generatedDoc && <TabBtn active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} label="Éditeur Final" icon="fa-pen-nib" />}
        {(project.validatedGrant || currentGrant) && <TabBtn active={activeTab === 'aid'} onClick={() => setActiveTab('aid')} label="Aide Validée" icon="fa-hand-holding-dollar" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          
          {/* SYNTHESIS TAB - FULL FIELDS + LETTER OF INTENT INTEGRATION */}
          {activeTab === 'synthesis' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10 animate-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <SynthesisField label="Nom du Projet" value={project.title} isEditing={isEditing} onChange={v => setProject({...project, title: v})} />
                <SynthesisField label="Thématique" value={project.theme} isEditing={isEditing} onChange={v => setProject({...project, theme: v})} />
                <SynthesisField label="Type de Projet" value={project.projectType} isEditing={isEditing} onChange={v => setProject({...project, projectType: v})} />
                <SynthesisField label="Durée Prévue" value={project.duration} isEditing={isEditing} onChange={v => setProject({...project, duration: v})} />
                <SynthesisField label="Date de Commencement" type="date" value={project.startDate} isEditing={isEditing} onChange={v => setProject({...project, startDate: v})} />
                <SynthesisField label="Date d'Achèvement" type="date" value={project.endDate} isEditing={isEditing} onChange={v => setProject({...project, endDate: v})} />
                <SynthesisField label="Situation Géographique" value={project.location} isEditing={isEditing} onChange={v => setProject({...project, location: v})} />
                <SynthesisField label="Objectif du Projet" value={project.target} isEditing={isEditing} onChange={v => setProject({...project, target: v})} />
              </div>
              <div className="space-y-10 pt-10 border-t border-slate-100">
                <SynthesisField isArea label="Contexte opérationnel" value={project.context} isEditing={isEditing} onChange={v => setProject({...project, context: v})} />
                <SynthesisField isArea label="Objectif et Résultats" value={project.objectives} isEditing={isEditing} onChange={v => setProject({...project, objectives: v})} />
                <SynthesisField isArea isBudget label="Plan Financier (Détails)" value={project.financingPlan} isEditing={isEditing} onChange={v => setProject({...project, financingPlan: v})} />
              </div>

              {/* SECTION LETTRE D'INTENTION DANS LA SYNTHÈSE */}
              {generatedDoc && (
                <div className="mt-12 pt-12 border-t-2 border-dashed border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-lg shadow-blue-100">
                      <i className="fas fa-file-signature"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Lettre d'Intention du Dossier</h3>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Automatisée par Intelligence Artificielle</p>
                    </div>
                  </div>
                  <div className="p-10 rounded-[2.5rem] bg-slate-900 text-slate-300 font-serif leading-relaxed text-base whitespace-pre-wrap border border-slate-800 shadow-2xl relative group">
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setActiveTab('editor')} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white backdrop-blur-md">
                        Modifier dans l'éditeur
                      </button>
                    </div>
                    {generatedDoc}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Pièces du dossier</h3>
                <button 
                  onClick={handleRegenerateFromDocs}
                  disabled={isAnalyzing}
                  className={`bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:shadow-2xl transition-all flex items-center active:scale-95 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'shadow-xl shadow-blue-100'}`}
                >
                  {isAnalyzing ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-magic mr-3"></i>}
                  Scanner les documents téléchargés
                </button>
              </div>

              <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-16 text-center relative group hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer">
                <input 
                  type="file" 
                  multiple 
                  accept=".txt,.pdf,.ppt,.pptx"
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                />
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner relative z-10">
                  <i className="fas fa-cloud-upload-alt text-3xl"></i>
                </div>
                <h3 className="text-slate-900 font-black text-lg mb-2 tracking-tight relative z-10">Ajouter des pièces justificatives</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest relative z-10">Formats supportés : TXT, PDF, PPT</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.documents?.map(doc => (
                  <div 
                    key={doc.id} 
                    onMouseEnter={() => setHoveredDoc(doc.id)}
                    onMouseLeave={() => setHoveredDoc(null)}
                    className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between group hover:shadow-2xl hover:border-blue-300 transition-all relative overflow-visible"
                  >
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <i className={`fas ${
                          doc.name.endsWith('.pdf') ? 'fa-file-pdf text-xl text-red-400' : 
                          doc.name.endsWith('.ppt') || doc.name.endsWith('.pptx') ? 'fa-file-powerpoint text-xl text-orange-400' :
                          doc.type.includes('text') || doc.name.endsWith('.txt') ? 'fa-file-lines text-xl' : 
                          'fa-file-image text-xl'
                        } group-hover:text-white`}></i>
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="text-sm font-black text-slate-900 truncate max-w-[180px]">{doc.name}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(doc.uploadDate).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    
                    {hoveredDoc === doc.id && (
                      <div className="absolute z-[70] bottom-full left-0 mb-4 w-72 bg-slate-900 text-white p-6 rounded-[2rem] text-[11px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 pointer-events-none border border-white/10 backdrop-blur-md">
                        <div className="font-black border-b border-white/10 pb-3 mb-3 uppercase text-blue-400 flex items-center tracking-widest">
                          <i className="fas fa-eye mr-2"></i> Aperçu rapide
                        </div>
                        <div className="line-clamp-6 italic text-slate-300 font-medium leading-relaxed">
                          {doc.type.includes('text') || doc.name.endsWith('.txt') 
                            ? (doc.content.substring(0, 400) || "Contenu texte vide.")
                            : "Aperçu masqué pour les données binaires."}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AID TAB */}
          {activeTab === 'aid' && (project.validatedGrant || currentGrant) && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10">
                  <span className="text-blue-400 font-black text-[11px] uppercase tracking-[0.3em] mb-6 block">Succès du Dossier</span>
                  <h2 className="text-4xl font-black mb-3 tracking-tighter">{(project.validatedGrant || currentGrant)?.title}</h2>
                  <p className="text-slate-400 font-bold text-lg">{(project.validatedGrant || currentGrant)?.provider}</p>
                  
                  <div className="mt-12 grid grid-cols-2 gap-10">
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
                      <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Montant Subventionné</div>
                      <div className="text-3xl font-black text-green-400">{(project.validatedGrant || currentGrant)?.amount}</div>
                    </div>
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
                      <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Identifiant Projet</div>
                      <div className="text-sm font-bold text-white truncate">{project.title}</div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-12 opacity-5 text-[15rem] -mr-10 -mt-10">
                  <i className="fas fa-trophy"></i>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 flex items-center">
                    <i className="fas fa-file-excel mr-4 text-green-600 text-xl"></i> Plan de Financement
                  </h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">Récupérez le simulateur de budget Excel pré-rempli pour votre dépôt de dossier administratif final.</p>
                  <button onClick={downloadExcel} className="w-full py-5 bg-green-50 text-green-700 font-black text-[11px] uppercase rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95">
                    Télécharger Excel (.csv)
                  </button>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all text-left">
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 flex items-center">
                    <i className="fas fa-chart-line mr-4 text-blue-600 text-xl"></i> Bilan Financier
                  </h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">Outil de pilotage post-obtention pour suivre les dépenses éligibles et les rapports de mission.</p>
                  <button className="w-full py-5 bg-blue-50 text-blue-700 font-black text-[11px] uppercase rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                    Lancer le bilan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'editor' && generatedDoc && (
            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="p-12">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-10 pb-8 border-b border-slate-100 gap-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-xl shadow-blue-100"><i className="fas fa-file-signature text-lg"></i></div>
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Éditeur de Lettre</h3>
                  </div>
                  <div className="flex space-x-3">
                    <button onClick={handleValidateAndSave} className="px-6 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95">
                      <i className="fas fa-check-double mr-2"></i> Valider Dossier
                    </button>
                    <button onClick={() => exportDoc('docx')} className="px-6 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all text-slate-700 active:scale-95">
                      WORD
                    </button>
                    <button onClick={() => exportDoc('pdf')} className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all active:scale-95">
                      PDF
                    </button>
                  </div>
                </div>
                <div className="relative p-12 bg-white border border-slate-50 rounded-[2.5rem] min-h-[850px] shadow-inner text-left">
                  <textarea 
                    className="w-full min-h-[800px] text-slate-900 font-serif leading-[2.2] outline-none resize-none bg-white text-lg"
                    value={generatedDoc}
                    onChange={e => setGeneratedDoc(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* FUNDING TAB */}
          {activeTab === 'funding' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="bg-blue-600 p-12 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border border-blue-500">
                <div className="text-left">
                  <h3 className="text-3xl font-black tracking-tight"><i className="fas fa-robot mr-4 text-cyan-300"></i> Veille IA Territoriale</h3>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] mt-2">Algorithme optimisé pour les financements DOM-TOM</p>
                </div>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await geminiService.detectFunding(client, project);
                      setGrants(res);
                    } catch (e: any) {
                      console.error("Erreur détection:", e);
                      alert("Impossible de lancer la détection : " + (e?.message || "Erreur serveur"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-white text-blue-600 px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95"
                >
                  {loading ? <i className="fas fa-circle-notch fa-spin mr-3"></i> : <i className="fas fa-sync-alt mr-3"></i>}
                  Lancer la détection
                </button>
              </div>
              
              <div className="grid gap-6">
                {grants.length > 0 ? grants.map((grant, idx) => (
                  <div key={idx} className="bg-white p-10 rounded-[3rem] border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 hover:border-blue-500 transition-all group text-left shadow-sm hover:shadow-2xl">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 text-xl group-hover:text-blue-600 transition-colors tracking-tight">{grant.title}</h4>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full uppercase tracking-widest">{grant.provider}</span>
                        <span className="text-[10px] font-black bg-green-50 text-green-700 px-4 py-1.5 rounded-full uppercase tracking-widest">{grant.amount}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-6 leading-relaxed line-clamp-3 font-medium">{grant.description}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        setLoading(true);
                        setCurrentGrant(grant);
                        const doc = await geminiService.generateDocument(client, project, grant, "Lettre d'Intention");
                        setGeneratedDoc(doc);
                        setActiveTab('editor');
                        setLoading(false);
                      }}
                      className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 shrink-0"
                    >
                      Sélectionner l'Aide
                    </button>
                  </div>
                )) : (
                  <div className="py-24 text-center text-slate-400 font-black uppercase text-xs tracking-widest bg-slate-50 rounded-[3rem] border border-slate-100">
                    Activez la veille IA pour identifier les dispositifs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-10 flex items-center">
              <i className="fas fa-tasks mr-4"></i> État du Dossier
            </h3>
            <div className="space-y-8">
              <SidebarStatus label="Qualification Complète" done={!!project.title && !!project.target} />
              <SidebarStatus label="Documents Analysés" done={(project.documents?.length || 0) > 0} />
              <SidebarStatus label="Éligibilité Vérifiée" done={grants.length > 0} />
              <SidebarStatus label="Dossier Prêt au Dépôt" done={!!project.validatedGrant} />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-10 rounded-[3rem] text-center shadow-inner relative overflow-hidden group">
            <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <i className="fas fa-rocket text-xl"></i>
            </div>
            <h4 className="text-blue-900 font-black text-xs uppercase tracking-widest mb-3">Intelligence Pilotage</h4>
            <p className="text-blue-700 text-[11px] leading-relaxed font-semibold italic">
              "Le scanner de documents a identifié de nouveaux éléments stratégiques. Consultez votre synthèse mise à jour."
            </p>
            <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl">
              <i className="fas fa-brain"></i>
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
        <textarea 
          className={`w-full p-6 rounded-3xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all ${isBudget ? 'font-mono bg-blue-50/20 text-blue-900 border-blue-100' : 'bg-slate-50 text-slate-900'}`}
          rows={isBudget ? 10 : 5}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input 
          type={type}
          className="w-full px-6 py-4 rounded-2xl border border-slate-200 text-sm font-bold bg-slate-50 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )
    ) : (
      <div className={`p-6 rounded-3xl border border-slate-100 ${isBudget ? 'bg-slate-900 text-blue-400 font-mono text-[11px] leading-relaxed' : 'bg-slate-50/50 text-slate-900 font-bold text-sm'} whitespace-pre-wrap min-h-[56px] animate-in fade-in duration-500 shadow-sm`}>
        {value || <span className="text-slate-300 italic font-medium tracking-normal">Analyse IA requise...</span>}
      </div>
    )}
  </div>
);

const TabBtn: React.FC<{ active: boolean, onClick: () => void, label: string, icon: string }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center justify-center px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${active ? 'bg-white text-blue-600 shadow-2xl scale-105 z-10 border border-slate-100' : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'}`}>
    <i className={`fas ${icon} mr-4 text-sm ${active ? 'text-blue-600' : 'text-slate-400'}`}></i> {label}
  </button>
);

const SidebarStatus: React.FC<{ label: string, done: boolean }> = ({ label, done }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center space-x-5">
      <div className={`w-4 h-4 rounded-full transition-all duration-1000 ${done ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] scale-110' : 'bg-slate-800'}`}></div>
      <span className={`text-xs font-black tracking-tight ${done ? 'text-white' : 'text-slate-600 group-hover:text-slate-500'} transition-colors`}>{label}</span>
    </div>
    {done && <i className="fas fa-check-circle text-lg text-blue-500 animate-in zoom-in duration-500"></i>}
  </div>
);

export default ProjectDetail;
