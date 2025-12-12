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

# le front et le back sont séparés est séparé (ex: ./front)
cd front
npm install
cd ..

cd electron
npm install
cd ..
```

3. Lancer en mode développement
- Si le projet expose des scripts (vérifier `package.json` à la racine) :
```bash
npm run start
```

## Configuration / variables d'environnement
- `GITHUB_CLIENT_ID` (optionnel) — client id pour l'OAuth device flow. Si non fourni, une valeur par défaut embarquée est utilisée.
- Tokens GitLab sont stockés localement dans `~/.conf-saver/gitlab-token.json` (fichier créé automatiquement). Pas de stockage serveur.

## Utilisation rapide depuis l'interface
- Se connecter à GitHub : bouton GitHub → flux device (popup). Une fois connecté la liste des dépôts GitHub est disponible.
- Se connecter à GitLab : bouton GitLab → popup PAT (host + token). Supporte gitlab.com et instances self‑hosted.
- Les dépôts GitLab / GitHub s'affichent dans la liste des dépôts distants. Ils sont filtrés par la recherche.
- Cliquer sur un dépôt local permet d'ouvrir dans VSCode / lancer une commande candidate.

## Tests & packaging
- Packaging dépend du builder choisi (electron-builder, electron-forge...). Ajouter / utiliser les scripts dans `package.json`.
- Exemple (electron-builder) :
```bash
npm run build
npm run package
```
(Vérifier/adapter les scripts dans `package.json`)
