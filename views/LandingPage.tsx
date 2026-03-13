
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative bg-white pt-16 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-12 md:mb-0 z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-6">
              <span className="mr-2">NOUVEAU</span> IA de détection DOM-TOM activée
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              Sécurisez vos subventions <br/>
              <span className="text-blue-600 underline decoration-blue-200">en un temps record.</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
              De la détection des aides à la génération de votre dossier final, FundingPilot automatise les tâches complexes pour les consultants et les entreprises.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={onStart} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center">
                Lancer un diagnostic <i className="fas fa-arrow-right ml-2 text-sm"></i>
              </button>
              <button className="bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-slate-300 transition-all">
                Voir la démo
              </button>
            </div>
          </div>
          <div className="md:w-1/2 relative">
             <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
             <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
             <img 
               src="https://picsum.photos/seed/funding/800/600" 
               alt="Dashboard preview" 
               className="rounded-2xl shadow-2xl relative z-10 border border-slate-100"
             />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Un copilote complet pour vos dossiers</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour passer de l'idée au virement bancaire de la subvention.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon="fa-search-dollar" 
              title="Veille Contrôlée" 
              desc="Notre algorithme scanne les flux officiels (ADEME, Régions, Europe) pour détecter les aides pertinentes." 
            />
            <FeatureCard 
              icon="fa-file-invoice" 
              title="Documents Automatisés" 
              desc="Génération de notes de synthèse et lettres d'intention personnalisées grâce à notre IA spécialisée." 
            />
            <FeatureCard 
              icon="fa-tasks" 
              title="Suivi de Pipeline" 
              desc="Gérez plusieurs clients et projets simultanément avec une vue claire sur l'avancement de chaque dossier." 
            />
          </div>
        </div>
      </section>

      {/* DOM Focus Section */}
      <section className="py-24 bg-blue-600 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
           <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-6">Expertise Spécifique Antilles-Guyane</h2>
              <p className="text-blue-100 text-lg mb-8">
                Les aides en Outre-mer (FEDER, aides régionales spécifiques, détaxe) nécessitent une expertise locale. FundingPilot intègre ces spécificités pour Martinique, Guadeloupe et Guyane.
              </p>
              <ul className="space-y-4">
                 <li className="flex items-center"><i className="fas fa-check-circle mr-3 text-cyan-300"></i> Intégration des dispositifs locaux</li>
                 <li className="flex items-center"><i className="fas fa-check-circle mr-3 text-cyan-300"></i> Veille sur les sites territoriaux</li>
                 <li className="flex items-center"><i className="fas fa-check-circle mr-3 text-cyan-300"></i> Accompagnement sur mesure</li>
              </ul>
           </div>
           <div className="md:w-1/2 grid grid-cols-2 gap-4">
              <img src="https://picsum.photos/seed/mart/300/200" className="rounded-lg shadow-lg rotate-3" />
              <img src="https://picsum.photos/seed/guad/300/200" className="rounded-lg shadow-lg -rotate-2 mt-8" />
           </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-12 text-center text-white relative overflow-hidden shadow-2xl">
           <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-6">Prêt à accélérer vos financements ?</h2>
            <p className="text-slate-400 mb-10 text-lg">Rejoignez les consultants qui ont réduit leur temps administratif de 60%.</p>
            <button onClick={onStart} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all">
              Démarrer gratuitement
            </button>
           </div>
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <i className="fas fa-rocket text-9xl"></i>
           </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6">
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
