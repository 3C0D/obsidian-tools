#!/usr/bin/env tsx

console.log(`
Obsidian Plugin Config - Command Reference
Système d'injection pour plugins Obsidian autonomes

STRATÉGIE NPM GLOBAL:
  npm install -g obsidian-plugin-config    # Installation globale (une seule fois)
  obsidian-inject                          # Injection depuis n'importe où
  obsidian-inject /chemin/vers/plugin      # Injection par chemin

INJECTION LOCALE (développement):
  yarn inject-path <chemin>        Injection par chemin depuis plugin-config
  yarn inject <chemin>             Alias pour inject-path

MIGRATION (développement):
  yarn migrate, m <chemin>         Migration plugin vers architecture centralisée
  yarn migrate --dry-run           Aperçu des changements sans appliquer

MAINTENANCE:
  yarn acp                         Add, commit, and push changes
  yarn update-version, v           Update version
  yarn help, h                     Afficher cette aide

EXEMPLES D'UTILISATION:
  # Installation globale (recommandée)
  npm install -g obsidian-plugin-config
  cd mon-plugin && obsidian-inject

  # Développement local
  yarn inject-path "../mon-plugin"
  yarn inject "C:\\Users\\dev\\plugins\\mon-plugin"

CE QUI EST INJECTÉ:
  ✅ Scripts locaux (esbuild.config.ts, acp.ts, utils.ts, etc.)
  ✅ Configuration package.json (scripts, dépendances)
  ✅ Protection yarn obligatoire
  ✅ Installation automatique des dépendances

ARCHITECTURE:
  - Plugin devient AUTONOME avec scripts locaux
  - Aucune dépendance externe requise après injection
  - Mise à jour possible via re-injection

COMPTE NPM: 3c0d (connecté)
`);
