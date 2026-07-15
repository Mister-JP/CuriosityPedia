import fs from "node:fs";
import sharp from "sharp";

const elements = [];
const scenes = [];
let id = 0;
const C = {
  ink: "#15261f",
  muted: "#66736d",
  paper: "#f7f3ea",
  light: "#fffdf8",
  soft: "#edf2ee",
  line: "#bfc8c2",
  acid: "#dfff58",
  sky: "#a9d4ff",
  coral: "#ff8a76",
  coralSoft: "#ffd8d0",
  green: "#edffc1",
  greenInk: "#526800",
  violet: "#e8dcff",
};

function base(type, x, y, width, height, options = {}) {
  id += 1;
  return {
    id: `wd-mobile-tree-${id}`,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: options.strokeColor ?? C.ink,
    backgroundColor: options.backgroundColor ?? "transparent",
    fillStyle: "solid",
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.strokeStyle ?? "solid",
    roughness: options.roughness ?? 0.85,
    opacity: options.opacity ?? 100,
    groupIds: [],
    frameId: null,
    index: `a${id.toString(36)}`,
    roundness: options.roundness === false ? null : { type: 3 },
    seed: 64000 + id * 79,
    version: 1,
    versionNonce: 93000 + id * 103,
    isDeleted: false,
    boundElements: null,
    updated: 1784073600000,
    link: null,
    locked: false,
  };
}

function rect(x, y, width, height, options = {}) { elements.push(base("rectangle", x, y, width, height, options)); }
function ellipse(x, y, width, height, options = {}) { elements.push(base("ellipse", x, y, width, height, { ...options, roundness: false })); }
function text(x, y, value, size = 16, options = {}) {
  const lines = value.split("\n");
  elements.push({
    ...base("text", x, y, options.width ?? Math.max(...lines.map((line) => line.length)) * size * 0.56, options.height ?? lines.length * size * 1.24, { strokeColor: options.strokeColor, roughness: 0, roundness: false, opacity: options.opacity }),
    fontSize: size,
    fontFamily: 5,
    text: value,
    textAlign: options.textAlign ?? "left",
    verticalAlign: "top",
    containerId: null,
    originalText: value,
    autoResize: true,
    lineHeight: 1.24,
  });
}
function path(type, x, y, points, options = {}) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  elements.push({
    ...base(type, x, y, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), { ...options, roundness: false }),
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: type === "arrow" ? "arrow" : null,
    elbowed: false,
  });
}
const line = (x, y, points, options = {}) => path("line", x, y, points, options);
const arrow = (x, y, points, options = {}) => path("arrow", x, y, points, options);

function chip(x, y, label, fill, width, options = {}) {
  rect(x, y, width, 27, { backgroundColor: fill, strokeColor: options.strokeColor ?? C.ink, strokeWidth: 1 });
  text(x + 9, y + 7, label, 9, { strokeColor: options.textColor ?? C.ink });
}

function beginScene(name, title, subtitle, x, y) {
  const start = elements.length;
  text(x, y, title, 25);
  text(x, y + 38, subtitle, 13, { strokeColor: C.muted });
  rect(x, y + 78, 1320, 900, { backgroundColor: C.light, strokeColor: C.ink, strokeWidth: 3 });
  return { name, title, start, x, y, width: 1320, height: 1000 };
}

function endScene(scene) {
  scene.end = elements.length;
  scenes.push(scene);
}

function phone(x, y, title, meta) {
  rect(x, y, 430, 820, { backgroundColor: C.light, strokeColor: C.ink, strokeWidth: 3 });
  rect(x, y, 430, 50, { backgroundColor: "#ece8df", strokeColor: C.ink, strokeWidth: 1 });
  text(x + 20, y + 17, "WONDERDRIVE", 12);
  text(x + 378, y + 16, "•••", 10);
  rect(x, y + 50, 430, 76, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 1 });
  text(x + 18, y + 65, title, 16);
  text(x + 18, y + 94, meta, 9, { strokeColor: C.muted });
  return { x, y, cx: x + 215, top: y + 126, bottom: y + 820 };
}

