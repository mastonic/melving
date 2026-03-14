#!/bin/bash

# Configuration
PROJECT_DIR=$(pwd)
BRANCH="main"
APP_NAME="funding-pilot"
PORT=5800

echo "🚀 Démarrage du déploiement complet..."

# 1. Vérification et Mise à jour de Node.js (Si < 20)
NODE_CHECK=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_CHECK" -lt 20 ]; then
    echo "🌐 Mise à jour de Node.js vers la version 20 (Requis pour Tailwind 4)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js version $(node -v) est déjà compatible."
fi

# 2. Accéder au dossier du projet
cd $PROJECT_DIR || { echo "❌ Erreur: Répertoire non trouvé"; exit 1; }

# 3. Récupérer le code
echo "📥 Récupération des nouveautés depuis GitHub ($BRANCH)..."
git reset --hard
git pull origin $BRANCH

# 4. Installation propre des dépendances
echo "🧹 Nettoyage et installation des dépendances..."
rm -rf node_modules package-lock.json
npm install

# 5. Build
echo "🛠️ Construction de l'application (Production)..."
npm run build

# 6. Gestion de PM2
echo "⚙️ Configuration de PM2 pour le port $PORT..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation globale de PM2..."
    npm install -g pm2
fi

# Arrêter l'ancienne instance si elle existe
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Lancer la nouvelle instance via 'vite preview' sur le port 5800
echo "🛰️ Lancement de l'application sur http://85.31.239.237:$PORT"
pm2 start "npx vite preview --port $PORT --host 0.0.0.0" --name $APP_NAME

# Sauvegarder la configuration PM2 pour le redémarrage du serveur
pm2 save

echo "🎉 Déploiement terminé avec succès !"
echo "📊 Statut PM2 :"
pm2 list
