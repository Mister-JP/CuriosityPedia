import fs from "node:fs";
import sharp from "sharp";

const all = [];
const scenes = [];
let serial = 0;

const C = {
  ink: "#15261f",
  muted: "#66736d",
  paper: "#f7f3ea",
  light: "#fffdf8",
  line: "#bfc8c2",
  soft: "#edf2ee",
  acid: "#dfff58",
  sky: "#a9d4ff",
  coral: "#ff8a76",
  coralSoft: "#ffd8d0",
  green: "#edffc1",
  greenInk: "#526800",
  blueInk: "#235a86",
  violet: "#e8dcff",
};

function base(type, x, y, width, height, options = {}) {
  serial += 1;
  return {
    id: `wd-graph-${serial}`,
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
    groupIds: options.groupIds ?? [],
    frameId: null,
    index: `a${serial.toString(36)}`,
    roundness: options.roundness === false ? null : { type: 3 },
    seed: 51000 + serial * 73,
    version: 1,
    versionNonce: 81000 + serial * 101,
    isDeleted: false,
    boundElements: null,
    updated: 1784073600000,
    link: null,
    locked: false,
  };
}

function rect(x, y, width, height, options = {}) { all.push(base("rectangle", x, y, width, height, options)); }
function ellipse(x, y, width, height, options = {}) { all.push(base("ellipse", x, y, width, height, { ...options, roundness: false })); }
function text(x, y, value, size = 16, options = {}) {
  const lines = value.split("\n");
  all.push({
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
  all.push({
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
  rect(x, y, width, 28, { backgroundColor: fill, strokeColor: options.strokeColor ?? C.ink, strokeWidth: 1, opacity: options.opacity });
  text(x + 10, y + 7, label, 10, { strokeColor: options.textColor ?? C.ink, opacity: options.opacity });
}

function iconButton(x, y, label, width = 74, selected = false) {
  rect(x, y, width, 34, { backgroundColor: selected ? C.ink : C.light, strokeWidth: 1 });
  text(x + 10, y + 9, label, 10, { strokeColor: selected ? C.light : C.ink });
}

function beginScene(name, title, subtitle, x, y, width = 1580, height = 1010) {
  const start = all.length;
  text(x, y, title, 25);
  text(x, y + 38, subtitle, 13, { strokeColor: C.muted });
  const sx = x;
  const sy = y + 78;
  rect(sx, sy, width, height - 78, { backgroundColor: C.light, strokeWidth: 3, roughness: 1.2 });
  rect(sx, sy, width, 48, { backgroundColor: "#ece8df", strokeWidth: 1 });
  ellipse(sx + 18, sy + 18, 9, 9, { backgroundColor: "#ff7b67", strokeWidth: 1 });
  ellipse(sx + 36, sy + 18, 9, 9, { backgroundColor: "#ffd166", strokeWidth: 1 });
  ellipse(sx + 54, sy + 18, 9, 9, { backgroundColor: "#81d88d", strokeWidth: 1 });
  rect(sx + width / 2 - 230, sy + 12, 460, 23, { backgroundColor: "#ffffff", strokeColor: C.line, strokeWidth: 1 });
  text(sx + width / 2 - 79, sy + 18, "curiositypedia.app/journey", 9, { strokeColor: C.muted });
  return { name, start, x, y, sx, sy, width, height };
}

function endScene(scene) {
  scene.end = all.length;
  scenes.push(scene);
}

function appHeader(scene, meta = "12 turns · 7 open paths") {
  const { sx, sy, width } = scene;
  rect(sx, sy + 48, width, 70, { backgroundColor: C.light, strokeWidth: 1 });
  ellipse(sx + 24, sy + 65, 36, 36, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
  text(sx + 37, sy + 73, "C", 14, { strokeColor: C.light });
  text(sx + 73, sy + 68, "CuriosityPedia", 16);
  text(sx + 73, sy + 91, "SOURCE-BACKED LEARNING", 9, { strokeColor: C.muted });
  text(sx + width - 630, sy + 78, "NEW DRIVE", 9, { strokeColor: C.muted });
  text(sx + width - 525, sy + 78, "LIBRARY", 9, { strokeColor: C.muted });
  text(sx + width - 430, sy + 78, "COMPARE", 9, { strokeColor: C.muted });
  rect(sx + width - 275, sy + 63, 245, 40, { backgroundColor: C.soft, strokeWidth: 1 });
  text(sx + width - 258, sy + 75, meta, 10);
}

function graphToolbar(scene, options = {}) {
  const { sx, sy, width } = scene;
  const y = sy + 118;
  rect(sx, y, width, 62, { backgroundColor: C.soft, strokeWidth: 1 });
  text(sx + 24, y + 11, options.title ?? "Why do cities preserve some memories and erase others?", 14);
  text(sx + 24, y + 36, options.crumb ?? "Journey graph · You are at turn 8", 9, { strokeColor: C.muted });
  rect(sx + 560, y + 13, 330, 36, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
  text(sx + 578, y + 24, options.search ?? "Search turns, topics, or open paths", 10, { strokeColor: options.search ? C.ink : C.muted });
  iconButton(sx + width - 470, y + 14, options.filter ?? "OPEN 7", 78, options.filterSelected);
  iconButton(sx + width - 382, y + 14, "−", 36);
  iconButton(sx + width - 336, y + 14, "+", 36);
  iconButton(sx + width - 290, y + 14, "FIT ALL", 72);
  iconButton(sx + width - 208, y + 14, options.mode ?? "FOCUS", 74, options.modeSelected);
  iconButton(sx + width - 124, y + 14, "?", 36);
}

function turnNode(x, y, number, question, options = {}) {
  const w = options.width ?? 230;
  const h = options.height ?? 104;
  const fill = options.current ? C.sky : options.selected ? C.coralSoft : options.dim ? C.soft : C.light;
  const stroke = options.current || options.selected ? C.ink : C.line;
  const opacity = options.dim ? 44 : 100;
  rect(x, y, w, h, { backgroundColor: fill, strokeColor: stroke, strokeWidth: options.current || options.selected ? 3 : 1, opacity });
  ellipse(x + 12, y + 12, 28, 28, { backgroundColor: options.current ? C.acid : C.soft, strokeColor: stroke, strokeWidth: 1, opacity });
  text(x + 22, y + 19, String(number), 10, { opacity });
  text(x + 51, y + 13, options.topic ?? "PUBLIC MEMORY", 9, { strokeColor: C.muted, opacity });
  text(x + 14, y + 47, question, 14, { opacity });
  if (options.status) chip(x + 14, y + h - 30, options.status, options.statusFill ?? C.soft, options.statusWidth ?? 82, { opacity });
  if (options.count) text(x + w - 55, y + h - 23, options.count, 9, { strokeColor: C.muted, opacity });
}

function openNode(x, y, label, question, options = {}) {
  const w = options.width ?? 208;
  const h = options.height ?? 82;
  const opacity = options.dim ? 42 : 100;
  rect(x, y, w, h, { backgroundColor: C.green, strokeColor: C.greenInk, strokeWidth: 1, strokeStyle: "dashed", opacity });
  text(x + 12, y + 11, `+ OPEN · ${label}`, 9, { strokeColor: C.greenInk, opacity });
  text(x + 12, y + 36, question, 12, { opacity });
}

function clusterNode(x, y, label, turns, open, options = {}) {
  const w = options.width ?? 188;
  rect(x + 10, y + 10, w, 80, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 1 });
  rect(x + 5, y + 5, w, 80, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 1 });
  rect(x, y, w, 80, { backgroundColor: options.active ? C.violet : C.light, strokeColor: C.ink, strokeWidth: 2 });
  text(x + 14, y + 12, label, 11);
  text(x + 14, y + 38, `${turns} turns · ${open} open`, 10, { strokeColor: C.muted });
  text(x + w - 28, y + 31, "+", 16);
}

function edge(x, y, points, options = {}) {
  line(x, y, points, { strokeColor: options.active ? C.ink : options.open ? C.greenInk : C.line, strokeWidth: options.active ? 4 : 2, strokeStyle: options.open ? "dashed" : "solid", opacity: options.dim ? 35 : 100 });
  if (options.label) {
    const lx = x + (options.labelX ?? points[Math.floor(points.length / 2)][0]);
    const ly = y + (options.labelY ?? points[Math.floor(points.length / 2)][1]);
    text(lx, ly - 18, options.label, 9, { strokeColor: options.active ? C.ink : C.muted, opacity: options.dim ? 35 : 100 });
  }
}

function minimap(x, y, width = 205, height = 122, options = {}) {
  rect(x, y, width, height, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
  text(x + 10, y + 8, "OVERVIEW", 8, { strokeColor: C.muted });
  const pts = [[20,45],[54,32],[54,68],[88,20],[88,50],[88,82],[124,35],[124,66],[158,49]];
  for (const [px, py] of pts) ellipse(x + px, y + py, 8, 8, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
  line(x + 24, y + 49, [[0,0],[34,-13],[34,23],[68,-29],[68,1],[68,33],[104,-14],[104,17],[138,0]], { strokeColor: C.line, strokeWidth: 1 });
  rect(x + (options.viewportX ?? 72), y + (options.viewportY ?? 28), options.viewportW ?? 76, options.viewportH ?? 64, { backgroundColor: "transparent", strokeColor: C.coral, strokeWidth: 2 });
}

function noteBar(x, y, width, title, body, number) {
  rect(x, y, width, 78, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
  ellipse(x + 16, y + 18, 40, 40, { backgroundColor: C.acid, strokeColor: C.acid, strokeWidth: 1 });
  text(x + 31, y + 27, String(number), 13);
  text(x + 72, y + 15, title, 12, { strokeColor: C.acid });
  text(x + 72, y + 39, body, 11, { strokeColor: C.light });
}

// 01 — overview.
{
  const s = beginScene("01-whole-tree-overview", "01 · THE WHOLE JOURNEY IS A REAL GRAPH", "Default state: stable left-to-right tree, active route emphasized, every open question attached to its parent.", 60, 40);
  appHeader(s);
  graphToolbar(s, { mode: "OVERVIEW", modeSelected: true });
  const gx = s.sx + 25;
  const gy = s.sy + 205;
  edge(gx + 230, gy + 315, [[0,0],[75,0],[75,-215],[150,-215]], { active:true, label:"A · archaeology" });
  edge(gx + 230, gy + 315, [[0,0],[75,0],[75,215],[150,215]], { open:true });
  edge(gx + 380, gy + 100, [[0,0],[75,0],[75,-65],[150,-65]], { active:true, label:"B · civic power" });
  edge(gx + 380, gy + 100, [[0,0],[75,0],[75,80],[150,80]], { open:true });
  edge(gx + 760, gy + 35, [[0,0],[70,0],[70,-10],[145,-10]], { active:true, label:"A · monuments" });
  edge(gx + 760, gy + 35, [[0,0],[70,0],[70,130],[145,130]], { open:true });
  edge(gx + 1135, gy + 25, [[0,0],[60,0],[60,-10],[120,-10]], { active:true, label:"B · removal" });
  edge(gx + 1135, gy + 25, [[0,0],[60,0],[60,120],[120,120]], { open:true });
  turnNode(gx, gy + 263, 1, "Why do cities preserve\nsome memories?", { topic:"CITY MEMORY", status:"ROOT", statusWidth:52 });
  turnNode(gx + 380, gy + 48, 2, "Could archaeology recover\nan erased neighborhood?", { status:"EXPLORED" });
  openNode(gx + 380, gy + 488, "1B", "What do cities\nchoose to forget?");
  turnNode(gx + 530, gy - 17, 3, "Who decides what becomes\nofficial memory?", { status:"EXPLORED" });
  openNode(gx + 530, gy + 143, "2B", "Can unofficial\nmemory win?");
  turnNode(gx + 905, gy - 27, 4, "When a monument and its\ncommunity disagree", { status:"EXPLORED" });
  openNode(gx + 905, gy + 123, "3B", "Who gets to rename\na public place?");
  turnNode(gx + 1255, gy - 37, 5, "Can removal create\na stronger memory?", { current:true, status:"YOU ARE HERE", statusFill:C.acid, statusWidth:94 });
  openNode(gx + 1255, gy + 93, "5B", "What should replace\na removed symbol?");
  minimap(s.sx + s.width - 240, s.sy + 730, 210, 125, { viewportX:96, viewportY:22, viewportW:82 });
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "WHY THIS FEELS LIKE A TREE, NOT A HAIRBALL", "One direction, orthogonal edges, one node type for researched turns, and a smaller leaf type for open questions.", 1);
  endScene(s);
}

// 02 — selection and details-on-demand.
{
  const s = beginScene("02-selected-node-focus", "02 · SELECT A TURN WITHOUT LOSING THE TREE", "Focus state: keep node positions fixed, highlight ancestry + immediate choices, open a non-destructive inspector.", 1700, 40);
  appHeader(s, "12 turns · selected turn 4");
  graphToolbar(s, { mode:"FOCUS", modeSelected:true, crumb:"Root › archaeology › civic power › selected turn 4" });
  const gx = s.sx + 25;
  const gy = s.sy + 230;
  edge(gx + 190, gy + 300, [[0,0],[65,0],[65,-175],[130,-175]], { dim:true });
  edge(gx + 190, gy + 300, [[0,0],[65,0],[65,175],[130,175]], { dim:true });
  edge(gx + 510, gy + 125, [[0,0],[60,0],[60,-70],[125,-70]], { active:true });
  edge(gx + 510, gy + 125, [[0,0],[60,0],[60,85],[125,85]], { open:true });
  edge(gx + 865, gy + 55, [[0,0],[55,0],[55,-10],[115,-10]], { active:true });
  edge(gx + 865, gy + 55, [[0,0],[55,0],[55,130],[115,130]], { open:true });
  turnNode(gx, gy + 248, 1, "Why do cities preserve\nsome memories?", { width:190, dim:true });
  turnNode(gx + 320, gy + 73, 2, "Archaeology and\nerased neighborhoods", { width:190, dim:true });
  openNode(gx + 320, gy + 423, "1B", "What do cities\nchoose to forget?", { width:190, dim:true });
  turnNode(gx + 635, gy + 3, 3, "Who decides official\nmemory?", { width:230, status:"ANCESTOR" });
  openNode(gx + 635, gy + 168, "3B", "Can unofficial\nmemory win?", { width:210 });
  turnNode(gx + 980, gy - 7, 4, "When a monument and its\ncommunity disagree", { width:250, selected:true, status:"SELECTED", statusFill:C.coralSoft });
  openNode(gx + 980, gy + 133, "4B", "Who gets to rename\na public place?", { width:230 });
  // Inspector overlays the graph instead of shrinking/reflowing it.
  rect(s.sx + 1110, s.sy + 205, 440, 620, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:3 });
  text(s.sx + 1140, s.sy + 228, "TURN 4 · SELECTED", 10, { strokeColor:"#d64b38" });
  text(s.sx + 1498, s.sy + 224, "×", 22);
  text(s.sx + 1140, s.sy + 260, "When a monument and its\ncommunity disagree", 24);
  text(s.sx + 1140, s.sy + 330, "Sage · researched · 8 sources", 10, { strokeColor:C.muted });
  rect(s.sx + 1140, s.sy + 365, 380, 150, { backgroundColor:C.soft, strokeWidth:1 });
  text(s.sx + 1160, s.sy + 386, "ANSWER AT A GLANCE", 9, { strokeColor:C.muted });
  text(s.sx + 1160, s.sy + 414, "Conflict begins when official meaning\nno longer matches lived experience.\nThe question is who may define place.", 15);
  text(s.sx + 1160, s.sy + 486, "Open full answer  →", 10);
  text(s.sx + 1140, s.sy + 548, "TWO DIRECTIONS FROM HERE", 9, { strokeColor:C.muted });
  rect(s.sx + 1140, s.sy + 575, 380, 78, { backgroundColor:C.green, strokeColor:C.greenInk, strokeWidth:1 });
  text(s.sx + 1160, s.sy + 592, "A · Who gets to rename a public place?", 13);
  text(s.sx + 1160, s.sy + 624, "OPEN PATH", 9, { strokeColor:C.greenInk });
  rect(s.sx + 1140, s.sy + 666, 380, 78, { backgroundColor:C.sky, strokeWidth:1 });
  text(s.sx + 1160, s.sy + 683, "B · Can removal strengthen memory?", 13);
  text(s.sx + 1160, s.sy + 715, "PATH TAKEN · OPEN CHILD", 9, { strokeColor:C.blueInk });
  rect(s.sx + 1140, s.sy + 766, 185, 38, { backgroundColor:C.ink, strokeColor:C.ink, strokeWidth:1 });
  text(s.sx + 1172, s.sy + 778, "REVISIT FROM HERE", 10, { strokeColor:C.light });
  text(s.sx + 1340, s.sy + 779, "Copy link", 10);
  minimap(s.sx + 25, s.sy + 710, 210, 125, { viewportX:105, viewportY:20, viewportW:66 });
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "THE GRAPH NEVER JUMPS", "Selection changes emphasis and details, not coordinates. Closing the inspector returns to the exact same spatial position.", 2);
  endScene(s);
}

// 03 — dense graph and semantic zoom.
{
  const s = beginScene("03-dense-journey", "03 · A LARGE JOURNEY STAYS LEGIBLE", "Dense state: semantic zoom, collapsed branch clusters, pinned active route, and minimap orientation.", 60, 1120);
  appHeader(s, "58 turns · 31 open paths");
  graphToolbar(s, { filter:"OPEN 31", mode:"FOCUS", modeSelected:true, crumb:"Focus mode · active route + branch summaries" });
  const gx = s.sx + 60;
  const gy = s.sy + 240;
  // background micro nodes show scale without pretending all labels fit.
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row < 8; row += 1) {
      const px = gx + col * 190 + (row % 2) * 18;
      const py = gy + row * 55;
      if (col > 1 && col < 6 && row > 1 && row < 6) continue;
      ellipse(px, py, 12, 12, { backgroundColor: row % 3 === 0 ? C.green : C.soft, strokeColor:C.line, strokeWidth:1, opacity:55 });
      if (col < 6) line(px + 12, py + 6, [[0,0],[62,0],[62,(row % 2 ? 18 : -18)],[122,(row % 2 ? 18 : -18)]], { strokeColor:C.line, strokeWidth:1, opacity:38 });
    }
  }
  edge(gx + 230, gy + 270, [[0,0],[80,0],[80,-160],[155,-160]], { active:true });
  edge(gx + 385, gy + 110, [[0,0],[80,0],[80,-85],[160,-85]], { active:true });
  edge(gx + 775, gy + 25, [[0,0],[80,0],[80,90],[160,90]], { active:true });
  edge(gx + 1165, gy + 115, [[0,0],[55,0],[55,-5],[105,-5]], { active:true });
  turnNode(gx, gy + 218, 1, "Cities and memory", { status:"ROOT" });
  clusterNode(gx + 385, gy + 70, "ARCHAEOLOGY BRANCH", 8, 5, { width:230 });
  turnNode(gx + 545, gy - 27, 14, "Who decides official\nmemory?", { status:"ACTIVE ROUTE" });
  clusterNode(gx + 935, gy + 75, "MONUMENTS BRANCH", 12, 7, { width:230, active:true });
  turnNode(gx + 1270, gy + 58, 47, "Can removal create\nstronger memory?", { current:true, status:"YOU ARE HERE", statusFill:C.acid, statusWidth:94 });
  clusterNode(gx + 330, gy + 380, "FORGOTTEN PLACES", 6, 4, { width:220 });
  clusterNode(gx + 660, gy + 410, "ARCHIVES & POWER", 9, 6, { width:220 });
  clusterNode(gx + 1010, gy + 385, "COUNTER-MEMORY", 10, 6, { width:220 });
  text(s.sx + 25, s.sy + 692, "Zoom level 42% · researched turns become compact markers; meaningful branch groups keep names and counts.", 10, { strokeColor:C.muted });
  rect(s.sx + 1100, s.sy + 685, 245, 38, { backgroundColor:C.light, strokeColor:C.line, strokeWidth:1 });
  text(s.sx + 1120, s.sy + 697, "Expand active neighborhood", 10);
  minimap(s.sx + s.width - 240, s.sy + 660, 210, 145, { viewportX:87, viewportY:34, viewportW:70, viewportH:72 });
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "COMPLEXITY IS MANAGED, NOT HIDDEN", "At low zoom: shape, position, path, and counts. At medium zoom: titles. At high zoom: complete turn cards and actions.", 3);
  endScene(s);
}

// 04 — search and open paths.
{
  const s = beginScene("04-find-open-path", "04 · FIND A TURN OR OPEN PATH IN SECONDS", "Search state: matches stay bright, the route to each match highlights, and off-screen results get directional markers.", 1700, 1120);
  appHeader(s, "58 turns · searching");
  graphToolbar(s, { search:"statue", filter:"OPEN 31", filterSelected:true, mode:"RESULTS" });
  const gx = s.sx + 40;
  const gy = s.sy + 235;
  // dim field
  for (let col = 0; col < 7; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const px = gx + 165 * col;
      const py = gy + 70 * row + (col % 2) * 20;
      ellipse(px, py, 15, 15, { backgroundColor:C.soft, strokeColor:C.line, strokeWidth:1, opacity:30 });
      if (col < 6) line(px + 15, py + 7, [[0,0],[68,0],[68,(row % 2 ? 15 : -15)],[135,(row % 2 ? 15 : -15)]], { strokeColor:C.line, strokeWidth:1, opacity:23 });
    }
  }
  // match route
  edge(gx + 20, gy + 210, [[0,0],[150,0],[150,-90],[300,-90],[300,40],[450,40],[450,-80],[600,-80],[600,30],[750,30]], { active:true });
  turnNode(gx + 760, gy + 150, 22, "Why do cities remove\ncontroversial statues?", { selected:true, status:"MATCH 1 OF 3", statusFill:C.coralSoft, statusWidth:98 });
  openNode(gx + 1050, gy + 36, "TURN 41", "Can a removed statue\nstill shape memory?", { width:235 });
  chip(gx + 1080, gy + 150, "2 MORE MATCHES →", C.acid, 142);
  rect(s.sx + 25, s.sy + 678, 520, 135, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:2 });
  text(s.sx + 45, s.sy + 695, "3 MATCHES FOR “STATUE”", 10, { strokeColor:"#d64b38" });
  text(s.sx + 45, s.sy + 725, "1  Why do cities remove controversial statues?", 12);
  text(s.sx + 45, s.sy + 751, "2  Can a removed statue still shape memory?", 12);
  text(s.sx + 45, s.sy + 777, "3  Who decides what replaces a statue?", 12);
  text(s.sx + 445, s.sy + 777, "↓ off-screen", 9, { strokeColor:C.muted });
  minimap(s.sx + s.width - 240, s.sy + 668, 210, 145, { viewportX:116, viewportY:24, viewportW:56, viewportH:58 });
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "SEARCH DOES NOT TURN THE GRAPH INTO A LIST", "The result list supports scanning; the highlighted route answers “where is this?” and “how did I get there?” at the same time.", 4);
  endScene(s);
}

