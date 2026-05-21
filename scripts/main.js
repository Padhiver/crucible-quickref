/**
 * Crucible Quick Reference — main.js
 * Foundry VTT Module (v12–v14) — ApplicationV2
 *
 * ─── MACRO POUR OUVRIR ──────────────────────────────────────────────
 *   game.modules.get("crucible-quickref").app.render(true);
 * ────────────────────────────────────────────────────────────────────
 *
 * ─── AJOUTER DU CONTENU ─────────────────────────────────────────────
 *  1. Créer data/rules/<categorie>.json (voir movement.json comme modèle)
 *  2. Ajouter le nom dans data/index.json → "categories"
 *  3. Recharger la page.
 * ────────────────────────────────────────────────────────────────────
 */

const MODULE_ID = "crucible-quickref";

/* ══════════════════════════════════════════════
   DATA SERVICE
   ══════════════════════════════════════════════ */

class QuickRefData {
  static #cache = null;

  static async loadAll() {
    if (this.#cache) return this.#cache;
    const base = `modules/${MODULE_ID}/data`;
    const index = await fetch(`${base}/index.json`).then(r => r.json());
    const ruleMap = new Map();
    const categories = [];
    for (const catId of index.categories) {
      try {
        const cat = await fetch(`${base}/rules/${catId}.json`).then(r => r.json());
        categories.push(cat);
        for (const rule of cat.rules) {
          if (rule.type === "separator") {
            ruleMap.set(rule.id, {
              ...rule,
              _isSeparator:   true,
              _categoryId:    cat.id,
              _categoryColor: cat.color,
              _categoryLabel: cat.label,
              _categoryIcon:  cat.icon,
            });
          } else {
            ruleMap.set(rule.id, {
              ...rule,
              _categoryId:    cat.id,
              _categoryColor: cat.color,
              _categoryLabel: cat.label,
              _categoryIcon:  cat.icon,
            });
          }
        }
      } catch (e) {
        console.warn(`[QuickRef] Failed to load category: ${catId}`, e);
      }
    }
    this.#cache = { categories, ruleMap };
    return this.#cache;
  }

  static invalidate() { this.#cache = null; }
}

/* ══════════════════════════════════════════════
   APPLICATION  –  ApplicationV2
   ══════════════════════════════════════════════ */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class QuickRefApp extends ApplicationV2 {

  constructor(options = {}) {
    super(options);
    this._activeRuleId = null;
    this._activeCatId  = "all";
    this._searchQuery  = "";
    this._data         = null;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id:       "crucible-quickref-window",
    classes:  ["crucible-quickref"],
    tag:      "div",
    window: {
      title:       "QUICKREF.Title",
      resizable:   true,
      minimizable: true,
    },
    position: {
      width:  825,
      height: 580,
    },
  };

  /* ── Data helpers ── */

  async _loadData() {
    if (!this._data) this._data = await QuickRefData.loadAll();
    return this._data;
  }

  _filteredRules() {
    const q = this._searchQuery.toLowerCase().trim();
    let rules = [...this._data.ruleMap.values()];
    if (this._activeCatId !== "all")
      rules = rules.filter(r => r._categoryId === this._activeCatId);
    if (q)
      rules = rules.filter(r =>
        r._isSeparator ||
        r.title.toLowerCase().includes(q) ||
        (r.subtitle || "").toLowerCase().includes(q) ||
        (r.summary  || "").toLowerCase().includes(q) ||
        (r.tags     || []).some(t => t.toLowerCase().includes(q))
      );
    return rules;
  }

  /* ── ApplicationV2 render ── */

  /** @override */
  async _renderHTML(context, options) {
    await this._loadData();
    const { categories } = this._data;
    const rules = this._filteredRules();
    const activeRule = this._activeRuleId ? this._data.ruleMap.get(this._activeRuleId) : null;
    const seeAlso = activeRule?.links?.map(id => this._data.ruleMap.get(id)).filter(Boolean) ?? [];
    const activeCat = categories.find(c => c.id === this._activeCatId);
    const catColor = activeCat?.color ?? "#e94560";

    // Tabs
    const tabsHTML = [
      `<button class="cqr-tab ${this._activeCatId === "all" ? "active" : ""}" data-cat-id="all">
        <i class="fa-solid fa-list"></i>${game.i18n.localize("QUICKREF.AllCategories")}
      </button>`,
      ...categories.map(cat => {
        const isActive = this._activeCatId === cat.id;
        return `<button class="cqr-tab ${isActive ? "active" : ""}" data-cat-id="${cat.id}" style="--cqr-cat-color:${cat.color}">
          <i class="${cat.icon}"></i>${cat.label}
        </button>`;
      })
    ].join("");

    const listHTML = this._buildListHTML(rules, categories);
    const detailHTML = activeRule
      ? this._buildDetailHTML(activeRule, seeAlso)
      : `<div class="cqr-detail-empty">
           <i class="fa-solid fa-book-open"></i>
           <span>Sélectionnez une règle</span>
         </div>`;

    const div = document.createElement("div");
    div.innerHTML = `
      <div id="crucible-quickref-app" style="--cqr-cat-color:${catColor}">
        <div class="cqr-header">
          <h1 class="cqr-header-title">
            <i class="fa-solid fa-scroll" style="color:var(--cqr-gold);margin-right:6px"></i>
            ${game.i18n.localize("QUICKREF.Title")}
          </h1>
          <div class="cqr-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="cqr-search" type="text"
                   placeholder="${game.i18n.localize("QUICKREF.Search")}"
                   value="${this._searchQuery}" autocomplete="off">
          </div>
        </div>
        <div class="cqr-tabs">${tabsHTML}</div>
        <div class="cqr-body">
          <div class="cqr-list"><div class="cqr-list-inner">${listHTML}</div></div>
          <div class="cqr-detail">${detailHTML}</div>
        </div>
      </div>`;
    return div;
  }

  /** @override */
  _replaceHTML(result, content, options) {
    content.innerHTML = "";
    content.append(...result.childNodes);
    this._activateListeners(content);
  }

  /* ── Event wiring ── */

  _activateListeners(root) {
    root.querySelector(".cqr-search")?.addEventListener("input", e => {
      this._searchQuery = e.target.value;
      this._rerenderList(root);
    });

    root.querySelectorAll(".cqr-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeCatId  = btn.dataset.catId;
        this._activeRuleId = null;
        this._rerenderList(root);
        this._rerenderDetail(root);
        this._syncTabColor(root);
      });
    });

