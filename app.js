/* ---------------------------------------------------------
   ELEMENTE – Referenzen auf alle wichtigen DOM-Elemente
--------------------------------------------------------- */

const canvasEl = document.getElementById("canvas");
const detailEmptyEl = document.getElementById("detailEmpty");
const detailContentEl = document.getElementById("detailContent");
const layoutSelect = document.getElementById("layoutSelect");
const cardsLayer = document.getElementById("cardsLayer");

// Eingabefelder im Detailbereich (gemeinsam)
const fieldName = document.getElementById("fieldName");
const fieldType = document.getElementById("fieldType");
const fieldStatus = document.getElementById("fieldStatus");
const fieldDescription = document.getElementById("fieldDescription");
const fieldOwner = document.getElementById("fieldOwner");
const fieldCriticality = document.getElementById("fieldCriticality");
const fieldTags = document.getElementById("fieldTags");

// Link-UI
const fieldLinkSelect = document.getElementById("fieldLinkSelect");
const addLinkBtn = document.getElementById("addLinkBtn");
const linksListEl = document.getElementById("linksList");

// Titel im Detailbereich
const detailTitle = document.getElementById("detailTitle");
const detailSubtitle = document.getElementById("detailSubtitle");

// Kategorie-spezifische Felder
const sectionApplication = document.getElementById("sectionApplication");
const sectionSystem = document.getElementById("sectionSystem");
const sectionData = document.getElementById("sectionData");
const sectionProcess = document.getElementById("sectionProcess");

// Anwendung
const appTech = document.getElementById("appTech");
const appLicense = document.getElementById("appLicense");
const appVersion = document.getElementById("appVersion");
const appAuth = document.getElementById("appAuth");

// System
const sysOS = document.getElementById("sysOS");
const sysZone = document.getElementById("sysZone");
const sysIP = document.getElementById("sysIP");
const sysAuth = document.getElementById("sysAuth");
const sysLocation = document.getElementById("sysLocation");

// Daten
const dataPersonal = document.getElementById("dataPersonal");
const dataFormat = document.getElementById("dataFormat");
const dataStorage = document.getElementById("dataStorage");
const dataBackup = document.getElementById("dataBackup");