function toolbar(x, y, options = {}) {
  rect(x, y, 430, 44, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
  text(x + 17, y + 14, options.left ?? "‹ LIBRARY", 9, { strokeColor: C.muted });
  chip(x + 140, y + 8, options.center ?? "FIT WIDTH", options.centerFill ?? C.soft, 90);
  text(x + 343, y + 14, options.right ?? "SEARCH", 9, { strokeColor: C.muted });
}

function vEdge(x, y, endY, options = {}) {
  line(x, y, [[0, 0], [0, endY - y]], { strokeColor: options.active ? C.ink : options.open ? C.greenInk : C.line, strokeWidth: options.active ? 4 : 2, strokeStyle: options.open ? "dashed" : "solid", opacity: options.dim ? 40 : 100 });
}

function fork(x, y, leftX, rightX, childY, options = {}) {
  const midY = y + 24;
  line(x, y, [[0,0],[0,24],[leftX-x,24],[leftX-x,childY-y]], { strokeColor: options.activeLeft ? C.ink : C.line, strokeWidth: options.activeLeft ? 4 : 2, opacity: options.dimLeft ? 40 : 100 });
  line(x, midY, [[0,0],[rightX-x,0],[rightX-x,childY-midY]], { strokeColor: options.activeRight ? C.ink : options.openRight ? C.greenInk : C.line, strokeWidth: options.activeRight ? 4 : 2, strokeStyle: options.openRight ? "dashed" : "solid", opacity: options.dimRight ? 40 : 100 });
}

function node(x, y, number, question, options = {}) {
  const w = options.width ?? 150;
  const h = options.height ?? 72;
  const fill = options.current ? C.sky : options.selected ? C.coralSoft : options.open ? C.green : C.light;
  const stroke = options.open ? C.greenInk : C.ink;
  rect(x, y, w, h, { backgroundColor: fill, strokeColor: stroke, strokeWidth: options.current || options.selected ? 3 : 1, strokeStyle: options.open ? "dashed" : "solid", opacity: options.dim ? 42 : 100 });
  ellipse(x + 10, y + 10, 26, 26, { backgroundColor: options.current ? C.acid : C.soft, strokeColor: stroke, strokeWidth: 1, opacity: options.dim ? 42 : 100 });
  text(x + 20, y + 17, String(number), 9, { opacity: options.dim ? 42 : 100 });
  text(x + 45, y + 11, options.open ? "OPEN PATH" : options.label ?? "TURN", 8, { strokeColor: options.open ? C.greenInk : C.muted, opacity: options.dim ? 42 : 100 });
  text(x + 10, y + 41, question, 11, { opacity: options.dim ? 42 : 100 });
}

function pile(x, y, title, count, options = {}) {
  const w = options.width ?? 142;
  rect(x + 8, y + 8, w, 70, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 1 });
  rect(x + 4, y + 4, w, 70, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 1 });
  rect(x, y, w, 70, { backgroundColor: options.active ? C.violet : C.light, strokeColor: C.ink, strokeWidth: 2 });
  text(x + 10, y + 11, title, 9);
  text(x + 10, y + 37, count, 9, { strokeColor: C.muted });
  text(x + w - 22, y + 27, "+", 15);
}

function haloBadge(x, y, label, direction = "up") {
  rect(x, y, 146, 32, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
  text(x + 12, y + 9, `${direction === "up" ? "↑" : "↓"} ${label}`, 9, { strokeColor: C.light });
}

function notePanel(x, y, title, body, rows = []) {
  rect(x, y, 600, 420, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 2 });
  text(x + 28, y + 28, title, 20);
  text(x + 28, y + 70, body, 13, { strokeColor: C.muted });
  rows.forEach((row, index) => {
    ellipse(x + 30, y + 137 + index * 72, 34, 34, { backgroundColor: index === 0 ? C.acid : C.light, strokeWidth: 1 });
    text(x + 43, y + 145 + index * 72, String(index + 1), 11);
    text(x + 80, y + 136 + index * 72, row[0], 12);
    text(x + 80, y + 159 + index * 72, row[1], 10, { strokeColor: C.muted });
  });
}

