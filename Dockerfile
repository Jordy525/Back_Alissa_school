# Utilisation de l'image Node.js officielle
FROM node:18-alpine

# Définition du répertoire de travail
WORKDIR /app

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copie des fichiers de configuration des dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci --only=production && npm cache clean --force

# Copie du code source
COPY . .

# Création du répertoire pour les logs
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Changement de propriétaire des fichiers
RUN chown -R nodejs:nodejs /app

# Utilisateur non-root pour la sécurité
USER nodejs

# Exposition du port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Point d'entrée avec dumb-init pour une meilleure gestion des signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage
CMD ["node", "server.js"]