// 05 — branch preview.
{
  const s = beginScene("05-branch-preview", "05 · PREVIEW A BRANCH BEFORE RESEARCH STARTS", "Decision state: the old branch remains visible, a ghost node shows the structural result, and the cost/action is explicit.", 60, 2200);
  appHeader(s, "12 turns · branching from turn 3");
  graphToolbar(s, { mode:"BRANCH", modeSelected:true, crumb:"Current turn 8 · previewing branch from turn 3" });
  const gx = s.sx + 55;
  const gy = s.sy + 260;
  edge(gx + 230, gy + 265, [[0,0],[75,0],[75,-175],[150,-175]], { active:true });
  edge(gx + 530, gy + 90, [[0,0],[75,0],[75,-55],[150,-55]], { active:true });
  edge(gx + 530, gy + 90, [[0,0],[75,0],[75,190],[150,190]], { open:true });
  edge(gx + 910, gy + 35, [[0,0],[65,0],[65,-5],[130,-5]], { active:true });
  turnNode(gx, gy + 213, 1, "Cities and memory", { status:"ROOT" });
  turnNode(gx + 380, gy + 38, 2, "Archaeology and\nerased places", { status:"EXPLORED" });
  turnNode(gx + 680, gy - 17, 3, "Who decides official\nmemory?", { selected:true, status:"BRANCHING HERE", statusFill:C.coralSoft, statusWidth:112 });
  turnNode(gx + 1040, gy - 27, 4, "The current route\ncontinues here", { dim:true, status:"UNCHANGED" });
  // ghost branch
  rect(gx + 680, gy + 235, 260, 124, { backgroundColor:C.green, strokeColor:C.greenInk, strokeWidth:3, strokeStyle:"dashed" });
  text(gx + 700, gy + 252, "NEW BRANCH PREVIEW", 10, { strokeColor:C.greenInk });
  text(gx + 700, gy + 283, "Can unofficial memory\noutlast official history?", 17);
  text(gx + 700, gy + 335, "Research creates turn 13 here", 9, { strokeColor:C.muted });
  rect(s.sx + 1025, s.sy + 500, 500, 245, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:3 });
  text(s.sx + 1055, s.sy + 525, "START A NEW BRANCH?", 11, { strokeColor:"#d64b38" });
  text(s.sx + 1055, s.sy + 558, "Your current route stays intact.", 19);
  text(s.sx + 1055, s.sy + 598, "CuriosityPedia will research one new turn from Turn 3.\nThe result appears as a sibling branch and becomes current.", 13);
  chip(s.sx + 1055, s.sy + 653, "1 LIVE RESEARCH TURN", C.soft, 154);
  rect(s.sx + 1055, s.sy + 696, 220, 38, { backgroundColor:C.ink, strokeColor:C.ink, strokeWidth:1 });
  text(s.sx + 1090, s.sy + 708, "START RESEARCH", 10, { strokeColor:C.light });
  text(s.sx + 1310, s.sy + 709, "Cancel", 10);
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "NO SURPRISE BRANCHING", "Before committing, the user sees the parent, the new location, what stays untouched, and the cost of the action.", 5);
  endScene(s);
}

