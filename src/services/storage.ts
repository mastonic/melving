
import { Client, Project, Grant } from '../types';

const CLIENTS_KEY = 'fp_clients';
const PROJECTS_KEY = 'fp_projects';

export const storage = {
  getClients: (): Client[] => {
    const data = localStorage.getItem(CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveClient: (client: Client) => {
    const clients = storage.getClients();
    const existingIndex = clients.findIndex(c => c.id === client.id);
    if (existingIndex > -1) clients[existingIndex] = client;
    else clients.push(client);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },
  getClient: (id: string): Client | undefined => {
    return storage.getClients().find(c => c.id === id);
  },
  getProjects: (): Project[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveProject: (project: Project) => {
    const projects = storage.getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex > -1) projects[existingIndex] = project;
    else projects.push(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  },
  getProject: (id: string): Project | undefined => {
    return storage.getProjects().find(p => p.id === id);
  },
  getProjectsByClient: (clientId: string): Project[] => {
    return storage.getProjects().filter(p => p.clientId === clientId);
  }
};