// Buttons
const addAssetBtn = document.getElementById("addAssetBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

// Suche + Filter
const searchInput = document.getElementById("searchInput");
const pillButtons = document.querySelectorAll(".pill");

const DRAG_THRESHOLD = 5;

/* ---------------------------------------------------------
   STATE – interner Zustand der Anwendung
--------------------------------------------------------- */

let assets = [];              // Liste aller Karten
let selectedId = null;        // ID des aktuell ausgewählten Assets

let dragInfo = null;          // Infos zum Karten-Dragging (Startposition, Asset-ID)
let hasDragged = false;       // verhindert Click-Events nach Drag
let currentFilter = "all";    // aktiver Filter (application/system/data/process/all)

let panDrag = null;           // Panning über Hintergrund: { startX, startY, snapshot: [{id,x,y}, ...] }
let zoom = 1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.3;

/* ---------------------------------------------------------
   STORAGE – Laden/Speichern in LocalStorage
--------------------------------------------------------- */

function loadFromStorage() {
  const raw = localStorage.getItem("assetmap-data");

  if (!raw) {
    // Demo-Daten im neuen Modell (type + specifics)
    assets = [
      {
        id: "erp",
        name: "ERP-System",
        description: "Zentrales Warenwirtschafts- und Buchhaltungssystem",
        type: "application",
        status: "aktiv",
        owner: "Müller",
        criticality: "high",
        tags: ["Kern"],
        links: ["sql"],
        x: 80,
        y: 80,
        specifics: {
          technologie: "Java/Spring",
          lizenz: "Proprietär",
          version: "3.2.1",
          authentifizierung: "SSO"
        }
      },
      {
        id: "sql",
        name: "SQL-Datenbank",
        description: "Produktivdatenbank für ERP",
        type: "data",
        status: "aktiv",
        owner: "ABC IT",
        criticality: "high",
        tags: ["Produktiv"],
        links: ["erp"],
        x: 360,
        y: 120,
        specifics: {
          personenbezogen: true,
          datenformat: "SQL",
          speicherort: "db-server-01",
          backup: "täglich"
        }
      },
      {
        id: "ldap",
        name: "Active Directory",
        description: "Zentrales Verzeichnisdienst",
        type: "system",
        status: "aktiv",
        owner: "IT-Betrieb",
        criticality: "medium",
        tags: ["Infrastruktur"],
        links: ["erp"],
        x: 200,
        y: 260,
        specifics: {
          betriebssystem: "Windows Server",
          netzwerkzone: "Intern",
          ip: "10.0.0.5",
          authentifizierung: "Kerberos/AD",
          standort: "Rechenzentrum A"
        }
      }
    ];
    saveToStorage();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    // einfache Migration: falls alte Struktur ohne specifics existiert, adaptieren
    assets = parsed.map(a => {
      if (!a.specifics) a.specifics = {};
      // normalize property names: older versions used 'owner' etc. keep as is
      return a;
    });
  } catch (e) {
    console.error("Fehler beim Laden der Daten:", e);
    assets = [];
  }
}

function saveToStorage() {
  localStorage.setItem("assetmap-data", JSON.stringify(assets));
}

/* ---------------------------------------------------------
   FILTERCHECK – bestimmt, ob ein Asset sichtbar ist
--------------------------------------------------------- */

function isVisibleInFilter(asset) {
  const matchesType = currentFilter === "all" || asset.type === currentFilter;

  const search = (searchInput.value || "").toLowerCase();
  const matchesSearch =
    !search ||
    (asset.name || "").toLowerCase().includes(search) ||
    (asset.owner || "").toLowerCase().includes(search) ||
    (asset.tags || []).join(" ").toLowerCase().includes(search);

  return matchesType && matchesSearch;
}

/* ---------------------------------------------------------
   Layout der Karten
--------------------------------------------------------- */

layoutSelect.addEventListener("change", () => {
  const mode = layoutSelect.value;
  if (!mode) return;

  autoLayout(mode);
  saveToStorage();
  renderAssets();
});

function autoLayout(mode) {
  const visible = assets; // wir ordnen ALLE Karten an, nicht nur gefilterte

  const count = visible.length;
  const width = 1200;
  const height = 800;

  if (mode === "grid") {
    const cols = Math.ceil(Math.sqrt(count));
    const spacingX = width / (cols + 1);
    const spacingY = height / (cols + 1);

    visible.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      a.x = 80 + col * spacingX;
      a.y = 80 + row * spacingY;
    });
  }

  if (mode === "circle") {
    const radius = Math.min(width, height) / 2.5;
    const centerX = width / 2;
    const centerY = height / 2;

    visible.forEach((a, i) => {
      const angle = (i / count) * Math.PI * 2;
      a.x = centerX + Math.cos(angle) * radius;
      a.y = centerY + Math.sin(angle) * radius;
    });
  }

  if (mode === "links") {
    visible.forEach(a => {
      const degree = (a.links || []).length;
      a.x = width / 2 + (Math.random() - 0.5) * (400 - degree * 20);
      a.y = height / 2 + (Math.random() - 0.5) * (400 - degree * 20);
    });
  }
}

/* ---------------------------------------------------------
   VISUELLE LINKS – zeichnet die blauen Verbindungslinien (SVG)
--------------------------------------------------------- */

function renderLinksVisual() {
  const svg = document.getElementById("linksSvg");
  const cardsLayer = document.getElementById("cardsLayer");
  if (!svg || !cardsLayer) return;

  svg.innerHTML = "";

  if (!selectedId) return;

  const asset = assets.find(a => a.id === selectedId);
  if (!asset) return;

  const canvasRect = cardsLayer.getBoundingClientRect();

  (asset.links || []).forEach(linkId => {
    const target = assets.find(a => a.id === linkId);
    if (!target || !isVisibleInFilter(target)) return;

    const cardA = document.querySelector(`.asset-card[data-id="${asset.id}"]`);
    const cardB = document.querySelector(`.asset-card[data-id="${target.id}"]`);
    if (!cardA || !cardB) return;

    const rectA = cardA.getBoundingClientRect();
    const rectB = cardB.getBoundingClientRect();

    const x1 = rectA.left + rectA.width / 2 - canvasRect.left;
    const y1 = rectA.top + rectA.height / 2 - canvasRect.top;
    const x2 = rectB.left + rectB.width / 2 - canvasRect.left;
    const y2 = rectB.top + rectB.height / 2 - canvasRect.top;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#1d4ed8");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("opacity", "0.7");

    svg.appendChild(line);
  });
}