// 06 — mobile and accessible outline.
{
  const s = beginScene("06-mobile-and-outline", "06 · MOBILE IS GRAPH-FIRST, NOT A SHRUNK DESKTOP", "Mobile state: focused neighborhood, swipe/pan canvas, bottom-sheet details, and a first-class outline alternative.", 1700, 2200);
  // two phones inside one scene
  rect(s.sx + 85, s.sy + 95, 520, 760, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:3 });
  rect(s.sx + 85, s.sy + 95, 520, 54, { backgroundColor:"#ece8df", strokeWidth:1 });
  text(s.sx + 110, s.sy + 114, "CURIOSITYPEDIA", 13);
  text(s.sx + 535, s.sy + 114, "•••", 11);
  text(s.sx + 110, s.sy + 169, "Journey graph", 11, { strokeColor:"#d64b38" });
  text(s.sx + 110, s.sy + 195, "Turn 8 of 12 · 7 open", 18);
  rect(s.sx + 110, s.sy + 232, 470, 40, { backgroundColor:C.soft, strokeWidth:1 });
  text(s.sx + 128, s.sy + 245, "Root  ›  archaeology  ›  monuments  ›  you", 10);
  edge(s.sx + 195, s.sy + 390, [[0,0],[75,0],[75,-82],[150,-82]], { active:true });
  edge(s.sx + 345, s.sy + 308, [[0,0],[55,0],[55,-40],[110,-40]], { active:true });
  edge(s.sx + 345, s.sy + 308, [[0,0],[55,0],[55,105],[110,105]], { open:true });
  turnNode(s.sx + 115, s.sy + 338, 7, "Official memory", { width:180, height:92, status:"ANCESTOR", statusWidth:76 });
  turnNode(s.sx + 455, s.sy + 216, 8, "When monuments\ndisagree", { width:125, height:100, current:true, status:"HERE", statusWidth:48 });
  openNode(s.sx + 455, s.sy + 370, "8B", "Who renames\na place?", { width:125, height:86 });
  minimap(s.sx + 115, s.sy + 485, 150, 98, { viewportX:62, viewportY:21, viewportW:52, viewportH:47 });
  rect(s.sx + 85, s.sy + 600, 520, 255, { backgroundColor:C.light, strokeColor:C.ink, strokeWidth:2 });
  rect(s.sx + 290, s.sy + 612, 110, 5, { backgroundColor:C.line, strokeColor:C.line, strokeWidth:1 });
  text(s.sx + 110, s.sy + 635, "TURN 8 · YOU ARE HERE", 10, { strokeColor:"#d64b38" });
  text(s.sx + 110, s.sy + 668, "When monuments and communities disagree", 19);
  text(s.sx + 110, s.sy + 716, "Answer summary · 8 sources", 10, { strokeColor:C.muted });
  rect(s.sx + 110, s.sy + 754, 220, 48, { backgroundColor:C.green, strokeColor:C.greenInk, strokeWidth:1 });
  text(s.sx + 128, s.sy + 771, "2 open directions", 11);
  rect(s.sx + 350, s.sy + 754, 230, 48, { backgroundColor:C.ink, strokeColor:C.ink, strokeWidth:1 });
  text(s.sx + 401, s.sy + 771, "OPEN ANSWER", 10, { strokeColor:C.light });
  text(s.sx + 170, s.sy + 826, "← BACK", 9);
  text(s.sx + 315, s.sy + 826, "FIT", 9);
  text(s.sx + 440, s.sy + 826, "OUTLINE", 9);

  rect(s.sx + 800, s.sy + 95, 690, 760, { backgroundColor:C.soft, strokeColor:C.ink, strokeWidth:3 });
  text(s.sx + 830, s.sy + 125, "OUTLINE VIEW · EQUIVALENT NAVIGATION", 11, { strokeColor:"#d64b38" });
  text(s.sx + 830, s.sy + 160, "Same journey, readable without spatial navigation", 18);
  line(s.sx + 865, s.sy + 230, [[0,0],[0,455]], { strokeColor:C.line, strokeWidth:2 });
  const outlineRows = [
    [1,"Cities and memory","2 children · expanded",false],
    [2,"Archaeology and erased places","2 children · expanded",false],
    [3,"Who decides official memory?","2 children · expanded",false],
    [8,"When monuments disagree","selected · 2 open",true],
    [9,"Who gets to rename a place?","open path",false],
  ];
  outlineRows.forEach(([n,q,status,selected], i) => {
    const yy = s.sy + 205 + i * 106;
    rect(s.sx + 830 + i * 20, yy, 610 - i * 20, 82, { backgroundColor:selected ? C.sky : C.light, strokeColor:selected ? C.ink : C.line, strokeWidth:selected ? 3 : 1 });
    ellipse(s.sx + 848 + i * 20, yy + 18, 32, 32, { backgroundColor:selected ? C.acid : C.soft, strokeWidth:1 });
    text(s.sx + 860 + i * 20, yy + 26, String(n), 10);
    text(s.sx + 895 + i * 20, yy + 17, q, 13);
    text(s.sx + 895 + i * 20, yy + 48, status, 9, { strokeColor:C.muted });
    text(s.sx + 1395, yy + 27, i < 3 ? "−" : i === 3 ? "→" : "+", 16);
  });
  text(s.sx + 830, s.sy + 755, "Keyboard: arrows move · Enter selects · Left/Right collapse or expand", 11, { strokeColor:C.muted });
  noteBar(s.sx + 25, s.sy + 840, s.width - 50, "TWO EQUAL WAYS TO NAVIGATE", "The canvas is the visual experience; Outline is not a fallback afterthought—it exposes the same hierarchy, selection, and actions.", 6);
  endScene(s);
}

