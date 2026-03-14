#!/bin/bash

# Configuration
PROJECT_DIR=$(pwd)
BRANCH="main"

echo "🚀 Démarrage du déploiement..."

# Accéder au dossier du projet
cd $PROJECT_DIR || { echo "❌ Erreur: Répertoire non trouvé"; exit 1; }

# Récupérer les dernières modifications
echo "📥 Récupération des nouveautés depuis GitHub ($BRANCH)..."
git reset --hard
git pull origin $BRANCH

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Construire l'application
echo "🛠️ Construction du bundle de production (Vite)..."
npm run build

echo "✅ Déploiement terminé avec succès !"
echo "ℹ️ Les fichiers de production sont situés dans le dossier 'dist/'."
echo "ℹ️ Si vous utilisez Nginx, assurez-vous qu'il pointe vers ce dossier."