/* ---------------------------------------------------------
   RENDERING DER KARTEN – erzeugt die visuellen Asset-Karten
--------------------------------------------------------- */

function renderAssets() {
  cardsLayer.innerHTML = "";

  assets
    .filter(isVisibleInFilter)
    .forEach(asset => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.style.left = asset.x + "px";
      card.style.top = asset.y + "px";
      card.dataset.id = asset.id;

      if (asset.id === selectedId) {
        card.classList.add("selected");
      }

      // Header (Titel + Tags)
      const header = document.createElement("div");
      header.className = "asset-card-header";

      const title = document.createElement("div");
      title.className = "asset-card-title";
      title.textContent = asset.name || "—";

      const tags = document.createElement("div");
      tags.className = "asset-card-tags";

      // Typ-Tag
      const typeTag = document.createElement("span");
      typeTag.className = "tag tag-" + asset.type;
      typeTag.textContent =
        asset.type === "application" ? "App" :
        asset.type === "system" ? "System" :
        asset.type === "data" ? "Daten" :
        "Prozess";

      // Kritikalität-Tag
      const critTag = document.createElement("span");
      critTag.className =
        "tag " +
        (asset.criticality === "high"
          ? "tag-critical-high"
          : asset.criticality === "medium"
          ? "tag-critical-medium"
          : "tag-critical-low");
      critTag.textContent =
        asset.criticality === "high" ? "Hoch" :
        asset.criticality === "medium" ? "Mittel" : "Niedrig";

      tags.appendChild(typeTag);
      tags.appendChild(critTag);

      header.appendChild(title);
      header.appendChild(tags);

      // Owner-Zeile
      const row = document.createElement("div");
      row.className = "asset-card-row";
      row.innerHTML = `<span>Owner:</span><span>${asset.owner || "-"}</span>`;

      card.appendChild(header);
      card.appendChild(row);

      // Dragging starten
      card.addEventListener("mousedown", e => {
        e.stopPropagation();
        selectAsset(asset.id);
        hasDragged = false;

        dragInfo = {
          id: asset.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: asset.x,
          origY: asset.y
        };
      });

      cardsLayer.appendChild(card);
    });

  renderLinksVisual();
}

/* ---------------------------------------------------------
   GLOBAL DRAG HANDLER – Karten ziehen & Hintergrund-Panning
--------------------------------------------------------- */

document.addEventListener("mousemove", e => {
  // Hintergrund-Panning
  if (panDrag && !dragInfo) {
    const dx = e.clientX - panDrag.startX;
    const dy = e.clientY - panDrag.startY;

    panDrag.snapshot.forEach(snap => {
      const asset = assets.find(a => a.id === snap.id);
      if (!asset) return;
      asset.x = snap.x + dx;
      asset.y = snap.y + dy;
    });

    renderAssets();
    return;
  }

  if (!dragInfo) return;

  const asset = assets.find(a => a.id === dragInfo.id);
  if (!asset) return;

  const dx = e.clientX - dragInfo.startX;
  const dy = e.clientY - dragInfo.startY;

  if (!hasDragged && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    hasDragged = true;
  }

  asset.x = dragInfo.origX + dx;
  asset.y = dragInfo.origY + dy;

  const card = document.querySelector(`.asset-card[data-id="${asset.id}"]`);
  if (card) {
    card.style.left = asset.x + "px";
    card.style.top = asset.y + "px";
  }

  requestAnimationFrame(renderLinksVisual);
});

document.addEventListener("mouseup", () => {
  if (dragInfo && hasDragged) {
    saveToStorage();
  }
  dragInfo = null;

  if (panDrag) {
    saveToStorage();
  }
  panDrag = null;
});

/* ---------------------------------------------------------
   BIDIREKTIONALE LINKS – Verknüpfungen zwischen Assets
--------------------------------------------------------- */

function addLink(a, b) {
  const A = assets.find(x => x.id === a);
  const B = assets.find(x => x.id === b);
  if (!A || !B) return;

  if (!A.links.includes(b)) A.links.push(b);
  if (!B.links.includes(a)) B.links.push(a);
}

function removeLink(a, b) {
  const A = assets.find(x => x.id === a);
  const B = assets.find(x => x.id === b);
  if (!A || !B) return;

  A.links = A.links.filter(id => id !== b);
  B.links = B.links.filter(id => id !== a);
}

