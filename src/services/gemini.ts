
import { GoogleGenAI, Type } from "@google/genai";
import { Client, Grant, Project, DocumentFile } from "../types";

// Helper to get a fresh instance of Gemini API client
const getAI = () => {
  const key = (
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (process.env as any).API_KEY || 
    (window as any).GEMINI_API_KEY || 
    localStorage.getItem('GEMINI_API_KEY') || 
    ""
  ).trim();

  if (!key || key === "undefined") {
    throw new Error("apikey_missing");
  }
  
  return new GoogleGenAI({ apiKey: key });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('quota') || error?.status === 429;
    if (isQuotaError && retries > 0) {
      await delay(initialDelay);
      return withRetry(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

export const geminiService = {
  async analyzeDocument(documents: DocumentFile[]): Promise<Partial<Project>> {
    const ai = getAI();
    
    // On regroupe tous les contenus textuels
    const corpus = documents
      .map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.content}`)
      .join("\n\n")
      .substring(0, 30000);

    const prompt = `Tu es un expert en ingénierie de financement public. Analyse ce corpus de documents et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    Format JSON uniquement. Soyez précis.
    
    DOCUMENTS :
    ${corpus}`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
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
        let text = response.text || "{}";
        return JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse", e);
        return {};
      }
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
    const ai = getAI();
    const prompt = `Trouve des aides réelles pour : ${client.name} (${client.region}).
    Secteur: ${client.sector}. Projet: ${project.title}.
    Budget estimé: ${project.financingPlan}.
    Retourne une liste de dispositifs financiers (FEDER, ADEME, Région). FORMAT JSON ARRAY.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
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
      return JSON.parse(response.text || "[]");
    });
  },

  async generateDocument(client: Client, project: Project, grant: Grant, docType: string): Promise<string> {
    const ai = getAI();
    const prompt = `Rédige une ${docType} officielle prête à l'emploi.
    
    STRICT : Ne commence JAMAIS par "Voici..." ou "Voici la proposition...". Commence DIRECTEMENT par le contenu.
    
    INCLUSION DÉTAILS : Mentionne les dates du projet (Du ${project.startDate} au ${project.endDate}), le budget (${grant.amount}) et les objectifs techniques (${project.objectives}).
    
    DONNÉES :
    - Client : ${client.name}
    - Projet : ${project.title}
    - Contexte : ${project.context}
    - Aide : ${grant.title} de ${grant.provider}`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "models/gemini-1.5-flash",
        contents: prompt,
      });
      let text = response.text || "";
      // Nettoyage agressif du blabla d'introduction
      text = text.replace(/^[\s\S]*?(Objet\s*:|À\s+l'attention|Monsieur|Madame|Cher|Chère)/i, "$1").trim();
      return text;
    });
  }
};
