# Bible Imager — Remotion Edition

**Bible Imager** est une application web propulsée par l'IA (Google Gemini & Imagen) et **Remotion** qui transforme automatiquement un enregistrement audio ou un document (étude biblique, discours, récit historique ou présentation thématique) en une **vidéo illustrée complète et synchronisée**.

---

## 🎯 À quoi sert l'application ?

Lorsqu'on dispose d'un enregistrement audio (par exemple un discours, une méditation biblique ou un exposé historique) ou d'un document texte/PDF, créer un support visuel pertinent et synchronisé prend beaucoup de temps.

**Bible Imager** automatise l'ensemble de ce processus :
1. **Analyse intelligente du contenu** : l'IA écoute l'audio (ou lit le document) et le découpe automatiquement en segments clés horodatés (`MM:SS`), en identifiant pour chaque passage le verset ou la référence, le thème principal et une description visuelle détaillée.
2. **Direction artistique personnalisable** : choix du contexte d'époque (*Biblique*, *Seconde Guerre mondiale*, *Technologie IA*, *Antiquité*, *Moyen Âge*, ou personnalisé) et parmi près de 20 styles visuels (*Cinématique*, *Aquarelle biblique*, *Photoréaliste*, *Peinture à l'huile*, *Illustration*, *Croquis*, etc.). En mode biblique, l'application veille au respect esthétique (pas de représentation directe de figures divines, style humble et naturel).
3. **Génération d'illustrations sur mesure** : chaque segment reçoit une image générée en 16:9 via les modèles d'image Gemini / Imagen, avec le choix entre un mode **Brouillon** (rapide et économique) et un mode **Final** (haute définition).
4. **Édition et prévisualisation interactive** : un studio d'édition permet d'ajuster les horodatages, les titres, les prompts d'image, d'ajouter ou supprimer des scènes, de régénérer une image spécifique et de prévisualiser le rendu en temps réel grâce au lecteur **Remotion**.
5. **Export vidéo MP4 clé en main** : assemblage automatique de la piste audio, d'une diapositive de titre sur parchemin, des transitions fondues entre chaque illustration et d'un écran de fin animé multilingue (*Like / S'abonner* en français, anglais, espagnol, arabe ou farsi).

---

## ✨ Fonctionnalités principales

- **Analyse multimodale via Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash`)** : détection automatique ou nombre fixe de segments à partir de fichiers audio ou documents.
- **Génération d'images IA (`Gemini Image` & `Imagen 4`)** : format 16:9, gestion automatique des quotas et repli sur plusieurs modèles.
- **Support multilingue** : génération des titres, références et écrans de fin en **Français (`fr`)**, **Anglais (`en`)**, **Espagnol (`es`)**, **Arabe (`ar`)** et **Farsi (`fa`)**.
- **Rendu vidéo Remotion** :
  - Prévisualisation instantanée dans le navigateur (`@remotion/player`).
  - Export vidéo MP4 côté serveur (`@remotion/renderer`) ou côté client (`FFmpeg.wasm`).

---

## 🛠️ Stack technique

- **Framework** : [Next.js 14](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS)
- **Moteur vidéo** : [Remotion 4](https://www.remotion.dev/) (`remotion`, `@remotion/player`, `@remotion/renderer`, `@remotion/bundler`) & `FFmpeg.wasm`
- **Intelligence Artificielle** : [Google Generative AI SDK](https://ai.google.dev/) (Gemini Flash pour l'analyse audio/texte, Gemini Image & Imagen pour les illustrations)
- **Déploiement** : Docker, Docker Compose & PM2

---

## 🚀 Installation et démarrage

### 1. Prérequis
- **Node.js** 20+
- Une **clé API Google Gemini** (à renseigner directement dans l'interface en haut à droite).

### 2. Lancement en développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement (port 3002)
npm run dev
```

Ouvrez ensuite [http://localhost:3002](http://localhost:3002) dans votre navigateur.

### 3. Lancement avec Docker

Un script de déploiement automatisé et un fichier `docker-compose.yml` sont fournis :

```bash
# Via le script dédié
chmod +x launch_docker.sh
./launch_docker.sh

# Ou via Docker Compose
docker compose up -d --build
```

L'application sera accessible sur `http://localhost:3002`. Pour plus de détails sur le déploiement serveur, consultez [DEPLOY.md](./DEPLOY.md).
