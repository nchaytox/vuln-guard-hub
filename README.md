# Vuln Guard Hub

Plateforme (client React + serveur Node/Express + Postgres) pour analyser des dépôts GitHub ou des fichiers et stocker les résultats de vulnérabilités (Trivy).

## Aperçu
- Backend: Express (Node 20), JWT, Postgres, Trivy (execFile)
- Frontend: React + Vite (TS), Tailwind, Shadcn UI
- Infra: Docker Compose (Postgres, pgAdmin, server, client)

## Démarrage rapide (Docker Compose)
Prérequis: Docker + Docker Compose.

1. Lancer les services
   ```bash
   docker compose up --build
   ```
2. Accès
   - API backend: `http://localhost:3001`
   - Frontend (Vite dev): `http://localhost:5173`
   - pgAdmin: `http://localhost:5050`
     - Email: défini dans `docker-compose.yml`
     - Mot de passe: défini dans `docker-compose.yml`

3. Workflow
   - Créer un compte (Register) ou se connecter (Login)
   - Scanner un dépôt GitHub public via URL (ex: `https://github.com/owner/repo`)
   - Uploader un fichier de dépendances (ex: `package.json`, `requirements.txt`, `*.lock`)
   - Consulter “My Scans” et exporter en CSV

Note: les scans appellent Trivy dans le conteneur serveur. En local hors Docker, veillez à installer Trivy et à l’avoir dans le PATH.

## Variables d’environnement principales
Les valeurs par défaut utiles sont déjà posées dans `docker-compose.yml`.
- Serveur (`server`):
  - `PORT=3001`
  - `JWT_SECRET=...` (modifiez en production)
  - `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/vulntrack`
- Client (`client`):
  - `VITE_API_URL=http://localhost:3001`
- pgAdmin (`pgadmin`):
  - `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` (changez-les)

Si vous déployez ailleurs, adaptez ces valeurs et exposez les ports nécessaires.

## Endpoints API (serveur)
- Auth
  - `POST /auth/register` { username, password } → { token }
  - `POST /auth/login` { username, password } → { token }
- Scans (JWT requis)
  - `POST /scan` { repoUrl } → lance `trivy repo` (seulement `https://github.com/*` autorisé)
  - `POST /api/upload/upload` (multipart `file`) → lance `trivy fs`
  - `GET /api/scans` → liste des scans de l’utilisateur
  - `GET /api/scans/export` → export CSV filtrable

Les résultats sont persistés par utilisateur (table `scans`).

## Développement hors Docker (optionnel)
Prérequis: Node 20, Postgres, Trivy.

- Backend
  ```bash
  cd server
  npm install
  # définir DATABASE_URL et JWT_SECRET dans l’environnement
  node index.js
  ```

- Frontend
  ```bash
  cd client
  npm install
  npm run dev
  # Vite écoute sur 8080 en conteneur, 5173 en local
  ```

## Base de données
- La connexion et la création des tables sont gérées au démarrage (`server/db-postgres.js`).
- Index et contraintes pour l’unicité insensible à la casse des usernames.

## Sécurité et bonnes pratiques
- Ne pas committer de secrets: utilisez des variables d’environnement.
- Le module d’alerte email (`server/utils/alert.js`) est un exemple. Remplacez-le par une configuration SMTP via variables d’environnement ou désactivez-le si non utilisé.
- Changez `JWT_SECRET`, les identifiants pgAdmin et toute valeur par défaut avant la production.

## Licence
MIT

