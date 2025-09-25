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
   # (Optionnel) éviter les problèmes de permissions: exportez UID/GID
   export UID=$(id -u); export GID=$(id -g)
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

### Mode production (images durcies)

1. Copier `.env.example` en `.env` et ajuster les variables (notamment `JWT_SECRET`, `VITE_API_URL`).
2. Lancer:
   ```bash
   export UID=$(id -u); export GID=$(id -g)
   docker compose -f docker-compose.prod.yml up --build -d
   ```
3. Accès:
   - API backend: `http://localhost:3001`
   - Frontend (Nginx): `http://localhost:8080`

Le backend expose des métriques Prometheus sur `/metrics` (activables via `METRICS_ENABLED`).

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
 
  - `GET /auth/me` → profil de l’utilisateur connecté
  - `PATCH /auth/me` { email?, displayName?, password? } → met à jour le profil

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

## Agrégation & performances
- Les statistiques de scans sont calculées à la volée via l'endpoint `/api/scans/stats`.
- Pour des historiques volumineux, envisagez une vue matérialisée ou une table d'agrégats mise à jour par job (ex: cron + `REFRESH MATERIALIZED VIEW`) afin de réduire la charge côté API.
- Pensez à indexer `scans(created_at)` / `scans(target)` selon les filtres utilisés pour conserver des requêtes rapides.

## Base de données
- La connexion et la création des tables sont gérées au démarrage (`server/db-postgres.js`).
- Index et contraintes pour l’unicité insensible à la casse des usernames.

## Sécurité et bonnes pratiques
- Ne pas committer de secrets: utilisez des variables d’environnement.
- Changez `JWT_SECRET`, les identifiants pgAdmin et toute valeur par défaut avant la production.
- Headers de sécurité via Helmet, rate‑limit et limites de taille de payload sont activés côté serveur.
- CORS peut être restreint via `ALLOWED_ORIGIN`.
- Exécution non‑root et images multi‑stage en production (voir `Dockerfile.prod`).

 - Uploads: tailles limitées (env `UPLOAD_MAX_FILE_MB`) et extensions autorisées via `UPLOAD_ALLOWED_EXTS`.
 - Quotas par utilisateur: limites dédiées pour `/scan` et `/api/upload/upload` (env `SCAN_RATE_*`, `UPLOAD_RATE_*`).
- Monitoring: métriques Prometheus sur `/metrics`. Protégez l’accès via `METRICS_TOKEN` (Bearer) ou `METRICS_ALLOW_IPS`.

 

## CI/CD (GitHub Actions)

Un pipeline minimal est fourni (`.github/workflows/ci.yml`) qui:
- Installe et audite les dépendances (serveur: échec si HIGH/CRITICAL).
- Build les images server/client (prod) et lance des scans Trivy (FS + images).
- Lance un SAST Semgrep avec configuration auto.

Un workflow de build & push d'images vers GHCR est aussi fourni (`.github/workflows/deploy.yml`).
Les images sont publiées sous `ghcr.io/<owner>/vulnguard-server` et `ghcr.io/<owner>/vulnguard-client` avec tags `latest` et `sha`.
Assurez-vous que le repo a les permissions packages:write (défaut) et, si besoin, définissez `VITE_API_URL` comme variable GitHub Actions (Repository → Settings → Variables → Actions).

## Licence
AHMED TARZOUT
## Tests (serveur)

Des tests de validation et sécurité basiques sont fournis (Jest + Supertest).

```bash
cd server
npm install
npm test
```

## CI Sécurité
- Les workflows `security-pr` et `security-release` lancent Semgrep, Gitleaks et Trivy (SCA/config/image) et génèrent une SBOM CycloneDX à chaque exécution.
- Consultez `docs/ci-security.md` pour la configuration GitHub (Code scanning, protection de branche) et la procédure de triage des alertes/faux positifs.

Kick CI
