
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { Client, Grant, Project, DocumentFile } from "../types";

const getAIConfig = () => {
    const key = (
      (import.meta as any).env?.VITE_GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_OPENAI_API_KEY ||
      localStorage.getItem('GEMINI_API_KEY') || 
      localStorage.getItem('OPENAI_API_KEY') ||
      ""
    ).trim();
  
    if (!key || key === "undefined" || key === "null") {
      throw new Error("apikey_missing");
    }

    // Detect provider
    if (key.startsWith("sk-")) {
        return {
            provider: "openai" as const,
            openai: new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true }),
            model: "gpt-4o-mini"
        };
    }
    
    return {
        provider: "gemini" as const,
        gemini: new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' }),
        model: "gemini-1.5-flash-8b"
    };
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.message?.includes('quota') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429;
      
    if (isQuotaError) {
      if (error?.message?.includes('PerDay')) {
        throw new Error("quota_daily_exceeded");
      }
      
      if (retries > 0) {
        await delay(initialDelay);
        return withRetry(fn, retries - 1, initialDelay * 2);
      }
    }
    throw error;
  }
}

const extractJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
};

export const geminiService = {
  async analyzeDocument(input: DocumentFile[] | string): Promise<Partial<Project>> {
    const config = getAIConfig();
    let corpus = typeof input === 'string' 
      ? input 
      : input.map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.content}`).join("\n\n");
    
    corpus = corpus.substring(0, 50000);

    const prompt = `Tu es un expert en ingénierie de financement public pour SUB'ÉCO IMPACT. 
    Analyse ce corpus de documents et extrais TOUTES les informations possibles pour compléter le dossier de subvention.
    
    RETOURNE EXCLUSIVEMENT UN OBJET JSON avec ces clés : 
    title, theme, context, projectType, startDate, endDate, duration, target, objectives, expectedResults, location, financingPlan.
    
    DOCUMENTS :
    ${corpus}`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        return extractJSON(response.choices[0].message.content || "{}") || {};
      } else if (config.provider === "gemini" && config.gemini) {
        // Correct usage for @google/genai SDK (it's different from @google/generative-ai)
        const response = await config.gemini.models.generateContent({
            model: config.model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return extractJSON(response.text || "{}") || {};
      }
      return {};
    });
  },

  async detectFunding(client: Client, project: Project): Promise<Grant[]> {
    const config = getAIConfig();
    const prompt = `Tu es l'expert de SUB'ÉCO IMPACT. Trouve des aides réelles pour : ${client.name} (${client.region}).
    Secteur: ${client.sector}. Projet: ${project.title}.
     Budget : ${typeof project.financingPlan === 'object' ? JSON.stringify(project.financingPlan) : project.financingPlan}.
    
    RETOURNE EXCLUSIVEMENT UN ARRAY JSON d'objets avec : id, title, provider, amount, description.`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        const result = extractJSON(response.choices[0].message.content || "[]");
        const grants = Array.isArray(result) ? result : (result.grants || result.aides || Object.values(result)[0]);
        return Array.isArray(grants) ? grants : [];
      } else if (config.provider === "gemini" && config.gemini) {
        const response = await config.gemini.models.generateContent({
            model: config.model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        const resultJson = extractJSON(response.text || "[]");
        return Array.isArray(resultJson) ? resultJson : [];
      }
      return [];
    });
  },

  async generateDocument(client: Client, project: Project, grant: Grant, docType: string): Promise<string> {
    const config = getAIConfig();
    const prompt = `Rédige une ${docType} officielle pour SUB'ÉCO IMPACT, prête à l'emploi.
    STRICT : Ne commence JAMAIS par "Voici...". Commence DIRECTEMENT par le contenu (Objet: ...).
    
    DONNÉES :
    - Client : ${client.name}
    - Projet : ${project.title}
    - Aide : ${grant.title} de ${grant.provider}`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || "";
      } else if (config.provider === "gemini" && config.gemini) {
        const response = await config.gemini.models.generateContent({
            model: config.model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "";
      }
      return "";
    });
  }
};
