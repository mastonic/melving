
import { KnowledgeEntry } from '../types';
import { generateUUID } from '../utils/uuid';

const KB_KEY = 'fp_knowledge_base';

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
};
