#!/bin/bash

# Configuration
PROJECT_DIR=$(pwd)
BRANCH="main"

echo "🚀 Démarrage du déploiement..."

# Accéder au dossier du projet
cd $PROJECT_DIR || { echo "❌ Erreur: Répertoire non trouvé"; exit 1; }

# Vérification de la version de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️ ATTENTION: Votre version de Node.js ($NODE_VERSION) est inférieure à 20."
    echo "Tailwind CSS 4 et Gemini AI nécessitent Node.js 20+."
    echo "Si le build échoue, pensez à mettre à jour Node.js (ex: 'nvm install 20')."
fi

# Récupérer les dernières modifications
echo "📥 Récupération des nouveautés depuis GitHub ($BRANCH)..."
git reset --hard
git pull origin $BRANCH

# Nettoyage et installation propre (pour corriger l'erreur native binding)
echo "🧹 Nettoyage des anciennes dépendances..."
rm -rf node_modules package-lock.json

# Installer les dépendances
echo "📦 Installation des dépendances (clean install)..."
npm install

# Construire l'application
echo "🛠️ Construction du bundle de production (Vite)..."
npm run build

echo "✅ Déploiement terminé avec succès !"
echo "ℹ️ Les fichiers de production sont situés dans le dossier 'dist/'."
echo "ℹ️ Si vous utilisez Nginx, assurez-vous qu'il pointe vers ce dossier."
