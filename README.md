# Crucible Quick Reference — Foundry VTT Module

Un module de référence rapide pour les règles de Crucible sur Foundry VTT (v12–14).

---

## Installation

1. Copier le dossier `crucible-quickref/` dans `[votre monde]/modules/`
2. Activer le module depuis les paramètres du monde
3. Recharger la page

---

## Utilisation

### Ouvrir la référence
- **Bouton** : dans la barre des contrôles de scène, icône 📜 *Quick Ref*
- **Macro** : `QuickRef.render()`
- **Lien direct vers une règle** : `QuickRef.open("movement.climb")`

---

## Ajouter du contenu

### Nouvelle catégorie

1. Créer `data/rules/ma-categorie.json` en suivant ce squelette :

```json
{
  "id": "ma-categorie",
  "label": "Ma Catégorie",
  "icon": "fa-solid fa-star",
  "color": "#2980b9",
  "description": "Description courte affichée sous le nom de la catégorie.",
  "rules": [ ... ]
}
```

2. Ajouter `"ma-categorie"` au tableau dans `data/index.json` :

```json
{
  "categories": ["movement", "actions", "ma-categorie"]
}
```

3. Recharger la page Foundry.

### Nouvelle règle

Dans le tableau `"rules"` d'un fichier de catégorie :

```json
{
  "id": "ma-categorie.ma-regle",          // Unique, format: categorie.regle
  "title": "Titre de la règle",
  "subtitle": "Court résumé — affiché dans la liste",
  "icon": "fa-solid fa-bolt",            // Icône Font Awesome 6
  "summary": "Texte affiché au survol (une phrase).",
  "description": "Description longue affichée en haut du détail. Peut contenir du HTML et des <a class='rule-link' data-rule-id='autre.regle'>liens vers d'autres règles</a>.",
  "reference": "Crucible Core, p. 123",
  "bullets": [
    {
      "type": "paragraph",
      "content": "Un paragraphe de texte. Supporte le <b>gras</b> et <i>l'italique</i>."
    },
    {
      "type": "list",
      "title": "Titre optionnel de la liste",
      "items": [
        "Élément 1",
        "Élément 2 avec <b>gras</b>"
      ]
    },
    {
      "type": "callout",
      "icon": "fa-solid fa-circle-info",
      "content": "Note importante mise en valeur."
    },
    {
      "type": "callout",
      "icon": "fa-solid fa-triangle-exclamation",
      "content": "Avertissement (style rouge automatique)."
    },
    {
      "type": "table",
      "title": "Titre du tableau",
      "headers": ["Colonne 1", "Colonne 2"],
      "rows": [
        ["Valeur A", "Résultat A"],
        ["Valeur B", "Résultat B"]
      ]
    }
  ],
  "links": ["autre-categorie.autre-regle"],   // IDs des règles "Voir aussi"
  "tags": ["mot-clé", "recherche"]            // Mots-clés pour la recherche
}
```

---

## Lier des règles entre elles

Dans le champ `"description"` ou dans les `"content"` des bullets, utilisez :

```html
<a class="rule-link" data-rule-id="movement.difficult-terrain">terrain difficile</a>
```

→ Cliquable dans l'interface, ouvre directement la règle liée.

---

## API Macro

```js
// Ouvrir la fenêtre
QuickRef.render();

// Ouvrir une règle spécifique directement
QuickRef.open("movement.climb");
QuickRef.open("actions.attack");
```

---

## Icônes disponibles

Le module utilise **Font Awesome 6** (déjà inclus dans Foundry).  
Exemples : `fa-solid fa-sword`, `fa-solid fa-person-running`, `fa-solid fa-shield-halved`  
Référence complète : https://fontawesome.com/icons

---

## Structure des fichiers

```
crucible-quickref/
├── module.json              ← Manifest Foundry
├── scripts/
│   └── main.js              ← Code principal
├── styles/
│   └── quickref.css         ← Styles
├── lang/
│   ├── en.json              ← Traductions anglais
│   └── fr.json              ← Traductions français
└── data/
    ├── index.json           ← Liste des catégories actives
    └── rules/
        ├── movement.json    ← Catégorie Déplacement (exemple)
        └── actions.json     ← Catégorie Actions (exemple)
```