function principleBar(x, y, number, title, body) {
  rect(x, y, 1270, 76, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
  ellipse(x + 18, y + 18, 40, 40, { backgroundColor: C.acid, strokeColor: C.acid, strokeWidth: 1 });
  text(x + 33, y + 27, String(number), 12);
  text(x + 76, y + 14, title, 11, { strokeColor: C.acid });
  text(x + 76, y + 39, body, 11, { strokeColor: C.light });
}

// 01: vertical overview.
{
  const s = beginScene("01-vertical-tree-overview", "01 · ROTATE THE TREE, NOT THE PHONE", "The same directed tree runs top-to-bottom. Journey depth becomes natural vertical scrolling instead of horizontal drift.", 50, 35);
  const p = phone(s.x + 55, s.y + 110, "Journey tree", "Turn 8 of 12 · 7 open paths · Overview");
  toolbar(p.x, p.top, { center: "FIT WIDTH" });
  const top = p.top + 62;
  node(p.cx - 75, top, 1, "Cities and memory", { width:150 });
  fork(p.cx, top + 72, p.x + 95, p.x + 330, top + 126, { activeRight:true });
  pile(p.x + 28, top + 126, "FORGOTTEN PLACES", "6 turns · 4 open", { width:142 });
  node(p.x + 255, top + 126, 4, "Official memory", { width:150 });
  fork(p.x + 330, top + 198, p.x + 215, p.x + 355, top + 252, { activeRight:true, openRight:true });
  pile(p.x + 142, top + 252, "ARCHIVES", "8 turns · 3 open", { width:145 });
  node(p.x + 292, top + 252, 8, "Monuments disagree", { width:125, current:true });
  vEdge(p.x + 355, top + 324, top + 374, { active:true });
  node(p.x + 280, top + 374, 9, "Who renames a place?", { width:150, open:true });
  haloBadge(p.x + 18, p.y + 716, "DEPTH 5–12 BELOW", "down");
  rect(p.x, p.y + 770, 430, 50, { backgroundColor:C.light, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 35, p.y + 788, "OVERVIEW", 9);
  text(p.x + 170, p.y + 788, "YOU ARE HERE", 9);
  text(p.x + 330, p.y + 788, "OPEN 7", 9);
  notePanel(s.x + 535, s.y + 170, "Why it scales better", "Depth grows downward—the direction phones already scroll. Breadth is compressed deliberately rather than pushed off-screen.", [
    ["One orientation", "Root stays above descendants at every size."],
    ["No required sideways pan", "Fit width is the stable default viewport."],
    ["Hidden depth is explicit", "Edge badges show where more tree exists."],
  ]);
  principleBar(s.x + 25, s.y + 884, 1, "VERTICAL DEPTH IS THE MOBILE DEFAULT", "The hierarchy is unchanged; only its orientation responds to the screen.");
  endScene(s);
}

// 02: branch piles keep breadth bounded.
{
  const s = beginScene("02-folded-branch-tree", "02 · FOLD BREADTH WITHOUT FLATTENING THE TREE", "Distant subtrees remain attached to their real parents as branch piles with researched/open counts.", 1420, 35);
  const p = phone(s.x + 55, s.y + 110, "Journey tree", "58 turns · 31 open paths · Focus route");
  toolbar(p.x, p.top, { center:"FOCUS ROUTE", centerFill:C.ink });
  const top = p.top + 62;
  pile(p.x + 26, top + 40, "3 BRANCHES ABOVE", "18 turns · 11 open", { width:160 });
  node(p.x + 250, top + 40, 14, "Official memory", { width:150 });
  line(p.x + 330, top + 112, [[0,0],[0,42],[-118,42],[-118,96]], { strokeColor:C.ink, strokeWidth:4 });
  line(p.x + 212, top + 154, [[0,0],[-100,0],[-100,54]], { strokeColor:C.line, strokeWidth:2 });
  pile(p.x + 32, top + 208, "ARCHIVES & POWER", "9 turns · 6 open", { width:158 });
  node(p.x + 137, top + 208, 31, "Contested monuments", { width:170 });
  line(p.x + 222, top + 280, [[0,0],[0,50],[95,50],[95,104]], { strokeColor:C.ink, strokeWidth:4 });
  pile(p.x + 22, top + 384, "COUNTER-MEMORY", "10 turns · 6 open", { width:168 });
  node(p.x + 242, top + 384, 47, "Removal and memory", { width:165, current:true });
  haloBadge(p.x + 250, p.y + 716, "12 TURNS BELOW", "down");
  rect(p.x, p.y + 770, 430, 50, { backgroundColor:C.light, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 33, p.y + 788, "FULL TREE", 9);
  text(p.x + 164, p.y + 788, "FIT ROUTE", 9);
  text(p.x + 323, p.y + 788, "OPEN 31", 9);
  notePanel(s.x + 535, s.y + 170, "How a 58-turn tree fits", "Every hidden subtree has a visible anchor, name, and count. Expanding a pile replaces only that local region.", [
    ["Active route stays detailed", "The path being followed never collapses."],
    ["Side branches become piles", "They remain graph nodes—not a detached list."],
    ["Expansion is local", "Other depth bands keep their positions."],
  ]);
  principleBar(s.x + 25, s.y + 884, 2, "COMPRESSION PRESERVES PARENTHOOD", "A pile always sits on the same edge as the subtree it represents.");
  endScene(s);
}

// 03: explicit focus/re-root.
{
  const s = beginScene("03-focus-and-reroot", "03 · FOCUS A BRANCH DELIBERATELY", "A branch never jumps into place unexpectedly. Focus is an explicit action with breadcrumbs and a clear return path.", 50, 1085);
  const p = phone(s.x + 55, s.y + 116, "Archives & power", "Focused branch · 9 turns · from Turn 14");
  toolbar(p.x, p.top, { left:"‹ FULL TREE", center:"BRANCH 2/3", right:"SEARCH" });
  rect(p.x + 18, p.top + 55, 394, 38, { backgroundColor:C.soft, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 34, p.top + 68, "Root  ›  official memory  ›  archives & power", 9);
  haloBadge(p.x + 142, p.top + 108, "PARENT · TURN 14", "up");
  vEdge(p.cx, p.top + 140, p.top + 188, { active:true });
  node(p.x + 125, p.top + 188, 31, "Who controls archives?", { width:180, selected:true });
  fork(p.cx, p.top + 260, p.x + 105, p.x + 325, p.top + 322, { activeLeft:true, openRight:true });
  node(p.x + 28, p.top + 322, 32, "What gets preserved?", { width:154 });
  node(p.x + 250, p.top + 322, 33, "Who gets access?", { width:152, open:true });
  line(p.x + 105, p.top + 394, [[0,0],[0,42],[92,42],[92,92]], { strokeColor:C.ink, strokeWidth:4 });
  pile(p.x + 115, p.top + 486, "RECORDS BRANCH", "5 turns · 3 open", { width:165, active:true });
  rect(p.x, p.y + 770, 430, 50, { backgroundColor:C.light, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 40, p.y + 788, "BACK", 9);
  text(p.x + 180, p.y + 788, "FIT BRANCH", 9);
  text(p.x + 337, p.y + 788, "OVERVIEW", 9);
  notePanel(s.x + 535, s.y + 170, "Focus is a mode change", "The user chooses Focus branch. Only then does the selected subtree become the centered root of a bounded mobile view.", [
    ["Breadcrumb preserves ancestry", "The original location never becomes mysterious."],
    ["Parent remains visible", "The branch still feels connected to the full tree."],
    ["Return is persistent", "Full tree is always one tap away."],
  ]);
  principleBar(s.x + 25, s.y + 890, 3, "RE-ROOTING MUST BE EXPLICIT", "Changing spatial context is safe when the user initiates it and sees how to return.");
  endScene(s);
}

// 04: semantic zoom levels.
{
  const s = beginScene("04-semantic-zoom", "04 · ZOOM CHANGES DETAIL, NOT STRUCTURE", "The same top-down tree has three visual densities. Labels disappear before nodes become impossible to tap.", 1420, 1085);
  const p = phone(s.x + 55, s.y + 116, "Journey tree", "58 turns · Overview · 38% zoom");
  toolbar(p.x, p.top, { center:"38% · FIT", right:"FOCUS" });
  // Compact tree marks.
  const top = p.top + 70;
  ellipse(p.cx - 13, top, 26, 26, { backgroundColor:C.soft, strokeWidth:2 });
  text(p.cx - 4, top + 7, "1", 9);
  fork(p.cx, top + 26, p.x + 110, p.x + 320, top + 82, { activeRight:true });
  pile(p.x + 38, top + 82, "6 TURNS", "4 open", { width:140 });
  ellipse(p.x + 307, top + 82, 28, 28, { backgroundColor:C.soft, strokeWidth:2 });
  text(p.x + 317, top + 90, "4", 9);
  fork(p.x + 321, top + 110, p.x + 214, p.x + 348, top + 164, { activeRight:true });
  pile(p.x + 135, top + 164, "8 TURNS", "3 open", { width:150 });
  ellipse(p.x + 335, top + 164, 30, 30, { backgroundColor:C.acid, strokeWidth:3 });
  text(p.x + 346, top + 173, "8", 9);
  fork(p.x + 350, top + 194, p.x + 235, p.x + 365, top + 250, { activeRight:true, openRight:true });
  pile(p.x + 158, top + 250, "12 TURNS", "7 open", { width:155, active:true });
  ellipse(p.x + 352, top + 250, 30, 30, { backgroundColor:C.green, strokeColor:C.greenInk, strokeWidth:2 });
  text(p.x + 361, top + 259, "+", 11, { strokeColor:C.greenInk });
  rect(p.x + 24, top + 344, 382, 120, { backgroundColor:C.soft, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 44, top + 362, "SEMANTIC ZOOM", 9, { strokeColor:C.muted });
  text(p.x + 44, top + 392, "38%  Shape + route + counts", 11);
  text(p.x + 44, top + 421, "65%  Topics + short questions", 11);
  text(p.x + 44, top + 450, "100% Full turn cards + actions", 11);
  rect(p.x, p.y + 770, 430, 50, { backgroundColor:C.light, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 35, p.y + 788, "−", 12);
  text(p.x + 155, p.y + 788, "FIT WIDTH", 9);
  text(p.x + 340, p.y + 788, "+", 12);
  notePanel(s.x + 535, s.y + 170, "What never changes", "Hierarchy, direction, active route, selection, and touch area remain stable across zoom levels.", [
    ["Low zoom", "Markers and branch piles provide shape and scale."],
    ["Medium zoom", "Topic names and short questions appear."],
    ["High zoom", "Full cards expose answer and branch actions."],
  ]);
  principleBar(s.x + 25, s.y + 890, 4, "LEGIBILITY WINS OVER COMPLETENESS", "At overview scale, compact truthful marks are better than microscopic cards.");
  endScene(s);
}

// 05: selected turn and branch preview.
{
  const s = beginScene("05-selected-turn-and-branch", "05 · ACT INSIDE THE TREE", "Selecting and branching preserve the vertical hierarchy. Details rise from the bottom only after the tree establishes context.", 50, 2135);
  const p = phone(s.x + 55, s.y + 116, "Journey tree", "Turn 8 selected · 2 open directions");
  toolbar(p.x, p.top, { center:"YOU ARE HERE", centerFill:C.acid });
  haloBadge(p.x + 142, p.top + 58, "3 ANCESTORS ABOVE", "up");
  vEdge(p.cx, p.top + 90, p.top + 132, { active:true });
  node(p.x + 125, p.top + 132, 8, "When monuments disagree", { width:180, current:true });
  fork(p.cx, p.top + 204, p.x + 105, p.x + 325, p.top + 262, { activeLeft:true, openRight:true });
  node(p.x + 25, p.top + 262, 9, "Who renames a place?", { width:158, open:true });
  node(p.x + 245, p.top + 262, 10, "Can removal repair?", { width:160, open:true });
  // Ghost child after option selection.
  line(p.x + 105, p.top + 334, [[0,0],[0,35],[110,35],[110,73]], { strokeColor:C.greenInk, strokeWidth:2, strokeStyle:"dashed" });
  rect(p.x + 128, p.top + 407, 176, 68, { backgroundColor:C.green, strokeColor:C.greenInk, strokeWidth:2, strokeStyle:"dashed" });
  text(p.x + 142, p.top + 420, "NEW TURN PREVIEW", 8, { strokeColor:C.greenInk });
  text(p.x + 142, p.top + 444, "Research appears here", 11);
  // Partial sheet leaves selected neighborhood visible.
  rect(p.x, p.y + 625, 430, 195, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:2 });
  rect(p.x + 165, p.y + 637, 100, 5, { backgroundColor:C.line, strokeColor:C.line, strokeWidth:1 });
  text(p.x + 20, p.y + 660, "START A BRANCH FROM TURN 8?", 10, { strokeColor:"#d64b38" });
  text(p.x + 20, p.y + 691, "The current route stays intact.", 15);
  text(p.x + 20, p.y + 721, "One live research turn will create the ghost node above.", 10, { strokeColor:C.muted });
  rect(p.x + 20, p.y + 760, 245, 42, { backgroundColor:C.ink, strokeColor:C.ink, strokeWidth:1 });
  text(p.x + 78, p.y + 775, "START RESEARCH", 10, { strokeColor:C.light });
  text(p.x + 310, p.y + 776, "Cancel", 10);
  notePanel(s.x + 535, s.y + 170, "The action remains spatial", "The new turn is previewed as a child before confirmation. The sheet explains consequences without covering the parent and siblings.", [
    ["Context first", "Parent and two directions stay visible."],
    ["Ghost node", "The result's future location is concrete."],
    ["Partial sheet", "Action details do not replace the graph."],
  ]);
  principleBar(s.x + 25, s.y + 890, 5, "BRANCHING SHOULD FEEL LIKE GROWING THE TREE", "The interface previews the structural change before it spends or commits anything.");
  endScene(s);
}

const drawing = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: { gridSize: null, viewBackgroundColor: C.paper, currentItemFontFamily: 5 },
  files: {},
};

const outDir = "design/journey-graph-vision/mobile-v2";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/wonderdrive-mobile-tree-v2.excalidraw`, `${JSON.stringify(drawing, null, 2)}\n`);

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function svgFor(items, crop) {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `<rect width="${crop.width}" height="${crop.height}" fill="${C.paper}"/>`,
    '<style>text{font-family:Arial,Helvetica,sans-serif}</style>',
    `<g transform="translate(${-crop.x} ${-crop.y})">`,
  ];
  for (const item of items) {
    const fill = item.backgroundColor === "transparent" ? "none" : item.backgroundColor;
    const opacity = (item.opacity ?? 100) / 100;
    if (item.type === "rectangle") svg.push(`<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="${item.roundness ? 6 : 0}" fill="${fill}" stroke="${item.strokeColor}" stroke-width="${item.strokeWidth}" opacity="${opacity}" ${item.strokeStyle === "dashed" ? 'stroke-dasharray="8 6"' : ""}/>`);
    if (item.type === "ellipse") svg.push(`<ellipse cx="${item.x + item.width / 2}" cy="${item.y + item.height / 2}" rx="${item.width / 2}" ry="${item.height / 2}" fill="${fill}" stroke="${item.strokeColor}" stroke-width="${item.strokeWidth}" opacity="${opacity}"/>`);
    if (item.type === "line" || item.type === "arrow") {
      const pts = item.points.map((point) => `${item.x + point[0]},${item.y + point[1]}`).join(" ");
      svg.push(`<polyline points="${pts}" fill="none" stroke="${item.strokeColor}" stroke-width="${item.strokeWidth}" opacity="${opacity}" ${item.strokeStyle === "dashed" ? 'stroke-dasharray="8 6"' : ""}/>`);
      if (item.type === "arrow") {
        const point = item.points.at(-1);
        const ex = item.x + point[0];
        const ey = item.y + point[1];
        svg.push(`<path d="M${ex - 10},${ey - 7} L${ex},${ey} L${ex - 10},${ey + 7}" fill="none" stroke="${item.strokeColor}" stroke-width="${item.strokeWidth}"/>`);
      }
    }
    if (item.type === "text") {
      const lines = item.text.split("\n");
      svg.push(`<text x="${item.x}" y="${item.y + item.fontSize}" fill="${item.strokeColor}" font-size="${item.fontSize}" font-weight="${item.fontSize >= 20 ? 600 : 500}" opacity="${opacity}">${lines.map((lineText, index) => `<tspan x="${item.x}" dy="${index ? item.fontSize * 1.24 : 0}">${escapeXml(lineText)}</tspan>`).join("")}</text>`);
    }
  }
  svg.push("</g>", "</svg>");
  return svg.join("\n");
}

for (const scene of scenes) {
  const sceneItems = elements.slice(scene.start, scene.end);
  const crop = { x: scene.x - 20, y: scene.y - 20, width: scene.width + 40, height: scene.height + 40 };
  const svg = svgFor(sceneItems, crop);
  fs.writeFileSync(`${outDir}/${scene.name}.svg`, svg);
  await sharp(Buffer.from(svg)).flatten({ background:C.paper }).png().toFile(`${outDir}/${scene.name}.png`);
}

const fullSvg = svgFor(elements, { x:20, y:0, width:2770, height:3190 });
fs.writeFileSync(`${outDir}/wonderdrive-mobile-tree-v2.svg`, fullSvg);
await sharp(Buffer.from(fullSvg)).flatten({ background:C.paper }).png().toFile(`${outDir}/wonderdrive-mobile-tree-v2.png`);
console.log(`Created ${scenes.length} mobile tree states in ${outDir}`);
