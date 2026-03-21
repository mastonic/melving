
import { KnowledgeEntry, KnowledgeTemplate } from '../types';
import { generateUUID } from '../utils/uuid';

const KB_KEY = 'fp_knowledge_base';
const TEMPLATES_KEY = 'fp_kb_templates';

export const knowledgeService = {
  getAll: (): KnowledgeEntry[] => {
    const data = localStorage.getItem(KB_KEY);
    return data ? JSON.parse(data) : [];
  },

  save: (entry: KnowledgeEntry) => {
    const entries = knowledgeService.getAll();
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx > -1) entries[idx] = entry;
    else entries.push(entry);
    localStorage.setItem(KB_KEY, JSON.stringify(entries));
  },

  delete: (id: string) => {
    const entries = knowledgeService.getAll().filter(e => e.id !== id);
    localStorage.setItem(KB_KEY, JSON.stringify(entries));
  },

  add: (title: string, content: string, tags?: string[]): KnowledgeEntry => {
    const entry: KnowledgeEntry = {
      id: generateUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      tags,
    };
    knowledgeService.save(entry);
    return entry;
  },

  getContext: (maxChars = 8000): string => {
    const entries = knowledgeService.getAll();
    if (!entries.length) return '';
    const text = entries
      .map(e => `[${e.title}]${e.tags?.length ? ` (${e.tags.join(', ')})` : ''}\n${e.content}`)
      .join('\n\n---\n\n');
    return text.substring(0, maxChars);
  },

  // --- Templates ---
  getTemplates: (): KnowledgeTemplate[] => {
    const data = localStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTemplate: (t: KnowledgeTemplate) => {
    const templates = knowledgeService.getTemplates();
    const idx = templates.findIndex(x => x.id === t.id);
    if (idx > -1) templates[idx] = t;
    else templates.push(t);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  deleteTemplate: (id: string) => {
    const templates = knowledgeService.getTemplates().filter(t => t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  addTemplate: (name: string, fileType: string, content: string, textContent?: string): KnowledgeTemplate => {
    const t: KnowledgeTemplate = {
      id: generateUUID(),
      name,
      fileType,
      content,
      textContent,
      uploadDate: new Date().toISOString(),
    };
    knowledgeService.saveTemplate(t);
    return t;
  },
};
