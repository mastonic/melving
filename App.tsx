
import React, { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import ClientForm from './views/ClientForm';
import ProjectDetail from './views/ProjectDetail';
import LoginScreen from './views/LoginScreen';
import { UserRole } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard' | 'form' | 'project' | 'login'>('landing');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [user, setUser] = useState<UserRole | null>(null);

  // Vérification de session au chargement
  useEffect(() => {
    const savedUser = localStorage.getItem('fp_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = () => {
    const adminUser = { 
      isAdmin: true, 
      name: 'Concept-AI-972', 
      email: 'admin@fundingpilot.com' 
    };
    setUser(adminUser);
    localStorage.setItem('fp_user', JSON.stringify(adminUser));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fp_user');
    setView('landing');
  };

  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    setView('project');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div 
              className="flex items-center cursor-pointer group" 
              onClick={() => setView('landing')}
            >
              <div className="bg-blue-600 p-2.5 rounded-xl mr-3 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <i className="fas fa-paper-plane text-white text-lg"></i>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">FundingPilot</span>
                <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase mt-1">Expertise DOM-TOM</span>
              </div>
            </div>
            
            <div className="hidden md:flex space-x-10 items-center">
              <button 
                onClick={() => setView('landing')} 
                className={`text-sm font-bold tracking-tight transition-colors ${view === 'landing' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Accueil
              </button>
              
              {user ? (
                <>
                  <button onClick={() => setView('dashboard')} className={`text-sm font-bold tracking-tight transition-colors ${view === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>Pilotage</button>
                  <button onClick={() => setView('form')} className={`text-sm font-bold tracking-tight transition-colors ${view === 'form' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>Nouveau Dossier</button>
                  <div className="flex items-center space-x-4 pl-6 border-l border-slate-200">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-900">{user.name}</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase">Admin</span>
                    </div>
                    <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                      <i className="fas fa-sign-out-alt"></i>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <a href="#features" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Solutions</a>
                  <button 
                    onClick={() => setView('login')} 
                    className="bg-slate-900 text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center"
                  >
                    Accès Outils <i className="fas fa-lock ml-2 text-xs opacity-50"></i>
                  </button>
                </>
              )}
            </div>

            <div className="md:hidden">
               <button className="p-2 text-slate-600" onClick={() => user ? setView('dashboard') : setView('login')}>
                 <i className="fas fa-bars text-2xl"></i>
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Breadcrumbs (Beads) */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <button onClick={() => setView('landing')} className="hover:text-blue-600">Accueil</button>
          <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
          {view !== 'landing' && (
            <>
              <button 
                onClick={() => setView('dashboard')} 
                className={`hover:text-blue-600 ${view === 'dashboard' ? 'text-blue-600' : ''}`}
              >
                Pilotage
              </button>
              {view === 'project' && (
                <>
                  <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
                  <span className="text-slate-900">Dossier en cours</span>
                </>
              )}
              {view === 'form' && (
                <>
                  <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
                  <span className="text-slate-900">Nouveau Dossier</span>
                </>
              )}
              {view === 'login' && (
                <>
                  <i className="fas fa-chevron-right text-[8px] opacity-30"></i>
                  <span className="text-slate-900">Authentification</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow">
        {view === 'landing' && <LandingPage onStart={() => user ? setView('dashboard') : setView('login')} />}
        {view === 'login' && <LoginScreen onLoginSuccess={handleLoginSuccess} onCancel={() => setView('landing')} />}
        {view === 'dashboard' && <Dashboard onSelectProject={navigateToProject} onCreateNew={() => setView('form')} />}
        {view === 'form' && <ClientForm onSuccess={(projectId) => navigateToProject(projectId)} />}
        {view === 'project' && selectedProjectId && <ProjectDetail projectId={selectedProjectId} onBack={() => setView('dashboard')} />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-20 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 text-left">
            <div className="flex items-center mb-6">
               <div className="bg-blue-600 p-2 rounded-lg mr-3"><i className="fas fa-paper-plane text-white text-sm"></i></div>
               <span className="text-white font-black text-2xl tracking-tighter uppercase">FundingPilot</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              L'outil de référence pour les experts en financement public. Optimisé pour la France Métropolitaine, la Martinique, la Guadeloupe, la Guyane et la Réunion.
            </p>
            <div className="flex space-x-4 mt-8">
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center hover:bg-blue-600 transition-colors text-white">
                <i className="fab fa-twitter"></i>
              </a>
            </div>
          </div>
          <div className="text-left">
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Plateforme</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Veille Territoriale</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Générateur IA</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Tarification</a></li>
            </ul>
          </div>
          <div className="text-left">
            <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Guide Utilisateur</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Contact Expert</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <div>© {new Date().getFullYear()} FundingPilot. Réalisé par Concept-AI-972.</div>
          <div className="mt-4 md:mt-0 space-x-6">
            <a href="#" className="hover:text-slate-400">Mentions Légales</a>
            <a href="#" className="hover:text-slate-400">RGPD</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
