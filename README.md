# app-handler-pro

Petit utilitaire Electron pour détecter des projets dans un répertoire, lister les dépôts locaux et distants (GitHub / GitLab), et proposer des commandes de lancement (dev/start/etc.). Conçu pour supporter :
- Projets Node (React/Vue/Next/Nuxt/Svelte/Electron, NestJS, etc.)
- Backends (Go, Python, Java, Rust, .NET, Makefile, Docker Compose...)
- Monorepos (détection de sous‑dossiers pertinents)
- Auth GitHub (device flow) et GitLab (PAT, self‑hosted inclus)

## Principales fonctionnalités
- Scan du disque et détection intelligente du type de projet + commandes candidates
- Enrichissement de chaque projet avec une liste de launchCommands
- Intégration GitHub (device flow) et GitLab (Personal Access Token) : connexion, lister dépôts, déconnexion
- Interface front (React) intégrée à l'app Electron ; ouverture de projets dans l'éditeur, lancement de commandes

## Prérequis
- Linux (instructions ci‑dessous), macOS ou Windows
- Node.js (>=16 recommandé)
- npm / yarn / pnpm (selon vos habitudes)
- Electron (sera installé par les scripts du projet)

## Quickstart (développement, Linux)
1. Cloner le repo
```bash
git clone <repo-url>
cd app-handler-pro
```

2. Installer dépendances (root + front)
```bash
# à la racine
npm install

# si le front est séparé (ex: ./front)
cd front
npm install
cd ..
```

3. Lancer en mode développement
- Si le projet expose des scripts (vérifier `package.json` à la racine) :
```bash
# exemple commun
npm run dev
# ou
npm run start
```

- Si aucun script n'existe, lancer Electron manuellement :
```bash
# depuis la racine du projet
npx electron .
```

4. (Optionnel) Si le frontend est un projet séparé (React/CRA/Vite), vous pouvez lancer le dev server du front d'abord, puis lancer Electron :
```bash
# dans front/
npm run dev
# dans la racine du projet (ou autre terminal)
npx electron .
```

## Configuration / variables d'environnement
- `GITHUB_CLIENT_ID` (optionnel) — client id pour l'OAuth device flow. Si non fourni, une valeur par défaut embarquée est utilisée.
- Tokens GitLab sont stockés localement dans `~/.conf-saver/gitlab-token.json` (fichier créé automatiquement). Pas de stockage serveur.

## Utilisation rapide depuis l'interface
- Se connecter à GitHub : bouton GitHub → flux device (popup). Une fois connecté la liste des dépôts GitHub est disponible.
- Se connecter à GitLab : bouton GitLab → popup PAT (host + token). Supporte gitlab.com et instances self‑hosted.
- Les dépôts GitLab / GitHub s'affichent dans la liste des dépôts distants. Ils sont filtrés par la recherche.
- Cliquer sur un dépôt local permet d'ouvrir dans VSCode / lancer une commande candidate.

## Notes techniques / dépannage
- "Aucune commande de lancement détectée" : le scanner fait un enrichissement des projets et, si un projet détecté est un parent sans commandes, il recherche un sous‑dossier (1–2 niveaux) contenant un vrai projet (package.json, go.mod, Cargo.toml, pyproject.toml, pom.xml, composer.json) et proxifie vers celui‑ci.
- Erreur "push is not defined" : cela signifie probablement qu'un appel frontend utilise une fonction `push(...)` inexistante. Vérifier :
  - `preload.js` : l'exposition via `contextBridge.exposeInMainWorld("github", { pushLocalRepo: ... })`
  - `front/src/services/...` : wrapper utilisé (ex: `githubService.pushLocalRepo(...)`)
  - composants qui appellent l'API (aligner le nom)
- Si la liste GitLab n'apparaît pas :
  - Vérifier connexion (popup PAT)
  - Vérifier console devtools (frontend) pour voir la donnée brute (log dans `RepoList`)
  - Vérifier que `gitlabService` utilise `window.gitlab` exposé par `preload.js`

## Tests & packaging
- Packaging dépend du builder choisi (electron-builder, electron-forge...). Ajouter / utiliser les scripts dans `package.json`.
- Exemple (electron-builder) :
```bash
npm run build
npm run package
```
(Vérifier/adapter les scripts dans `package.json`)

## Contribuer
- Ouvrir une issue pour une détection manquante ou un problème d'auth.
- PR bienvenue pour améliorer la détection de projet, ajout d'autres providers (Bitbucket, self‑hosted Git services), ou meilleure gestion des tokens.

## Licence
Ajoutez ici la licence du projet (ex: MIT) ou laissez
