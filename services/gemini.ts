
import { GoogleGenAI, Type } from "@google/genai";
import { Client, Grant, Project, DocumentFile } from "../types";

// Helper to get a fresh instance of Gemini API client
const getAI = () => {
  const key = (process.env.API_KEY || (window as any).GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || "").trim();
  if (!key || key === "undefined") {
    console.error("API Key Gemini manquante !");
  }
  // Pour @google/genai, on passe un objet d'options
  return new GoogleGenAI({ apiKey: key });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction utilitaire pour gérer les retries en cas de quota atteint (Error 429)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = (error?.message || "").toLowerCase();
    const isQuotaError = errorStr.includes('quota') || error?.status === 429 || errorStr.includes('429');
    if (isQuotaError && retries > 0) {
      console.warn(`Quota atteint. Nouvelle tentative dans ${initialDelay}ms... (${retries} essais restants)`);
      await delay(initialDelay);
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export const geminiService = {
  async analyzeDocument(documents: DocumentFile[]): Promise<Partial<Project>> {
    console.log("Démarrage de l'analyse IA multimodal sur", documents.length, "documents");
    const ai = getAI();
    
    const prompt = `Tu es un expert en ingénierie de financement public. Analyse les documents fournis (textes, PDF, etc.) et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    SOIS EXHAUSTIF ET PRÉCIS. Si une information n'est pas explicitement écrite, déduis-la logiquement du contexte (ex: si c'est un schéma directeur sur 3 ans, la durée est 36 mois).
    
    Champs à extraire (Format JSON uniquement, ne réponds rien d'autre) :
    - title: Nom du projet (court et percutant)
    - theme: Thématique (ex: Numérique, Transition Éco, Industrie du futur, Mobilité Durable)
    - context: Contexte opérationnel détaillé (Besoins, historique, enjeux stratégiques, minimum 3 phrases)
    - projectType: Type de projet détaillé (ex: Étude stratégique, Investissement matériel, R&D collaborative)
    - startDate: Date de début estimée (YYYY-MM-DD)
    - endDate: Date de fin estimée (YYYY-MM-DD)
    - duration: Durée totale (ex: 36 mois)
    - target: Objectif principal (l'impact final souhaité)
    - objectives: Détails techniques et opérationnels des objectifs (liste à puces ou phrases structurées)
    - expectedResults: Résultats quantitatifs et qualitatifs attendus (ex: -20% de CO2, 500 usagers/jour)
    - location: Situation géographique précise (Département, Commune, Région)
    - financingPlan: Plan de financement résumé (Budget total HT, subvention sollicitée, fonds propres)
    
    Réponds uniquement au format JSON valide.`;

    const parts: any[] = [{ text: prompt }];
    documents.forEach(doc => {
      if (doc.type === 'text/plain' || doc.name.endsWith('.txt')) {
        parts.push({ text: `CONTENU DU FICHIER ${doc.name} :\n${doc.content}` });
      } else if (doc.type === 'application/pdf' || doc.name.endsWith('.pdf')) {
        const base64Data = doc.content.includes(',') ? doc.content.split(',')[1] : doc.content;
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf"
          }
        });
      }
    });

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          // On évite responseSchema temporairement car il peut être trop restrictif avec required
          // et causer des réponses vides si l'IA ne trouve pas tout.
        }
      });

      try {
        let textValue = response.text || "";
        // On nettoie le texte au cas où (markdown tags)
        textValue = textValue.replace(/```json/g, "").replace(/```/g, "").trim();
        
        if (!textValue) {
          console.warn("Réponse vide de Gemini");
          return {};
        }

        const parsed = JSON.parse(textValue);
        console.log("Analyse réussie :", parsed);
        return parsed;
      } catch (e) {
        console.error("Échec du parsing de la réponse Gemini. Texte reçu:", response.text);
        return {};
      }
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
    console.log("Démarrage de la détection d'aides pour", project.title);
    const ai = getAI();

    const prompt = `Trouve des aides réelles et actuelles pour : ${client.name} situé en ${client.region}.
    Secteur: ${client.sector}, Taille: ${client.size}.
    Projet: ${project.title}. Thématique: ${project.theme}.
    Lieu exact: ${project.location}. 
    Budget estimé: ${project.financingPlan}.
    Retourne une liste de 3 à 5 dispositifs financiers (FEDER, Bpifrance, ADEME, aides territoriales de la région ${client.region}).
    Réponds au format JSON array.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      try {
        let textValue = response.text || "[]";
        textValue = textValue.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(textValue);
      } catch (e) {
        console.error("Échec du parsing de la détection d'aides", e);
        return [];
      }
    });
  },

  async generateDocument(client: Client, project: Project, grant: Grant, docType: string): Promise<string> {
    console.log("Génération de document avec les données :", { project, grant });
    const ai = getAI();
    const prompt = `Rédige une ${docType} officielle de haute qualité, EXTRÊMEMENT DÉTAILLÉE et PERSONNALISÉE pour solliciter l'aide "${grant.title}" auprès de ${grant.provider}.
    
    CONSIGNES CRITIQUES :
    1. TU DOIS UTILISER LES DONNÉES CI-DESSOUS POUR CHAQUE PARAGRAPHE. Ne fais pas un modèle vide.
    2. Intègre les termes techniques, les dates et les montants financiers fournis.
    3. Le ton doit être expert, convaincant et formel.
    4. Structure : Objet, Contexte, Objectifs techniques, Impact attendu, Plan de financement, Conclusion.

    DONNÉES À INTÉGRER IMPÉRATIVEMENT :
    - Entreprise porteuse : ${client.name} (Région: ${client.region}, Secteur: ${client.sector})
    - Intitulé du Projet : ${project.title}
    - Contexte opérationnel : ${project.context || "À détailler selon le projet"}
    - Type de projet : ${project.projectType || "Non spécifié"}
    - Objectif global : ${project.target || "Non spécifié"}
    - Détails techniques des objectifs : ${project.objectives || "Non spécifié"}
    - Résultats attendus : ${project.expectedResults || "Non spécifié"}
    - Localisation de l'opération : ${project.location || "Non spécifié"}
    - Calendrier d'exécution : Du ${project.startDate || "en attente"} au ${project.endDate || "en attente"} (Durée: ${project.duration || "Non spécifiée"})
    - Plan de financement : ${project.financingPlan || "Budget disponible dans le plan détaillé"}
    
    Rédige la lettre complète prête à être signée.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      return response.text || "Erreur lors de la génération du document.";
    });
  }
};
