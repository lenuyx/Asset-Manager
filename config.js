/* =========================================================
   config.js – Konfigurationserweiterung für AssetMap
   Wird als LETZTES Skript eingebunden (nach app.js).
   Am Original sind nur 2 Zeilen in app.js nötig
   (siehe INTEGRATION.md). Standardwerte bleiben erhalten.
========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     DEFAULT-KONFIGURATION (entspricht dem Original-Standard)
  --------------------------------------------------------- */
  const DEFAULT_CONFIG = {
    types: [
      { key: "application", label: "Anwendung", color: "#1d4ed8", fields: [
        { key: "technologie",      label: "Technologie",       type: "text" },
        { key: "lizenz",          label: "Lizenz",            type: "text" },
        { key: "version",         label: "Version",           type: "text" },
        { key: "authentifizierung", label: "Authentifizierung", type: "text" }
      ]},
      { key: "system", label: "System", color: "#374151", fields: [
        { key: "betriebssystem",    label: "Betriebssystem",   type: "text" },
        { key: "netzwerkzone",      label: "Netzwerkzone",     type: "text" },
        { key: "ip",                label: "IP/Hostname",      type: "text" },
        { key: "authentifizierung", label: "Authentifizierung", type: "text" },
        { key: "standort",          label: "Standort",         type: "text" }
      ]},
      { key: "data", label: "Daten", color: "#0e7490", fields: [
        { key: "personenbezogen", label: "Personenbezogen", type: "boolean" },
        { key: "datenformat",     label: "Datenformat",     type: "text" },
        { key: "speicherort",     label: "Speicherort",     type: "text" },
        { key: "backup",          label: "Backup",          type: "text" }
      ]},
      { key: "process", label: "Prozess", color: "#6d28d9", fields: [] }
    ],
    /* Basisfelder: die fünf Standard-Schlüssel sind fest auf die
       Asset-Properties gemappt (status, description, owner,
       criticality, tags). Neue Basisfelder landen in asset.specifics. */
    baseFields: [
      { key: "status",      label: "Status",            type: "select", optionsSource: "statuses" },
      { key: "description", label: "Beschreibung",      type: "textarea" },
      { key: "owner",       label: "Verantwortlicher",  type: "text" },
      { key: "criticality", label: "Schutzbedarf",      type: "select", optionsSource: "criticalities" },
      { key: "tags",        label: "Tags (kommagetrennt)", type: "tags" }
    ],
    statuses: [
      { key: "aktiv",         label: "Aktiv" },
      { key: "geplant",       label: "Geplant" },
      { key: "ausserbetrieb", label: "Außer Betrieb" }
    ],
    criticalities: [
      { key: "low",    label: "Niedrig", color: "#166534" },
      { key: "medium", label: "Mittel",   color: "#92400e" },
      { key: "high",   label: "Hoch",     color: "#b91c1c" }
    ]
  };

  const STORE_KEY = "assetmap-config";
  const BASE_MAP = { status: "status", description: "description", owner: "owner", criticality: "criticality", tags: "tags" };

  const deep = v => JSON.parse(JSON.stringify(v));

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return deep(DEFAULT_CONFIG);
      return Object.assign(deep(DEFAULT_CONFIG), JSON.parse(raw));
    } catch (e) { return deep(DEFAULT_CONFIG); }
  }

  let config = loadConfig();
  let draft = null; // Arbeitskopie im Konfigurationsdialog

  function saveConfig() { localStorage.setItem(STORE_KEY, JSON.stringify(config)); }

  /* ---------------------------------------------------------
     HELFER
  --------------------------------------------------------- */
  function typeDef(key)   { return config.types.find(t => t.key === key); }
  function typeLabel(key) { const t = typeDef(key); return t ? t.label : key; }
  function critDef(key)   { return config.criticalities.find(c => c.key === key); }
  function critColor(key) { const c = critDef(key); return c ? c.color : "#6b7280"; }
  function critLabel(key) { const c = critDef(key); return c ? c.label : key; }
  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  function optionsFor(f) {
    if (f.optionsSource === "statuses")      return config.statuses.map(s => [s.key, s.label]);
    if (f.optionsSource === "criticalities") return config.criticalities.map(c => [c.key, c.label]);
    return (f.options || []).map(o => [o, o]);
  }

  /* ---------------------------------------------------------
     STYLES + TOPBAR-BUTTONS (Impressum & Konfiguration)
  --------------------------------------------------------- */
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .ghost-btn { border-radius:999px; border:1px solid #d1d5db; background:#f3f4f6; color:#374151;
                 padding:6px 14px; font-size:13px; cursor:pointer; text-decoration:none; display:inline-block; }
    .ghost-btn.btn-sm { padding:3px 8px; font-size:11px; }
    .cfg-overlay { position:fixed; inset:0; background:rgba(17,24,39,.55); z-index:60;
                   display:flex; align-items:center; justify-content:center; padding:20px; }
    .cfg-panel { background:#fff; border-radius:14px; width:min(860px,100%); max-height:92vh;
                 display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,.3); }
    .cfg-head { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1px solid #e5e7eb; }
    .cfg-head h2 { font-size:17px; }
    .cfg-body { padding:14px 20px; overflow-y:auto; }
    .cfg-foot { display:flex; gap:8px; justify-content:flex-end; padding:12px 20px; border-top:1px solid #e5e7eb; flex-wrap:wrap; }
    .cfg-section { margin-bottom:18px; }
    .cfg-section > h3 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:#4b5563; margin-bottom:8px; }
    .cfg-note { font-size:12px; color:#6b7280; margin-bottom:8px; }
    .cfg-cat { border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-bottom:10px; background:#f9fafb; }
    .cfg-cat-head { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
    .cfg-cat-head input[type=text] { flex:1; min-width:110px; }
    .cfg-cat-head input[type=color] { width:38px; height:28px; padding:1px; }
    .cfg-fields-title { font-size:11px; font-weight:600; color:#6b7280; margin:6px 0 4px; }
    .cfg-row { display:flex; gap:6px; align-items:center; margin-bottom:4px; flex-wrap:wrap; }
    .cfg-row input, .cfg-row select { padding:4px 6px; border-radius:6px; border:1px solid #d1d5db; font-size:12px; }
    .cfg-f-label { flex:1; min-width:110px; }
    .cfg-f-key   { flex:1; min-width:100px; }
    .cfg-f-type  { width:105px; }
    .cfg-f-opts  { flex:2; min-width:140px; }
    .cfg-danger { border:none; background:transparent; color:#b91c1c; cursor:pointer; font-size:12px; }
    .cfg-io { width:100%; height:140px; font-family:ui-monospace,monospace; font-size:11px; padding:8px;
              border-radius:8px; border:1px solid #d1d5db; }
    .cfg-none { font-size:12px; color:#6b7280; }
    .toast { position:fixed; bottom:18px; left:50%; transform:translateX(-50%); background:#111827;
             color:#fff; padding:8px 18px; border-radius:999px; font-size:13px; z-index:99; }
  `;
  document.head.appendChild(styleEl);

  function addTopbarButtons() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;

    const cfgBtn = document.createElement("button");
    cfgBtn.id = "openConfigBtn";
    cfgBtn.className = "ghost-btn";
    cfgBtn.textContent = "⚙ Konfiguration";
    cfgBtn.addEventListener("click", openConfig);
    bar.appendChild(cfgBtn);

    const impLink = document.createElement("a");
    impLink.className = "ghost-btn";
    impLink.href = "impressum.html";
    impLink.textContent = "Impressum";
    bar.appendChild(impLink);
  }

  /* ---------------------------------------------------------
     DYNAMISCHES FORMULAR (ersetzt die Original-Sektionen im
     Detail-Panel – die Original-Inputs bleiben unangetastet
     und werden nur ausgeblendet)
  --------------------------------------------------------- */
  function hideOriginalSections() {
    ["sectionApplication", "sectionSystem", "sectionData", "sectionProcess"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    [fieldName, fieldOwner, fieldCriticality, fieldTags].forEach(f => {
      const sec = f.closest(".section");
      if (sec) sec.classList.add("hidden");
    });
  }

  function inputHtml(f, idPrefix) {
    const id = idPrefix + f.key;
    if (f.type === "select") {
      const opts = optionsFor(f).map(p => '<option value="' + esc(p[0]) + '">' + esc(p[1]) + "</option>").join("");
      return '<select id="' + id + '">' + opts + "</select>";
    }
    if (f.type === "textarea") return '<textarea id="' + id + '" rows="3"></textarea>';
    if (f.type === "boolean") return '<input type="checkbox" id="' + id + '">';
    if (f.type === "tags") return '<input type="text" id="' + id + '" placeholder="Kommagetrennt">';
    return '<input type="text" id="' + id + '">';
  }

  function getForm() {
    let form = document.getElementById("cfgForm");
    if (form) return form;
    form = document.createElement("div");
    form.id = "cfgForm";
    const linkSection = document.getElementById("fieldLinkSelect").closest(".section");
    detailContentEl.insertBefore(form, linkSection);
    return form;
  }

  function baseValue(asset, f) {
    const target = BASE_MAP[f.key];
    if (target === "tags") return (asset.tags || []).join(", ");
    if (target) return asset[target] || "";
    return (asset.specifics || {})[f.key] || "";
  }

  function fill(asset) {
    hideOriginalSections();
    const form = getForm();

    // ---- Basisinformationen ----
    let html = '<section class="section"><div class="section-title">Basisinformationen</div>' +
      '<div class="field"><span class="field-label">Name:</span><input id="cfgName"></div>' +
      '<div class="field"><span class="field-label">Kategorie:</span><select id="cfgType">' +
      config.types.map(t => '<option value="' + esc(t.key) + '">' + esc(t.label) + "</option>").join("") +
      "</select></div>";
    config.baseFields.forEach(f => {
      html += '<div class="field"><span class="field-label">' + esc(f.label) + ":</span>" + inputHtml(f, "cfgF_") + "</div>";
    });
    html += "</section>";

    // ---- Kategorie-spezifische Felder ----
    const t = typeDef(asset.type);
    if (t && t.fields.length) {
      html += '<section class="section"><div class="section-title">' + esc(t.label) + "</div>";
      t.fields.forEach(f => {
        html += '<div class="field"><span class="field-label">' + esc(f.label) + ":</span>" + inputHtml(f, "cfgS_") + "</div>";
      });
      html += "</section>";
    }

    form.innerHTML = html;

    // ---- Werte einfüllen ----
    document.getElementById("cfgName").value = asset.name || "";
    document.getElementById("cfgType").value = asset.type;
    config.baseFields.forEach(f => {
      const el = document.getElementById("cfgF_" + f.key);
      if (!el) return;
      if (f.type === "boolean") el.checked = !!baseValue(asset, f);
      else el.value = baseValue(asset, f);
    });
    if (t) t.fields.forEach(f => {
      const el = document.getElementById("cfgS_" + f.key);
      if (!el) return;
      const v = (asset.specifics || {})[f.key];
      if (f.type === "boolean") el.checked = !!v; else el.value = v || "";
    });

    // Bei Kategorie-Wechsel: spezifische Sektion neu aufbauen
    document.getElementById("cfgType").addEventListener("change", () => {
      const nt = typeDef(document.getElementById("cfgType").value);
      const s = asset.specifics || {};
      // alte spezifische Sektion entfernen (2. section im Formular)
      const sections = form.querySelectorAll("section.section");
      if (sections.length > 1) sections[1].remove();
      if (nt && nt.fields.length) {
        const sec = document.createElement("section");
        sec.className = "section";
        let h = '<div class="section-title">' + esc(nt.label) + "</div>";
        nt.fields.forEach(f => {
          h += '<div class="field"><span class="field-label">' + esc(f.label) + ":</span>" + inputHtml(f, "cfgS_") + "</div>";
        });
        sec.innerHTML = h;
        form.appendChild(sec);
        nt.fields.forEach(f => {
          const el = document.getElementById("cfgS_" + f.key);
          if (!el) return;
          const v = s[f.key];
          if (f.type === "boolean") el.checked = !!v; else el.value = v || "";
        });
      }
    });
  }

  function read(asset) {
    const form = document.getElementById("cfgForm");
    if (!form) return;

    asset.name = document.getElementById("cfgName").value.trim();
    asset.type = document.getElementById("cfgType").value;

    config.baseFields.forEach(f => {
      const el = document.getElementById("cfgF_" + f.key);
      if (!el) return;
      let v = (f.type === "boolean") ? el.checked : el.value.trim();
      const target = BASE_MAP[f.key];
      if (target === "tags") asset.tags = String(el.value || "").split(",").map(x => x.trim()).filter(Boolean);
      else if (target) asset[target] = v;
    });

    const spec = {};
    config.baseFields.forEach(f => {
      if (BASE_MAP[f.key]) return;
      const el = document.getElementById("cfgF_" + f.key);
      if (el) spec[f.key] = (f.type === "boolean") ? el.checked : el.value.trim();
    });
    const t = typeDef(asset.type);
    if (t) t.fields.forEach(f => {
      const el = document.getElementById("cfgS_" + f.key);
      if (el) spec[f.key] = (f.type === "boolean") ? el.checked : el.value.trim();
    });
    asset.specifics = spec;
  }

  /* ---------------------------------------------------------
     KARTEN-TAGS & PILL-DYNAMIK
     renderAssets/selectAsset werden gewrappt, damit Farben und
     Labels aus der Konfiguration übernommen werden.
  --------------------------------------------------------- */
  const origRenderAssets = window.renderAssets;
  window.renderAssets = function () {
    origRenderAssets();
    document.querySelectorAll(".asset-card").forEach(card => {
      const asset = assets.find(a => a.id === card.dataset.id);
      if (!asset) return;
      const tags = card.querySelectorAll(".asset-card-tags .tag");
      const t = typeDef(asset.type);
      if (tags[0] && t) {
        tags[0].textContent = t.label;
        tags[0].style.background = t.color + "22";
        tags[0].style.color = t.color;
      }
      if (tags[1]) {
        const c = critDef(asset.criticality);
        if (c) {
          tags[1].textContent = c.label;
          tags[1].style.background = c.color + "22";
          tags[1].style.color = c.color;
        }
      }
    });
  };

  const origSelectAsset = window.selectAsset;
  window.selectAsset = function (id) {
    origSelectAsset(id);
    const a = assets.find(x => x.id === id);
    if (a) detailSubtitle.textContent = typeLabel(a.type) + " · " + (a.owner || "kein Verantwortlicher");
  };

  function renderPills() {
    const pg = document.querySelector(".pill-group");
    if (!pg) return;
    pg.innerHTML = "";
    const mk = (key, label) => {
      const b = document.createElement("button");
      b.className = "pill" + (currentFilter === key ? " pill-active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        currentFilter = key;
        pg.querySelectorAll(".pill").forEach(p => p.classList.remove("pill-active"));
        b.classList.add("pill-active");
        renderAssets();
        if (selectedId) {
          const a = assets.find(x => x.id === selectedId);
          if (a) renderLinksUI(a);
        }
      });
      pg.appendChild(b);
    };
    mk("all", "Alle");
    config.types.forEach(t => mk(t.key, t.label + (t.label.endsWith("e") ? "n" : "")));
  }

  /* ---------------------------------------------------------
     KONFIGURATIONS-DIALOG
  --------------------------------------------------------- */
  function buildOverlay() {
    const ov = document.createElement("div");
    ov.id = "cfgOverlay";
    ov.className = "cfg-overlay hidden";
    ov.innerHTML =
      '<div class="cfg-panel">' +
        '<div class="cfg-head"><h2>⚙ Konfiguration</h2><button class="ghost-btn btn-sm" id="cfgCloseBtn">✕ Schließen</button></div>' +
        '<div class="cfg-body">' +
          '<div class="cfg-section"><h3>Kategorien (Asset-Typen)</h3>' +
            '<p class="cfg-note">Kategorien umbenennen, ergänzen oder löschen. Feldtypen: text, textarea, select (Werte kommagetrennt), boolean, tags. Achtung: Wird ein Schlüssel geändert, verlieren vorhandene Assets dieser Kategorie ihre Feld-Zuordnung.</p>' +
            '<div id="cfgCats"></div>' +
            '<button class="ghost-btn btn-sm" id="cfgAddCat">+ Kategorie hinzufügen</button></div>' +
          '<div class="cfg-section"><h3>Basisfelder (für alle Kategorien)</h3>' +
            '<p class="cfg-note">Name und Kategorie sind fest. Die fünf Standard-Basisfelder (Status, Beschreibung, Verantwortlicher, Schutzbedarf, Tags) können umbenannt werden; neue Basisfelder sind frei ergänzbar.</p>' +
            '<div id="cfgBase"></div>' +
            '<button class="ghost-btn btn-sm" id="cfgAddBase">+ Basisfeld hinzufügen</button></div>' +
          '<div class="cfg-section"><h3>Status-Werte</h3><div id="cfgStatusList"></div>' +
            '<button class="ghost-btn btn-sm" id="cfgAddStatus">+ Status hinzufügen</button></div>' +
          '<div class="cfg-section"><h3>Schutzbedarf-Werte</h3><div id="cfgCritList"></div>' +
            '<button class="ghost-btn btn-sm" id="cfgAddCrit">+ Schutzbedarf hinzufügen</button></div>' +
          '<div class="cfg-section"><h3>Konfiguration exportieren / importieren</h3>' +
            '<p class="cfg-note">Gesamte Konfiguration als JSON – zum Sichern oder Übernehmen auf anderen Geräten.</p>' +
            '<textarea class="cfg-io" id="cfgIO" placeholder="Export zeigt die Konfiguration hier an – oder eigenes JSON einfügen und „Übernehmen“ klicken."></textarea>' +
            '<div style="display:flex;gap:8px;margin-top:6px;">' +
              '<button class="ghost-btn btn-sm" id="cfgExport">↓ Exportieren</button>' +
              '<button class="ghost-btn btn-sm" id="cfgImport">↑ Übernehmen</button></div></div>' +
        '</div>' +
        '<div class="cfg-foot">' +
          '<button class="danger-btn" id="cfgReset">Auf Standard zurücksetzen</button>' +
          '<span style="flex:1"></span>' +
          '<button class="ghost-btn" id="cfgCancel">Abbrechen</button>' +
          '<button class="primary-btn" id="cfgSave">Konfiguration speichern</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    document.getElementById("cfgCloseBtn").addEventListener("click", closeConfig);
    document.getElementById("cfgCancel").addEventListener("click", closeConfig);
    ov.addEventListener("mousedown", e => { if (e.target === ov) closeConfig(); });
    document.getElementById("cfgAddCat").addEventListener("click", () => {
      draft.types.push({ key: "kategorie" + (draft.types.length + 1), label: "Neue Kategorie", color: "#6b7280", fields: [] });
      renderEditor();
    });
    document.getElementById("cfgAddBase").addEventListener("click", () => {
      draft.baseFields.push({ key: "feld" + (draft.baseFields.length + 1), label: "Neues Feld", type: "text", options: [] });
      renderEditor();
    });
    document.getElementById("cfgAddStatus").addEventListener("click", () => {
      draft.statuses.push({ key: "neu" + (draft.statuses.length + 1), label: "Neuer Status" });
      renderEditor();
    });
    document.getElementById("cfgAddCrit").addEventListener("click", () => {
      draft.criticalities.push({ key: "neu" + (draft.criticalities.length + 1), label: "Neuer Schutzbedarf", color: "#6b7280" });
      renderEditor();
    });
    document.getElementById("cfgExport").addEventListener("click", () => {
      document.getElementById("cfgIO").value = JSON.stringify(draft, null, 2);
    });
    document.getElementById("cfgImport").addEventListener("click", () => {
      try {
        const parsed = JSON.parse(document.getElementById("cfgIO").value);
        if (!parsed.types || !Array.isArray(parsed.types)) throw new Error("Ungültiges Format");
        draft = Object.assign(deep(DEFAULT_CONFIG), parsed);
        renderEditor();
        toast("Übernommen – noch speichern!");
      } catch (e) { alert("Import fehlgeschlagen: " + e.message); }
    });
    document.getElementById("cfgReset").addEventListener("click", () => {
      if (!confirm("Konfiguration auf Standardwerte zurücksetzen? Bestehende Asset-Daten bleiben erhalten.")) return;
      draft = deep(DEFAULT_CONFIG);
      renderEditor();
    });
    document.getElementById("cfgSave").addEventListener("click", applyConfig);
  }

  function openConfig() {
    draft = deep(config);
    renderEditor();
    document.getElementById("cfgOverlay").classList.remove("hidden");
  }
  function closeConfig() {
    document.getElementById("cfgOverlay").classList.add("hidden");
    draft = null;
  }

  function applyConfig() {
    const clean = arr => {
      const seen = new Set();
      arr.forEach(x => {
        let k = String(x.key || "key").trim().replace(/\s+/g, "_") || "key";
        while (seen.has(k)) k += "_2";
        seen.add(k); x.key = k;
      });
    };
    clean(draft.types); clean(draft.statuses); clean(draft.criticalities);
    draft.types.forEach(t => clean(t.fields));
    clean(draft.baseFields.filter(f => !BASE_MAP[f.key]));

    config = draft;
    saveConfig();
    closeConfig();

    renderPills();
    renderAssets();
    if (selectedId) {
      const a = assets.find(x => x.id === selectedId);
      if (a) selectAsset(a.id);
    }
    toast("Konfiguration gespeichert");
  }

  function typeOpts() { return ["text", "textarea", "select", "boolean", "tags"]; }

  function renderEditor() {
    // ---- Kategorien ----
    const cats = document.getElementById("cfgCats");
    cats.innerHTML = "";
    draft.types.forEach((t, ti) => {
      const div = document.createElement("div");
      div.className = "cfg-cat";
      div.innerHTML =
        '<div class="cfg-cat-head">' +
          '<input type="text" data-cat="' + ti + '" data-prop="label" value="' + esc(t.label) + '" placeholder="Kategorie-Name">' +
          '<input type="text" data-cat="' + ti + '" data-prop="key" value="' + esc(t.key) + '" placeholder="Schlüssel">' +
          '<input type="color" data-cat="' + ti + '" data-prop="color" value="' + (t.color || "#6b7280") + '" title="Farbe">' +
          '<button class="cfg-danger" data-delcat="' + ti + '">Kategorie löschen</button>' +
        '</div>' +
        '<div class="cfg-fields-title">Felder der Kategorie „' + esc(t.label) + '“</div>';
      cats.appendChild(div);

      t.fields.forEach((f, fi) => {
        const row = document.createElement("div");
        row.className = "cfg-row";
        row.innerHTML =
          '<input type="text" class="cfg-f-label" data-cat="' + ti + '" data-fld="' + fi + '" data-prop="label" value="' + esc(f.label) + '" placeholder="Feld-Name">' +
          '<input type="text" class="cfg-f-key" data-cat="' + ti + '" data-fld="' + fi + '" data-prop="key" value="' + esc(f.key) + '" placeholder="Schlüssel">' +
          '<select class="cfg-f-type" data-cat="' + ti + '" data-fld="' + fi + '" data-prop="type">' +
            typeOpts().map(x => '<option value="' + x + '"' + (f.type === x ? " selected" : "") + ">" + x + "</option>").join("") +
          '</select>' +
          '<input type="text" class="cfg-f-opts" data-cat="' + ti + '" data-fld="' + fi + '" data-prop="options" value="' + esc((f.options || []).join(", ")) + '" placeholder="Auswahl-Werte, kommagetrennt">' +
          '<button class="cfg-danger" data-delfld="' + ti + '" data-fdel="' + fi + '">✕</button>';
        div.appendChild(row);
      });

      const addF = document.createElement("button");
      addF.className = "ghost-btn btn-sm";
      addF.textContent = "+ Feld hinzufügen";
      addF.addEventListener("click", () => {
        t.fields.push({ key: "feld" + (t.fields.length + 1), label: "Neues Feld", type: "text", options: [] });
        renderEditor();
      });
      div.appendChild(addF);
    });

    // ---- Basisfelder ----
    const base = document.getElementById("cfgBase");
    base.innerHTML = "";
    draft.baseFields.forEach((f, fi) => {
      const fixed = !!BASE_MAP[f.key];
      const row = document.createElement("div");
      row.className = "cfg-row";
      row.innerHTML =
        '<input type="text" class="cfg-f-label" data-base="' + fi + '" data-prop="label" value="' + esc(f.label) + '" placeholder="Feld-Name">' +
        '<input type="text" class="cfg-f-key" data-base="' + fi + '" data-prop="key" value="' + esc(f.key) + '" placeholder="Schlüssel"' + (fixed ? " title=\"Fester Standardschlüssel\"" : "") + '>' +
        '<select class="cfg-f-type" data-base="' + fi + '" data-prop="type">' +
          typeOpts().map(x => '<option value="' + x + '"' + (f.type === x ? " selected" : "") + ">" + x + "</option>").join("") +
        '</select>' +
        '<input type="text" class="cfg-f-opts" data-base="' + fi + '" data-prop="options" value="' + esc((f.options || []).join(", ")) + '" placeholder="Auswahl-Werte, kommagetrennt"' + (fixed ? " disabled" : "") + '>' +
        (fixed ? "" : '<button class="cfg-danger" data-delbase="' + fi + '">✕</button>');
      base.appendChild(row);
    });

    // ---- Status ----
    const st = document.getElementById("cfgStatusList");
    st.innerHTML = "";
    draft.statuses.forEach((s, si) => {
      const row = document.createElement("div");
      row.className = "cfg-row";
      row.innerHTML =
        '<input type="text" class="cfg-f-label" data-status="' + si + '" data-prop="label" value="' + esc(s.label) + '" placeholder="Anzeigename">' +
        '<input type="text" class="cfg-f-key" data-status="' + si + '" data-prop="key" value="' + esc(s.key) + '" placeholder="Schlüssel">' +
        '<button class="cfg-danger" data-delstatus="' + si + '">✕</button>';
      st.appendChild(row);
    });

    // ---- Schutzbedarf ----
    const cr = document.getElementById("cfgCritList");
    cr.innerHTML = "";
    draft.criticalities.forEach((c, ci) => {
      const row = document.createElement("div");
      row.className = "cfg-row";
      row.innerHTML =
        '<input type="text" class="cfg-f-label" data-crit="' + ci + '" data-prop="label" value="' + esc(c.label) + '" placeholder="Anzeigename">' +
        '<input type="text" class="cfg-f-key" data-crit="' + ci + '" data-prop="key" value="' + esc(c.key) + '" placeholder="Schlüssel">' +
        '<input type="color" data-crit="' + ci + '" data-prop="color" value="' + (c.color || "#6b7280") + '">' +
        '<button class="cfg-danger" data-delcrit="' + ci + '">✕</button>';
      cr.appendChild(row);
    });

    bindEditor();
  }

  function bindEditor() {
    const ov = document.getElementById("cfgOverlay");

    ov.querySelectorAll("input, select").forEach(el => {
      const handler = () => {
        const d = el.dataset;
        const val = (d.prop === "options")
          ? el.value.split(",").map(x => x.trim()).filter(Boolean)
          : el.value;
        if (d.cat !== undefined && d.fld !== undefined && d.prop) {
          draft.types[+d.cat].fields[+d.fld][d.prop] = val;
        } else if (d.cat !== undefined && d.prop) {
          draft.types[+d.cat][d.prop] = el.value;
        } else if (d.base !== undefined && d.prop) {
          const f = draft.baseFields[+d.base];
          if (d.prop === "key" && BASE_MAP[f.key]) return; // Standardschlüssel fix
          f[d.prop] = val;
        } else if (d.status !== undefined && d.prop) {
          draft.statuses[+d.status][d.prop] = el.value;
        } else if (d.crit !== undefined && d.prop) {
          draft.criticalities[+d.crit][d.prop] = el.value;
        }
      };
      el.oninput = handler;
      el.onchange = handler;
    });

    ov.querySelectorAll("[data-delcat]").forEach(b => b.onclick = () => {
      if (confirm("Kategorie löschen? Bestehende Assets dieser Kategorie bleiben erhalten.")) {
        draft.types.splice(+b.dataset.delcat, 1); renderEditor();
      }
    });
    ov.querySelectorAll("[data-delfld]").forEach(b => b.onclick = () => {
      draft.types[+b.dataset.delfld].fields.splice(+b.dataset.fdel, 1); renderEditor();
    });
    ov.querySelectorAll("[data-delbase]").forEach(b => b.onclick = () => {
      draft.baseFields.splice(+b.dataset.delbase, 1); renderEditor();
    });
    ov.querySelectorAll("[data-delstatus]").forEach(b => b.onclick = () => {
      draft.statuses.splice(+b.dataset.delstatus, 1); renderEditor();
    });
    ov.querySelectorAll("[data-delcrit]").forEach(b => b.onclick = () => {
      draft.criticalities.splice(+b.dataset.delcrit, 1); renderEditor();
    });
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  /* ---------------------------------------------------------
     API + INIT
  --------------------------------------------------------- */
  window.AssetConfig = { fill: fill, read: read };

  addTopbarButtons();
  buildOverlay();
  renderPills();
  renderAssets();
})();