/* ---------------------------------------------------------
   LINKS UI – Dropdown + Liste der bestehenden Links
--------------------------------------------------------- */

function renderLinksUI(asset) {
  // Dropdown für neue Links
  fieldLinkSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "– Ziel auswählen –";
  fieldLinkSelect.appendChild(placeholder);

  assets.forEach(a => {
    if (a.id === asset.id) return;
    if ((asset.links || []).includes(a.id)) return;

    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name || a.id;
    fieldLinkSelect.appendChild(opt);
  });

  // Liste der bestehenden Links
  linksListEl.innerHTML = "";

  (asset.links || []).forEach(linkId => {
    const target = assets.find(a => a.id === linkId);
    if (!target) return;

    const li = document.createElement("li");
    li.textContent = target.name || target.id;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      removeLink(asset.id, linkId);
      saveToStorage();
      renderLinksUI(asset);
      renderLinksVisual();
      renderAssets();
    });

    li.appendChild(removeBtn);
    linksListEl.appendChild(li);
  });
}

/* ---------------------------------------------------------
   SELECTION – Asset auswählen oder Auswahl löschen
--------------------------------------------------------- */

function updateSpecificSections(type) {
  sectionApplication.classList.add("hidden");
  sectionSystem.classList.add("hidden");
  sectionData.classList.add("hidden");
  sectionProcess.classList.add("hidden");

  if (type === "application") sectionApplication.classList.remove("hidden");
  if (type === "system") sectionSystem.classList.remove("hidden");
  if (type === "data") sectionData.classList.remove("hidden");
  if (type === "process") sectionProcess.classList.remove("hidden");
}

function selectAsset(id) {
  selectedId = id;
  const asset = assets.find(a => a.id === id);
  if (!asset) return;

  detailEmptyEl.style.display = "none";
  detailContentEl.classList.remove("hidden");

  // Gemeinsame Felder befüllen
  fieldName.value = asset.name || "";
  fieldType.value = asset.type || "application";
  fieldStatus.value = asset.status || "aktiv";
  fieldDescription.value = asset.description || "";
  fieldOwner.value = asset.owner || "";
  fieldCriticality.value = asset.criticality || "medium";
  fieldTags.value = (asset.tags || []).join(", ");

  // Titel aktualisieren
  detailTitle.textContent = asset.name || "—";
  detailSubtitle.textContent =
    (asset.type === "application"
      ? "Anwendung"
      : asset.type === "system"
      ? "System"
      : asset.type === "data"
      ? "Daten"
      : "Prozess") + " · " + (asset.owner || "kein Verantwortlicher");

  // Kategorie-spezifische Sektion anzeigen und Felder füllen
  updateSpecificSections(asset.type);

  const s = asset.specifics || {};

  // Anwendung
  appTech.value = s.technologie || "";
  appLicense.value = s.lizenz || "";
  appVersion.value = s.version || "";
  appAuth.value = s.authentifizierung || "";

  // System
  sysOS.value = s.betriebssystem || "";
  sysZone.value = s.netzwerkzone || "";
  sysIP.value = s.ip || "";
  sysAuth.value = s.authentifizierung || "";
  sysLocation.value = s.standort || "";

  // Daten
  dataPersonal.checked = !!s.personenbezogen;
  dataFormat.value = s.datenformat || "";
  dataStorage.value = s.speicherort || "";
  dataBackup.value = s.backup || "";
  
  AssetConfig.fill(asset);
  renderLinksUI(asset);
  renderAssets();
}

function clearSelection() {
  selectedId = null;
  detailContentEl.classList.add("hidden");
  detailEmptyEl.style.display = "flex";

  linksListEl.innerHTML = "";
  fieldLinkSelect.innerHTML = "";

  renderAssets();
}

/* ---------------------------------------------------------
   UI EVENTS – Buttons, Suche, Filter, Panning-Start
--------------------------------------------------------- */

cardsLayer.addEventListener("mousedown", e => {
  // Wenn auf eine Karte geklickt wurde → kein Panning
  if (e.target.classList.contains("asset-card") || e.target.closest(".asset-card")) {
    return;
  }

  panDrag = {
    startX: e.clientX,
    startY: e.clientY,
    snapshot: assets.map(a => ({ id: a.id, x: a.x, y: a.y }))
  };
});

