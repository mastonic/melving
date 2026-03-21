
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Client, Grant, Project, DocumentFile } from "../types";
import { knowledgeService } from "./knowledge";

const getAIConfig = () => {
    // 1. Get current preference if set
    const preferredProvider = localStorage.getItem('AI_PROVIDER');
    
    // 2. Get keys
    const geminiKey = (
        localStorage.getItem('GEMINI_API_KEY') || 
        (import.meta as any).env?.VITE_GEMINI_API_KEY || 
        ""
    ).trim();

    const openaiKey = (
        localStorage.getItem('OPENAI_API_KEY') ||
        (import.meta as any).env?.VITE_OPENAI_API_KEY ||
        ""
    ).trim();

    const claudeKey = (
        localStorage.getItem('CLAUDE_API_KEY') ||
        (import.meta as any).env?.VITE_CLAUDE_API_KEY ||
        ""
    ).trim();

    // 3. Select final key and provider
    let selectedProvider = preferredProvider || (openaiKey.startsWith("sk-") ? "openai" : "gemini");
    let activeKey = selectedProvider === "openai" ? openaiKey : selectedProvider === "claude" ? claudeKey : geminiKey;

    // Fallback if the preferred one has no key
    if (!activeKey) {
        if (claudeKey) {
            selectedProvider = "claude";
            activeKey = claudeKey;
        } else if (openaiKey) {
            selectedProvider = "openai";
            activeKey = openaiKey;
        } else if (geminiKey) {
            selectedProvider = "gemini";
            activeKey = geminiKey;
        }
    }

    if (!activeKey || activeKey === "undefined" || activeKey === "null") {
      throw new Error("apikey_missing");
    }

    if (selectedProvider === "openai") {
        return {
            provider: "openai" as const,
            openai: new OpenAI({ apiKey: activeKey, dangerouslyAllowBrowser: true }),
            model: "gpt-4o-mini"
        };
    }

    if (selectedProvider === "claude") {
        return {
            provider: "claude" as const,
            claude: new Anthropic({ apiKey: activeKey, dangerouslyAllowBrowser: true }),
            model: "claude-sonnet-4-6"
        };
    }

    return {
        provider: "gemini" as const,
        gemini: new GoogleGenAI({ apiKey: activeKey, apiVersion: 'v1beta' }),
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
      } else if (config.provider === "claude" && config.claude) {
        const response = await config.claude.messages.create({
          model: config.model,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }]
        });
        const text = response.content[0].type === "text" ? response.content[0].text : "{}";
        return extractJSON(text) || {};
      } else if (config.provider === "gemini" && config.gemini) {
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
    const kbContext = knowledgeService.getContext(6000);
    const prompt = `Tu es l'expert de SUB'ÉCO IMPACT. Trouve des aides réelles pour : ${client.name} (${client.region}).
    Secteur: ${client.sector}. Projet: ${project.title}.
    Budget : ${typeof project.financingPlan === 'object' ? JSON.stringify(project.financingPlan) : project.financingPlan}.
    Contexte projet : ${project.context || ''}.
    Objectifs : ${project.objectives || ''}.
    Taille entreprise : ${client.size}.${kbContext ? `

    BASE DE CONNAISSANCES PARTAGÉE (utilise ces informations pour enrichir et affiner ta réponse) :
    ${kbContext}` : ''}

    RETOURNE EXCLUSIVEMENT UN ARRAY JSON d'objets avec ces champs :
    - id : identifiant unique
    - title : nom de l'aide
    - provider : organisme porteur
    - amount : montant ou plafond estimé
    - description : description courte de l'aide
    - sources : références officielles ou liens (ex: décret, appel à projets)
    - funders : liste des financeurs (ex: BPI, Région, Europe, ADEME...)
    - fundingRate : taux de financement (ex: "50% des dépenses éligibles", "jusqu'à 80%")
    - openingPeriod : période d'ouverture ou date limite (ex: "Ouvert toute l'année", "Clôture le 30/06/2025")
    - compatibilityScore : nombre entier de 0 à 100 indiquant la compatibilité avec ce dossier précis (100 = parfait match secteur/région/budget/objectifs)
    - compatibilityReason : explication courte du score en 1 phrase (ex: "Secteur éligible, région couverte, budget dans les plafonds")

    Consulte OBLIGATOIREMENT ces sources spécifiques aux DOM (Martinique/Guadeloupe) :
    AVERE, EDF, DEAL (Direction de l'Environnement de l'Aménagement et du Logement), AFD (Agence Française de Développement), ADEME, CTM (Collectivité Territoriale de Martinique), EPCI, CCI (Chambre de Commerce et d'Industrie), BPI France, Région, FEADER, FEDER, FSE, État.
    Consulte aussi : https://martinique-renov.ecologie.gouv.fr/dispositifs-2-4
    Sois précis et basé sur des dispositifs réels existants en ${client.region}.
    Retourne AU MINIMUM 10 aides différentes, triées par compatibilityScore décroissant.

    Pour chaque aide, inclus aussi :
    - url : lien officiel complet du dispositif avec https:// (ex: "https://www.ademe.fr/...")
    - requiredDocuments : tableau des pièces justificatives à fournir pour cette aide (ex: ["Kbis / extrait SIRENE", "RIB bancaire", "Devis prestataire", "Plan de financement prévisionnel"])
    - eligibilityConditions : conditions d'éligibilité précises pour bénéficier de cette aide (ex: critères entreprise, secteur, taille, zone géographique, type de dépenses éligibles, plafonds, exclusions)`;

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
      } else if (config.provider === "claude" && config.claude) {
        const response = await config.claude.messages.create({
          model: config.model,
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        });
        const text = response.content[0].type === "text" ? response.content[0].text : "[]";
        const result = extractJSON(text);
        const grants = Array.isArray(result) ? result : (result?.grants || result?.aides || Object.values(result ?? {})[0]);
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
    const prompt = `Rédige une ${docType} professionnelle, prête à l'emploi, rédigée AU NOM DU CLIENT et ADRESSÉE AU FINANCEUR.

    RÈGLES ABSOLUES :
    - Ne mentionne JAMAIS "SUB'ÉCO IMPACT" dans le document
    - Le document est écrit à la première personne par le client (ou son représentant légal)
    - Il est adressé directement au financeur (${grant.provider})
    - Commence DIRECTEMENT par le contenu (Objet: ...), jamais par "Voici..."
    - Termine par une demande explicite de prise de contact ou de rendez-vous
    - Utilise un ton formel et professionnel

    DONNÉES :
    - Expéditeur (client) : ${client.name}
    - Projet : ${project.title}
    - Contexte projet : ${project.context || ''}
    - Destinataire (financeur) : ${grant.provider}
    - Aide sollicitée : ${grant.title}
    - Montant : ${grant.amount}
    - Taux : ${grant.fundingRate || ''}
    - Région : ${client.region || ''}`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || "";
      } else if (config.provider === "claude" && config.claude) {
        const response = await config.claude.messages.create({
          model: config.model,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }]
        });
        return response.content[0].type === "text" ? response.content[0].text : "";
      } else if (config.provider === "gemini" && config.gemini) {
        const response = await config.gemini.models.generateContent({
            model: config.model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "";
      }
      return "";
    });
  },

  async generateContract(client: Client, project: Project, grant: Grant): Promise<string> {
    const config = getAIConfig();
    const today = new Date().toLocaleDateString('fr-FR');
    const prompt = `Génère un CONTRAT DE PRESTATION DE SERVICE professionnel et complet, prêt à signer.

    STRUCTURE OBLIGATOIRE (suit le modèle des contrats ADEME) :
    - En-tête : Numéro de contrat, intitulé du projet, montant
    - ENTRE : le prestataire de service (à compléter par le client) ET le bénéficiaire (${client.name})
    - ARTICLE 1 – OBJET : description de la prestation liée au projet
    - ARTICLE 2 – DESCRIPTION DE LA PRESTATION : détail des missions
    - ARTICLE 3 – DURÉE : durée de la mission
    - ARTICLE 4 – COÛT ET MODALITÉS DE PAIEMENT : montant, modalités
    - ARTICLE 5 – OBLIGATIONS DU PRESTATAIRE
    - ARTICLE 6 – OBLIGATIONS DU CLIENT
    - ARTICLE 7 – CONFIDENTIALITÉ
    - ARTICLE 8 – RÉSILIATION
    - Signatures : Lieu, date (${today}), zones de signature des deux parties

    DONNÉES À INTÉGRER :
    - Bénéficiaire : ${client.name} (SIRET: ${client.siret || 'À compléter'})
    - Secteur : ${client.sector}
    - Région : ${client.region}
    - Projet : ${project.title}
    - Contexte : ${project.context || ''}
    - Objectifs : ${project.objectives || ''}
    - Durée projet : ${project.duration || ''}
    - Budget total : ${project.financingPlan || ''}
    - Aide visée : ${grant.title} (${grant.provider}) — ${grant.amount}
    - Taux de financement : ${grant.fundingRate || ''}

    RÈGLES :
    - Document formel, prêt à l'emploi
    - Commence DIRECTEMENT par l'en-tête du contrat (ex: "CONTRAT DE PRESTATION DE SERVICE N°...")
    - Laisse [NOM PRESTATAIRE], [ADRESSE], [SIRET PRESTATAIRE] comme placeholders pour le prestataire`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || "";
      } else if (config.provider === "claude" && config.claude) {
        const response = await config.claude.messages.create({
          model: config.model,
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        });
        return response.content[0].type === "text" ? response.content[0].text : "";
      } else if (config.provider === "gemini" && config.gemini) {
        const response = await config.gemini.models.generateContent({
          model: config.model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "";
      }
      return "";
    });
  },

  async generateFromTemplate(client: Client, project: Project, templateName: string, templateType: string, templateTextContent?: string): Promise<string> {
    const config = getAIConfig();
    const kbContext = knowledgeService.getContext(3000);
    const prompt = `Tu es expert en rédaction de documents professionnels pour SUB'ÉCO IMPACT.

Génère un document de type "${templateName}" (format ${templateType.toUpperCase()}) entièrement pré-rempli avec les données du dossier ci-dessous.
Le document doit être complet, structuré, professionnel et prêt à l'emploi.${templateTextContent ? `\n\nSTRUCTURE DU MODÈLE (respecte cette structure) :\n${templateTextContent.substring(0, 3000)}` : ''}

DONNÉES CLIENT :
- Nom : ${client.name}
- Secteur : ${client.sector}
- Région : ${client.region}
- Taille : ${client.size}
- SIRET : ${client.siret || 'À compléter'}

DONNÉES PROJET :
- Titre : ${project.title}
- Contexte : ${project.context || ''}
- Objectifs : ${project.objectives || ''}
- Résultats attendus : ${project.expectedResults || ''}
- Durée : ${project.duration || ''}
- Localisation : ${project.location || ''}
- Budget / Plan de financement : ${project.financingPlan || ''}
- Date début : ${project.startDate || ''}
- Date fin : ${project.endDate || ''}
${project.validatedGrant ? `
AIDE VALIDÉE :
- Titre : ${project.validatedGrant.title}
- Financeur : ${project.validatedGrant.provider}
- Montant : ${project.validatedGrant.amount}
- Taux : ${project.validatedGrant.fundingRate || ''}` : ''}${kbContext ? `\n\nCONTEXTE BASE DE CONNAISSANCES :\n${kbContext}` : ''}

RÈGLES ABSOLUES :
- Commence DIRECTEMENT par le contenu du document (pas d'explication préalable)
- Document professionnel prêt à signer/envoyer
- Ne mentionne pas SUB'ÉCO IMPACT dans le contenu
- Utilise toutes les données disponibles pour pré-remplir`;

    return withRetry(async () => {
      if (config.provider === "openai" && config.openai) {
        const response = await config.openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message.content || "";
      } else if (config.provider === "claude" && config.claude) {
        const response = await config.claude.messages.create({
          model: config.model,
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        });
        return response.content[0].type === "text" ? response.content[0].text : "";
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