    this._bindRuleItems(root);
    this._bindInlineLinks(root);

    // Le window-header a pointer-events:none pour laisser passer les clics vers
    // la recherche. On réimplémente le drag directement sur la zone titre.
    const titleEl = root.querySelector(".cqr-header-title");
    if (titleEl) {
      titleEl.style.cursor = "grab";
      titleEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = this.element.getBoundingClientRect();
        const ox   = e.clientX - rect.left;
        const oy   = e.clientY - rect.top;
        titleEl.style.cursor = "grabbing";
        const onMove = (e) => this.setPosition({ left: e.clientX - ox, top: e.clientY - oy });
        const onUp   = () => {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup",   onUp);
          titleEl.style.cursor = "grab";
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup",   onUp);
      });
    }
  }

  _bindRuleItems(root) {
    root.querySelectorAll(".cqr-rule-item").forEach(item => {
      item.addEventListener("click", () => {
        this._activeRuleId = item.dataset.ruleId;
        root.querySelectorAll(".cqr-rule-item").forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        this._rerenderDetail(root);
      });
    });
  }

  _bindInlineLinks(root) {
    root.querySelectorAll("a.rule-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const id = link.dataset.ruleId;
        if (id) this.openRule(id);
      });
    });
  }

  _syncTabColor(root) {
    const { categories } = this._data;
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    root.querySelectorAll(".cqr-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.catId === this._activeCatId);
    });
    const cat = catMap[this._activeCatId];
    const color = cat?.color ?? "#e94560";
    root.querySelector("#crucible-quickref-app")?.style.setProperty("--cqr-cat-color", color);
  }

  /* ── Partial re-renders ── */

  _rerenderList(root) {
    const listEl = root.querySelector(".cqr-list-inner");
    if (!listEl) return;
    listEl.innerHTML = this._buildListHTML(this._filteredRules(), this._data.categories);
    this._bindRuleItems(root);
  }

  _rerenderDetail(root) {
    const detailEl = root.querySelector(".cqr-detail");
    if (!detailEl) return;
    const { ruleMap } = this._data;
    const rule = this._activeRuleId ? ruleMap.get(this._activeRuleId) : null;
    const seeAlso = rule?.links?.map(id => ruleMap.get(id)).filter(Boolean) ?? [];
    detailEl.innerHTML = rule
      ? this._buildDetailHTML(rule, seeAlso)
      : `<div class="cqr-detail-empty"><i class="fa-solid fa-book-open"></i><span>Sélectionnez une règle</span></div>`;
    this._bindInlineLinks(detailEl);
  }

  /* ── HTML builders ── */

  _buildListHTML(rules, categories) {
    if (!rules.length)
      return `<div class="cqr-no-results">${game.i18n.localize("QUICKREF.NoResults")}</div>`;

    const grouped = new Map();
    for (const r of rules) {
      if (!grouped.has(r._categoryId)) grouped.set(r._categoryId, []);
      grouped.get(r._categoryId).push(r);
    }
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    let html = "";

    for (const [catId, catRules] of grouped) {
      const cat = catMap[catId] ?? { label: catId, color: "#e94560", description: "", icon: "fa-solid fa-list" };
      html += `<div class="cqr-category-header" style="--cqr-cat-color:${cat.color}">
        <i class="${cat.icon}"></i>${cat.label}</div>`;
      if (cat.description && this._activeCatId !== "all")
        html += `<div class="cqr-category-desc">${cat.description}</div>`;
      for (const rule of catRules) {
        if (rule._isSeparator) {
          html += `<div class="cqr-list-separator">
            <span class="cqr-list-separator-line"></span>
            <span class="cqr-list-separator-label">${rule.title}</span>
            <span class="cqr-list-separator-line"></span>
          </div>`;
          continue;
        }
        html += `<div class="cqr-rule-item ${rule.id === this._activeRuleId ? "active" : ""}"
                      data-rule-id="${rule.id}" style="--cqr-cat-color:${cat.color}">
          <div class="cqr-rule-icon"><i class="${rule.icon}"></i></div>
          <div class="cqr-rule-meta">
            <div class="cqr-rule-title">${rule.title}</div>
            <div class="cqr-rule-subtitle">${rule.subtitle ?? ""}</div>
          </div>
        </div>`;
      }
    }
    return html;
  }

  _buildDetailHTML(rule, seeAlso) {
    const bulletsHTML = (rule.bullets ?? []).map(b => this._buildBlock(b)).join("");

    const seeAlsoHTML = seeAlso.length ? `
      <div class="cqr-see-also">
        <div class="cqr-see-also-title">${game.i18n.localize("QUICKREF.SeeAlso")}</div>
        <div class="cqr-see-also-links">
          ${seeAlso.map(r => `
            <span class="cqr-see-also-link" data-rule-id="${r.id}"
                  onclick="game.modules.get('${MODULE_ID}').app.openRule('${r.id}')">
              <i class="${r.icon}"></i>${r.title}
            </span>`).join("")}
        </div>
      </div>` : "";

    const tagsHTML = rule.tags?.length
      ? `<div class="cqr-tags">${rule.tags.map(t => `<span class="cqr-tag">${t}</span>`).join("")}</div>`
      : "";

    return `<div class="cqr-detail-content">
      <div class="cqr-detail-hero" style="--cqr-cat-color:${rule._categoryColor}">
        <div class="cqr-detail-hero-icon"><i class="${rule.icon}"></i></div>
        <div class="cqr-detail-hero-text">
          <h2 class="cqr-detail-name">${rule.title}</h2>
          <div class="cqr-detail-subtitle">${rule.subtitle ?? ""}</div>
        </div>
        <div class="cqr-detail-actions">
          <span class="cqr-category-badge" style="--cqr-cat-color:${rule._categoryColor}">
            <i class="${rule._categoryIcon}"></i>${rule._categoryLabel}
          </span>
        </div>
      </div>
      <div class="cqr-detail-desc">${rule.description ?? ""}</div>
      <div class="cqr-bullets">${bulletsHTML}</div>
      ${seeAlsoHTML}
      ${tagsHTML}
      <div class="cqr-reference">
        <i class="fa-solid fa-book"></i>
        ${game.i18n.localize("QUICKREF.Reference")} : ${rule.reference ?? "—"}
      </div>
    </div>`;
  }

  /**
   * Transforme la syntaxe @[rule.id]{label} en liens cliquables.
   * Si le label est omis (@[rule.id]), le titre de la règle est utilisé.
   */
  _parseLinks(text) {
    if (!text || !this._data) return text ?? "";
    return text.replace(/@\[([^\]]+)\](?:\{([^}]*)\})?/g, (_, ruleId, label) => {
      const rule = this._data.ruleMap.get(ruleId);
      const displayText = label || rule?.title || ruleId;
      return `<a class="rule-link" data-rule-id="${ruleId}" title="${rule?.title ?? ruleId}">${displayText}</a>`;
    });
  }

  _buildBlock(block) {
    switch (block.type) {
      case "paragraph":
        return `<div class="cqr-block"><p>${this._parseLinks(block.content)}</p></div>`;

      case "list": {
        const titleHTML = block.title ? `<div class="cqr-block-title">${block.title}</div>` : "";
        const items = (block.items ?? []).map(i => `<li>${this._parseLinks(i)}</li>`).join("");
        return `<div class="cqr-block">${titleHTML}<ul>${items}</ul></div>`;
      }

      case "callout": {
        const danger = block.icon?.includes("triangle-exclamation") ? "danger" : "";
        return `<div class="cqr-block">
          <div class="cqr-callout ${danger}">
            <i class="${block.icon ?? "fa-solid fa-circle-info"}"></i>
            <span>${this._parseLinks(block.content)}</span>
          </div></div>`;
      }

      case "table": {
        const headers = (block.headers ?? []).map(h => `<th>${h}</th>`).join("");
        const rows = (block.rows ?? []).map(row =>
          `<tr>${row.map(cell => `<td>${this._parseLinks(cell)}</td>`).join("")}</tr>`
        ).join("");
        return `<div class="cqr-block">
          ${block.title ? `<div class="cqr-block-title">${block.title}</div>` : ""}
          <div class="cqr-table-wrap">
            <table class="cqr-table">
              <thead><tr>${headers}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div></div>`;
      }

      default:
        return `<div class="cqr-block"><p>${this._parseLinks(block.content ?? "")}</p></div>`;
    }
  }

  /* ── Public API ── */

  openRule(ruleId) {
    if (!this._data) return;
    const rule = this._data.ruleMap.get(ruleId);
    if (!rule) return;

    if (rule._categoryId !== this._activeCatId) {
      this._activeCatId = rule._categoryId;
    }
    this._activeRuleId = ruleId;
    this.render(false);

    setTimeout(() => {
      const el = this.element?.querySelector(`.cqr-rule-item[data-rule-id="${ruleId}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, 80);
  }

}

/* ══════════════════════════════════════════════
   FOUNDRY HOOKS
   ══════════════════════════════════════════════ */

Hooks.once("init", () => {
  console.log(`[${MODULE_ID}] Initialized.`);
});

Hooks.once("ready", () => {
  const app = new QuickRefApp();
  game.modules.get(MODULE_ID).app = app;

  // Pre-fetch data silently
  QuickRefData.loadAll().catch(e => console.error(`[${MODULE_ID}] Data load error:`, e));

  // Macro helper exposed on window
  window.QuickRef = {
    /** Ouvrir la fenêtre (et optionnellement une règle spécifique) */
    open(ruleId) {
      app.render(true);
      if (ruleId) setTimeout(() => app.openRule(ruleId), 300);
    }
  };

  console.log(`[${MODULE_ID}] Ready.`);
  console.log(`[${MODULE_ID}] Macro : game.modules.get("crucible-quickref").app.render(true)`);
});