cardsLayer.addEventListener("wheel", e => {
  e.preventDefault();

  const zoomFactor = e.deltaY < 0 ? 1.01 : 0.99;
  const newZoom = zoom * zoomFactor;

  if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
    return;
  }

  const oldZoom = zoom;
  zoom = newZoom;

  const rect = cardsLayer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldX = mouseX / oldZoom;
  const worldY = mouseY / oldZoom;

  assets.forEach(a => {
    a.x = worldX + (a.x - worldX) * (zoom / oldZoom);
    a.y = worldY + (a.y - worldY) * (zoom / oldZoom);
  });

  renderAssets();
  saveToStorage();
}, { passive: false });

// Neue Karte hinzufügen
addAssetBtn.addEventListener("click", () => {
  const id = "asset-" + Date.now();
  const newAsset = {
    id,
    name: "Neue Karte",
    description: "",
    type: "application",
    status: "aktiv",
    owner: "",
    criticality: "medium",
    tags: [],
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    links: [],
    specifics: {}
  };
  assets.push(newAsset);
  saveToStorage();
  renderAssets();
  selectAsset(id);
});

// Änderungen speichern
saveBtn.addEventListener("click", () => {
  if (!selectedId) return;
  const asset = assets.find(a => a.id === selectedId);
  if (!asset) return;

  asset.name = fieldName.value.trim();
  asset.type = fieldType.value;
  asset.status = fieldStatus.value;
  asset.description = fieldDescription.value.trim();
  asset.owner = fieldOwner.value.trim();
  asset.criticality = fieldCriticality.value;
  asset.tags = (fieldTags.value || "").split(",").map(t => t.trim()).filter(t => t);

  // specifics neu setzen je nach Typ
  asset.specifics = {};

  if (asset.type === "application") {
    asset.specifics = {
      technologie: appTech.value.trim(),
      lizenz: appLicense.value.trim(),
      version: appVersion.value.trim(),
      authentifizierung: appAuth.value.trim()
    };
  }

  if (asset.type === "system") {
    asset.specifics = {
      betriebssystem: sysOS.value.trim(),
      netzwerkzone: sysZone.value.trim(),
      ip: sysIP.value.trim(),
      authentifizierung: sysAuth.value.trim(),
      standort: sysLocation.value.trim()
    };
  }

  if (asset.type === "data") {
    asset.specifics = {
      personenbezogen: !!dataPersonal.checked,
      datenformat: dataFormat.value.trim(),
      speicherort: dataStorage.value.trim(),
      backup: dataBackup.value.trim()
    };
  }

  if (asset.type === "process") {
    asset.specifics = {};
  }
  AssetConfig.read(asset); 
  saveToStorage();
  selectAsset(asset.id);
});

// Karte löschen
deleteBtn.addEventListener("click", () => {
  if (!selectedId) return;

  const id = selectedId;

  // Links anderer Assets bereinigen
  assets.forEach(a => {
    a.links = (a.links || []).filter(x => x !== id);
  });

  // Asset entfernen
  assets = assets.filter(a => a.id !== id);

  saveToStorage();
  clearSelection();
});

// Link hinzufügen
addLinkBtn.addEventListener("click", () => {
  if (!selectedId) return;
  const asset = assets.find(a => a.id === selectedId);
  if (!asset) return;

  const targetId = fieldLinkSelect.value;
  if (!targetId) return;

  addLink(asset.id, targetId);
  saveToStorage();

  renderLinksUI(asset);
  renderLinksVisual();
  renderAssets();
});

// Suche
searchInput.addEventListener("input", () => {
  renderAssets();
  if (selectedId) {
    const asset = assets.find(a => a.id === selectedId);
    if (asset) renderLinksUI(asset);
  }
});

// Filter-Pills
pillButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    pillButtons.forEach(b => b.classList.remove("pill-active"));
    btn.classList.add("pill-active");

    currentFilter = btn.dataset.filter;

    renderAssets();
    if (selectedId) {
      const asset = assets.find(a => a.id === selectedId);
      if (asset) renderLinksUI(asset);
    }
  });
});

// Wenn Kategorie im Detail geändert wird, Sektionen anpassen
fieldType.addEventListener("change", () => {
  updateSpecificSections(fieldType.value);
});

/* ---------------------------------------------------------
   INIT – Anwendung starten
--------------------------------------------------------- */

loadFromStorage();
renderAssets();
