
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Project, Client, ProjectStatus } from '../types';

interface DashboardProps {
  onSelectProject: (id: string) => void;
  onCreateNew?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectProject, onCreateNew }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [showToolModal, setShowToolModal] = useState<string | null>(null);

  useEffect(() => {
    setProjects(storage.getProjects().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setClients(storage.getClients());
  }, []);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Client inconnu';

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status !== ProjectStatus.APPROVED && p.status !== ProjectStatus.REJECTED).length,
    approved: projects.filter(p => p.status === ProjectStatus.APPROVED).length,
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(filter.toLowerCase()) || 
    getClientName(p.clientId).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Espace Pilotage</h1>
          <p className="text-slate-500 font-medium">Centrale de commandement de vos dossiers de financement.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group hidden sm:block">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-emerald-500 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-64 shadow-sm transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button 
            onClick={onCreateNew}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center shrink-0"
          >
            <i className="fas fa-plus mr-2"></i> Nouveau Dossier
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard label="Dossiers Totaux" value={stats.total} icon="fa-folder-tree" color="blue" />
        <StatCard label="En Préparation" value={stats.active} icon="fa-clock-rotate-left" color="orange" />
        <StatCard label="Succès" value={stats.approved} icon="fa-trophy" color="green" />
      </div>

      {/* Main Grid: Projects & Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 tracking-tight flex items-center">
                <i className="fas fa-list-ul mr-3 text-emerald-600"></i> Dossiers en cours
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {filteredProjects.length} Projets
              </span>
            </div>
            
            {filteredProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="px-8 py-4">Projet / Client</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4">Activité</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map(project => (
                      <tr key={project.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">{project.title}</div>
                          <div className="text-xs text-slate-500 flex items-center font-medium">
                            <span className="w-2 h-2 rounded-full bg-slate-300 mr-2"></span> {getClientName(project.clientId)}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-slate-600 font-bold">{new Date(project.updatedAt).toLocaleDateString('fr-FR')}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Dernière modif.</div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => onSelectProject(project.id)}
                            className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                          >
                            Détails <i className="fas fa-arrow-right ml-2 opacity-30"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-24 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                   <i className="fas fa-folder-open text-4xl"></i>
                 </div>
                 <h4 className="text-slate-900 font-bold mb-1">Aucun dossier actif</h4>
                 <p className="text-slate-500 text-sm mb-6">Commencez par créer votre premier dossier client.</p>
                 <button onClick={onCreateNew} className="text-emerald-600 text-sm font-black hover:underline uppercase tracking-widest">
                   Créer maintenant
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-bold mb-4 flex items-center text-sm uppercase tracking-widest">
                <i className="fas fa-screwdriver-wrench mr-3 text-emerald-400"></i> Accès Outils IA
              </h3>
              <div className="space-y-2">
                <QuickToolButton 
                  icon="fa-magnifying-glass-chart" 
                  label="Veille Intelligente" 
                  onClick={() => setShowToolModal("Veille")}
                />
                <QuickToolButton 
                  icon="fa-file-signature" 
                  label="Modèles PDF" 
                  onClick={() => setShowToolModal("Modèles")}
                />
                <QuickToolButton 
                  icon="fa-calculator" 
                  label="Calcul Budget" 
                  onClick={() => setShowToolModal("Budget")}
                />
                <button 
                  onClick={onCreateNew}
                  className="w-full mt-4 flex items-center p-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600 transition-all text-left group"
                >
                  <i className="fas fa-magic w-8 text-emerald-400 text-sm group-hover:text-white"></i>
                  <span className="text-xs font-bold text-blue-300 group-hover:text-white">Dossier via Prompt</span>
                </button>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 text-white/5 text-8xl group-hover:rotate-12 transition-transform">
              <i className="fas fa-robot"></i>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
            <h4 className="text-blue-900 font-bold text-sm mb-3 flex items-center">
              <i className="fas fa-lightbulb mr-2 text-emerald-500"></i> Note IA
            </h4>
            <p className="text-emerald-700 text-xs leading-relaxed font-medium">
              "3 nouveaux programmes détectés en Martinique. Optimisez vos dossiers avec l'assistant de rédaction."
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Modal for Tools */}
      {showToolModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-2xl w-full animate-in zoom-in-95 my-8">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Outil: {showToolModal}</h3>
                <button onClick={() => setShowToolModal(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            
            {showToolModal === 'Veille' && (
                <div className="space-y-6 text-left">
                    <p className="text-slate-500 font-medium text-sm">Scanner les programmes de financement actifs en temps réel.</p>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Ex: Transition écologique Martinique..." className="flex-grow px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500" />
                        <button className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold text-sm">Scanner</button>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-start gap-4">
                        <i className="fas fa-satellite-dish text-emerald-500 mt-1"></i>
                        <div>
                            <div className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-1">Dernière Détection</div>
                            <p className="text-emerald-700 text-sm">3 nouvelles aides ADEME disponibles pour les TPE en Guadeloupe.</p>
                        </div>
                    </div>
                </div>
            )}

            {showToolModal === 'Modèles' && (
                <div className="space-y-4 text-left">
                    <p className="text-slate-500 font-medium text-sm">Gérez et téléchargez vos modèles de documents officiels.</p>
                    <div className="grid grid-cols-1 gap-3">
                        {['Note d\'Intention', 'Dossier Technique', 'Plan de Financement', 'Tableau de Bord'].map(m => (
                            <div key={m} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-emerald-50 transition-colors cursor-pointer">
                                <span className="font-bold text-slate-700">{m}</span>
                                <i className="fas fa-download text-slate-300 group-hover:text-emerald-500"></i>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showToolModal === 'Budget' && (
                <div className="space-y-6 text-left">
                    <p className="text-slate-500 font-medium text-sm">Calculateur rapide de subvention selon les taux en vigueur.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Coût Total HT</label>
                            <input type="number" placeholder="50000" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400">Taux de Subvention (%)</label>
                            <input type="number" placeholder="50" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-center">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Aide Prévisionnelle</div>
                        <div className="text-3xl font-black text-white">25 000,00 €</div>
                    </div>
                </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100 italic text-[10px] text-slate-400 text-center uppercase tracking-widest font-black">
                Propulsé par SUB'ÉCO IMPACT IA
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuickToolButton: React.FC<{ icon: string, label: string, onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
  >
    <i className={`fas ${icon} w-8 text-emerald-400 text-sm`}></i>
    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: string, color: string }> = ({ label, value, icon, color }) => {
  const colorClasses: any = {
    blue: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-50',
    green: 'bg-green-50 text-green-600 border-green-100 shadow-green-50',
  };
  return (
    <div className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center group hover:scale-[1.02] transition-transform cursor-default`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mr-5 shadow-inner transition-transform group-hover:rotate-6 ${colorClasses[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const styles: any = {
    [ProjectStatus.QUALIFICATION]: 'bg-slate-100 text-slate-600',
    [ProjectStatus.DISCOVERY]: 'bg-emerald-100 text-emerald-600',
    [ProjectStatus.PREPARATION]: 'bg-orange-100 text-orange-600',
    [ProjectStatus.SUBMITTED]: 'bg-purple-100 text-purple-600',
    [ProjectStatus.APPROVED]: 'bg-green-100 text-green-600',
    [ProjectStatus.REJECTED]: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${styles[status]}`}>
      {status}
    </span>
  );
};

export default Dashboard;