const drawing = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: all,
  appState: { gridSize: null, viewBackgroundColor: C.paper, currentItemFontFamily: 5 },
  files: {},
};

const outDir = "design/journey-graph-vision";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/curiositypedia-journey-graph-vision.excalidraw`, `${JSON.stringify(drawing, null, 2)}\n`);

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function svgFor(elements, crop) {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `<rect x="0" y="0" width="${crop.width}" height="${crop.height}" fill="${C.paper}"/>`,
    '<style>text{font-family:Arial,Helvetica,sans-serif}</style>',
    `<g transform="translate(${-crop.x} ${-crop.y})">`,
  ];
  for (const element of elements) {
    const fill = element.backgroundColor === "transparent" ? "none" : element.backgroundColor;
    const opacity = (element.opacity ?? 100) / 100;
    if (element.type === "rectangle") svg.push(`<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.roundness ? 6 : 0}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}" ${element.strokeStyle === "dashed" ? 'stroke-dasharray="8 6"' : ""}/>`);
    if (element.type === "ellipse") svg.push(`<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}"/>`);
    if (element.type === "line" || element.type === "arrow") {
      const points = element.points.map((point) => `${element.x + point[0]},${element.y + point[1]}`).join(" ");
      svg.push(`<polyline points="${points}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}" ${element.strokeStyle === "dashed" ? 'stroke-dasharray="8 6"' : ""}/>`);
      if (element.type === "arrow") {
        const point = element.points.at(-1);
        const ex = element.x + point[0];
        const ey = element.y + point[1];
        svg.push(`<path d="M${ex - 10},${ey - 7} L${ex},${ey} L${ex - 10},${ey + 7}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}"/>`);
      }
    }
    if (element.type === "text") {
      const lines = element.text.split("\n");
      svg.push(`<text x="${element.x}" y="${element.y + element.fontSize}" fill="${element.strokeColor}" font-size="${element.fontSize}" font-weight="${element.fontSize >= 20 ? 600 : 500}" opacity="${opacity}">${lines.map((lineText, index) => `<tspan x="${element.x}" dy="${index ? element.fontSize * 1.24 : 0}">${escapeXml(lineText)}</tspan>`).join("")}</text>`);
    }
  }
  svg.push("</g>", "</svg>");
  return svg.join("\n");
}

for (const scene of scenes) {
  const sceneElements = all.slice(scene.start, scene.end);
  const crop = { x: scene.x - 20, y: scene.y - 20, width: scene.width + 40, height: scene.height + 40 };
  const svg = svgFor(sceneElements, crop);
  fs.writeFileSync(`${outDir}/${scene.name}.svg`, svg);
  await sharp(Buffer.from(svg)).flatten({ background: C.paper }).png().toFile(`${outDir}/${scene.name}.png`);
}

const fullCrop = { x: 20, y: 0, width: 3300, height: 3260 };
const fullSvg = svgFor(all, fullCrop);
fs.writeFileSync(`${outDir}/curiositypedia-journey-graph-vision.svg`, fullSvg);
await sharp(Buffer.from(fullSvg)).flatten({ background: C.paper }).png().toFile(`${outDir}/curiositypedia-journey-graph-vision.png`);

console.log(`Created ${scenes.length} UI states and one editable Excalidraw walkthrough in ${outDir}`);
