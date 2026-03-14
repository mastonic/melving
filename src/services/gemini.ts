
import { GoogleGenAI } from "@google/genai";
import { Client, Grant, Project, DocumentFile } from "../types";

const getAI = () => {
    const key = (
      (import.meta as any).env?.VITE_GEMINI_API_KEY || 
      (process.env as any).API_KEY || 
      (window as any).GEMINI_API_KEY || 
      localStorage.getItem('GEMINI_API_KEY') || 
      ""
    ).trim();
  
    if (!key || key === "undefined" || key === "null") {
      throw new Error("apikey_missing");
    }
    
    // Using v1beta as it often bypasses regional restrictions for MLDev accounts in EEA/Territories
    return new GoogleGenAI({ 
      apiKey: key,
      apiVersion: 'v1beta' 
    });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 5, initialDelay = 10000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.message?.includes('quota') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429;
      
    if (isQuotaError) {
      // If daily quota is hit, don't even try to retry
      if (error?.message?.includes('PerDay')) {
        throw new Error("quota_daily_exceeded");
      }
      
      if (retries > 0) {
        console.warn(`Flux saturé. Nouvelle tentative dans ${initialDelay/1000}s... (${retries} essais restants)`);
        await delay(initialDelay);
        return withRetry(fn, retries - 1, initialDelay + 10000);
      }
    }
    throw error;
  }
}

// Using the most resilient frontier model (1.5 Pro) for analytical precision
const MODEL_NAME = "gemini-1.5-pro";

const extractJSON = (text: string) => {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Fallback: extract JSON from markdown or text
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON", e2);
        return null;
      }
    }
    return null;
  }
};

export const geminiService = {
  async analyzeDocument(input: DocumentFile[] | string): Promise<Partial<Project>> {
    const ai = getAI();
    let corpus = typeof input === 'string' 
      ? input 
      : input.map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.content}`).join("\n\n");
    
    corpus = corpus.substring(0, 30000);

    const prompt = `Tu es un expert en ingénierie de financement public pour SUB'ÉCO IMPACT. 
    Analyse ce corpus de documents et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    
    RETOURNE EXCLUSIVEMENT UN OBJET JSON avec ces clés : 
    title, theme, context, projectType, startDate, endDate, duration, target, objectives, expectedResults, location, financingPlan.
    
    DOCUMENTS :
    ${corpus}`;

    return withRetry(async () => {
      // Removing config fields that cause 400 errors and relying on prompt + extraction
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      
      const result = extractJSON(response.text || "{}");
      return result || {};
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
    const ai = getAI();
    const prompt = `Tu es l'expert de SUB'ÉCO IMPACT. Trouve des aides réelles pour : ${client.name} (${client.region}).
    Secteur: ${client.sector}. Projet: ${project.title}.
    Budget estimé: ${project.financingPlan}.
    
    RETOURNE EXCLUSIVEMENT UN ARRAY JSON d'objets avec : id, title, provider, amount, description.
    Ne rajoute aucun texte avant ou après.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      const result = extractJSON(response.text || "[]");
      return Array.isArray(result) ? result : [];
    });
  },

  async generateDocument(client: Client, project: Project, grant: Grant, docType: string): Promise<string> {
    const ai = getAI();
    const prompt = `Rédige une ${docType} officielle pour SUB'ÉCO IMPACT, prête à l'emploi.
    
    STRICT : Ne commence JAMAIS par "Voici..." ou "Voici la proposition...". Commence DIRECTEMENT par le contenu.
    
    INCLUSION DÉTAILS : Mentionne les dates du projet (Du ${project.startDate} au ${project.endDate}), le budget (${grant.amount}) et les objectifs techniques (${project.objectives}).
    
    DONNÉES :
    - Client : ${client.name}
    - Projet : ${project.title}
    - Contexte : ${project.context}
    - Aide : ${grant.title} de ${grant.provider}`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      let text = response.text || "";
      text = text.replace(/^[\s\S]*?(Objet\s*:|À\s+l'attention|Monsieur|Madame|Cher|Chère)/i, "$1").trim();
      return text;
    });
  }
};
