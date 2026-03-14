
import { GoogleGenAI, Type } from "@google/genai";
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
    
    // Switch to v1beta which often has better support for some features in the new SDK
    return new GoogleGenAI({ 
      apiKey: key,
      apiVersion: 'v1beta' 
    });
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

// Using gemini-1.5-flash which is most stable across versions
const MODEL_NAME = "gemini-1.5-flash";

export const geminiService = {
  async analyzeDocument(input: DocumentFile[] | string): Promise<Partial<Project>> {
    const ai = getAI();
    let corpus = typeof input === 'string' 
      ? input 
      : input.map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.content}`).join("\n\n");
    
    corpus = corpus.substring(0, 30000);

    const prompt = `Tu es un expert en ingénierie de financement public pour SUB'ÉCO IMPACT. Analyse ce corpus de documents et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    Format JSON uniquement. Soyez précis.
    
    DOCUMENTS :
    ${corpus}`;

    return withRetry(async () => {
      // Trying the most compatible call structure
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          // Fallback schema if natively supported, otherwise we rely on prompt
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
      
      const text = response.text || "{}";
      try {
        return JSON.parse(text);
      } catch (e) {
        // Fallback: extract JSON if buried in Markdown
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      }
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
    const ai = getAI();
    const prompt = `Tu es l'expert de SUB'ÉCO IMPACT. Trouve des aides réelles pour : ${client.name} (${client.region}).
    Secteur: ${client.sector}. Projet: ${project.title}.
    Budget estimé: ${project.financingPlan}.
    Retourne une liste de dispositifs financiers (FEDER, ADEME, Région, aides à la transition écologique). FORMAT JSON ARRAY.`;

    return withRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
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
      const text = response.text || "[]";
      try {
        return JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      }
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
