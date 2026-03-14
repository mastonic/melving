#!/bin/bash

# Configuration
APP_NAME="funding-pilot"
PORT=5800

echo "🚀 Déploiement en cours..."

# 1. Vérification Node.js 20+
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
    echo "❌ Erreur: Node.js 20+ est requis (actuel: v$NODE_VER)."
    echo "Exécutez: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs"
    exit 1
fi

# 2. Mise à jour du code
git reset --hard
git pull origin main

# 3. Installation PROPRE
echo "🧹 Nettoyage et installation..."
rm -rf node_modules package-lock.json
npm install

# 4. Build de production (CRITIQUE)
echo "🛠️ Construction du projet..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur: Le build a échoué. Vérifiez les logs ci-dessus."
    exit 1
fi

# 5. Lancement PM2
echo "⚙️ Redémarrage du serveur sur le port $PORT..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

pm2 delete $APP_NAME 2>/dev/null || true
pm2 start "npx vite preview --port $PORT --host 0.0.0.0" --name $APP_NAME
pm2 save

echo "✅ Déploiement réussi sur http://85.31.239.237:$PORT"
pm2 list
