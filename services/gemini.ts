
import { GoogleGenAI, Type } from "@google/genai";
import { Client, Grant, Project } from "../types";

// Helper to get a fresh instance of Gemini API client
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction utilitaire pour gérer les retries en cas de quota atteint (Error 429)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('quota') || error?.status === 429 || error?.message?.includes('429');
    if (isQuotaError && retries > 0) {
      console.warn(`Quota atteint. Nouvelle tentative dans ${initialDelay}ms... (${retries} essais restants)`);
      await delay(initialDelay);
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export const geminiService = {
  async analyzeDocument(docContent: string): Promise<Partial<Project>> {
    const ai = getAI();
    const prompt = `Tu es un expert en ingénierie de financement public. Analyse ce corpus de documents et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    Si une information est déjà présente mais imprécise, tente de la clarifier.
    Si une information est manquante, cherche-la activement dans le texte.
    
    Champs à extraire (Format JSON uniquement) :
    - title: Nom du projet
    - theme: Thématique (ex: Numérique, Transition Éco, Industrie du futur)
    - context: Contexte opérationnel (Besoins, historique, enjeux)
    - projectType: Type de projet (ex: Investissement productif, R&D, Recrutement)
    - startDate: Date de début estimée (YYYY-MM-DD)
    - endDate: Date de fin estimée (YYYY-MM-DD)
    - duration: Durée totale du projet (ex: 18 mois)
    - target: Objectif principal (ce que le projet vise à accomplir)
    - objectives: Détails techniques et opérationnels des objectifs
    - expectedResults: Résultats quantitatifs et qualitatifs attendus
    - location: Situation géographique précise (Département, Commune)
    - financingPlan: Plan de financement détaillé (Budget prévisionnel, postes de dépenses)
    
    CORPUS DE DOCUMENTS : 
    ${docContent.substring(0, 15000)}`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              theme: { type: Type.STRING },
              context: { type: Type.STRING },
              projectType: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              duration: { type: Type.STRING },
              target: { type: Type.STRING },
              objectives: { type: Type.STRING },
              expectedResults: { type: Type.STRING },
              location: { type: Type.STRING },
              financingPlan: { type: Type.STRING }
            }
          }
        }
      });

      try {
        return JSON.parse(response.text || "{}");
      } catch (e) {
        console.error("Failed to parse Gemini response", e);
        return {};
      }
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
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
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                provider: { type: Type.STRING },
                amount: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["id", "title", "provider", "amount", "description"]
            }
          }
        }
      });

      try {
        return JSON.parse(response.text || "[]");
      } catch (e) {
        console.error("Failed to parse funding detection results", e);
        return [];
      }
    });
  },

  async generateDocument(client: Client, project: Project, grant: Grant, docType: string): Promise<string> {
    const ai = getAI();
    const prompt = `Rédige une ${docType} officielle de haute qualité pour solliciter l'aide "${grant.title}" auprès de ${grant.provider}.
    Utilise les informations suivantes pour personnaliser le courrier :
    - Client : ${client.name} (${client.region})
    - Projet : ${project.title}
    - Contexte : ${project.context}
    - Objectif : ${project.target}
    - Détails : ${project.objectives}
    - Lieu : ${project.location}
    - Dates : Du ${project.startDate} au ${project.endDate}
    - Budget : ${project.financingPlan}
    
    Le ton doit être formel, convaincant et structuré.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response.text || "Erreur lors de la génération du document.";
    });
  }
};
