import fs from "node:fs";
import sharp from "sharp";

const elements = [];
let id = 0;
const C = {
  ink: "#17212b",
  muted: "#667085",
  paper: "#f7f5ef",
  light: "#fffdf8",
  line: "#c5d0d7",
  acid: "#dfff58",
  sky: "#acd8ff",
  coral: "#ffd2ca",
  soft: "#f1f6f8",
  green: "#efffc4",
};

function base(type, x, y, width, height, options = {}) {
  id += 1;
  return {
    id: `wd-atlas-${id}`,
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
    roughness: options.roughness ?? 1.05,
    opacity: options.opacity ?? 100,
    groupIds: options.groupIds ?? [],
    frameId: null,
    index: `a${id.toString(36)}`,
    roundness: options.roundness === false ? null : { type: 3 },
    seed: 31100 + id * 71,
    version: 1,
    versionNonce: 77100 + id * 97,
    isDeleted: false,
    boundElements: null,
    updated: 1784073600000,
    link: options.link ?? null,
    locked: false,
  };
}

function rect(x, y, width, height, options = {}) {
  elements.push(base("rectangle", x, y, width, height, options));
}

function ellipse(x, y, width, height, options = {}) {
  elements.push(base("ellipse", x, y, width, height, { ...options, roundness: false }));
}

function text(x, y, value, size = 16, options = {}) {
  const lines = value.split("\n");
  elements.push({
    ...base("text", x, y, options.width ?? Math.max(...lines.map((line) => line.length)) * size * 0.56, options.height ?? lines.length * size * 1.25, {
      strokeColor: options.strokeColor,
      roughness: 0,
      roundness: false,
    }),
    fontSize: size,
    fontFamily: 5,
    text: value,
    textAlign: options.textAlign ?? "left",
    verticalAlign: "top",
    containerId: null,
    originalText: value,
    autoResize: true,
    lineHeight: 1.25,
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

function chip(x, y, label, fill, width, strokeColor = C.ink) {
  rect(x, y, width, 28, { backgroundColor: fill, strokeColor, strokeWidth: 1 });
  text(x + 10, y + 7, label, 10, { strokeColor });
}

function callout(number, x, y, label, targetX, targetY, color = C.acid) {
  ellipse(x, y, 40, 40, { backgroundColor: color, strokeWidth: 2 });
  text(x + 14, y + 9, String(number), 14);
  text(x + 50, y + 8, label, 13);
  arrow(x + 20, y + 40, [[0, 0], [0, 26], [targetX - x - 20, targetY - y - 66]], { strokeColor: C.muted, strokeWidth: 1 });
}

function miniTurn(x, y, number, title, state, selected = false) {
  rect(x, y, 260, 78, {
    backgroundColor: selected ? C.sky : C.light,
    strokeWidth: selected ? 3 : 1,
  });
  ellipse(x + 12, y + 17, 34, 34, { backgroundColor: selected ? C.acid : C.soft, strokeWidth: 1 });
  text(x + 24, y + 25, String(number), 11);
  text(x + 58, y + 14, title, 13);
  text(x + 58, y + 43, state, 9, { strokeColor: C.muted });
}

text(60, 35, "CURIOSITYPEDIA · JOURNEY ATLAS", 40);
text(62, 90, "Replace the Stage / Journey map split with one workspace where path, answer, evidence, and next choices stay visible together.", 17, { strokeColor: C.muted });
chip(1900, 45, "RECOMMENDED DIRECTION", C.acid, 200);

text(60, 145, "DESKTOP · ONE JOURNEY WORKSPACE", 14, { strokeColor: "#d64b38" });
rect(60, 180, 1900, 1080, { backgroundColor: C.light, strokeWidth: 3, roughness: 1.4 });

// Browser chrome and global navigation.
rect(60, 180, 1900, 52, { backgroundColor: "#eeeae2", strokeWidth: 2 });
ellipse(80, 200, 10, 10, { backgroundColor: "#ff7b67", strokeWidth: 1 });
ellipse(99, 200, 10, 10, { backgroundColor: "#ffd166", strokeWidth: 1 });
ellipse(118, 200, 10, 10, { backgroundColor: "#81d88d", strokeWidth: 1 });
rect(690, 193, 600, 25, { backgroundColor: "#ffffff", strokeColor: "#b7bec6", strokeWidth: 1 });
text(882, 199, "curiositypedia.app/journey/atlas", 10, { strokeColor: C.muted });

rect(60, 232, 1900, 70, { backgroundColor: C.light, strokeWidth: 1 });
text(88, 255, "CURIOSITYPEDIA", 16);
text(1010, 258, "NEW DRIVE", 10, { strokeColor: C.muted });
text(1135, 258, "LIBRARY", 10, { strokeColor: C.muted });
text(1235, 258, "COMPARE", 10, { strokeColor: C.muted });
text(1340, 258, "USAGE", 10, { strokeColor: C.muted });
rect(1770, 247, 158, 38, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
text(1804, 259, "JOURNEY •••", 10, { strokeColor: C.light });

// Compact journey context: the old Stage/Map switcher is intentionally absent.
rect(60, 302, 1900, 96, { backgroundColor: C.soft, strokeWidth: 1 });
text(88, 322, "HOW DOES A CITY REMEMBER?", 11, { strokeColor: C.muted });
text(88, 346, "Contested memory and public space", 25);
chip(1110, 334, "TURN 3 OF 5", C.sky, 118);
chip(1242, 334, "4 OPEN PATHS", C.green, 128);
chip(1384, 334, "12 SOURCES", "#eeeae2", 108);
chip(1506, 334, "SAGE · LUNA", C.coral, 125);
rect(1650, 327, 278, 44, { backgroundColor: C.light, strokeWidth: 1 });
text(1672, 342, "Search this journey…", 11, { strokeColor: C.muted });

// Column structure.
rect(60, 398, 355, 862, { backgroundColor: C.soft, strokeWidth: 1 });
rect(415, 398, 1010, 862, { backgroundColor: C.light, strokeWidth: 1 });
rect(1425, 398, 535, 862, { backgroundColor: C.soft, strokeWidth: 1 });

// Left: complete journey outline.
text(88, 425, "JOURNEY OUTLINE", 11, { strokeColor: "#d64b38" });
text(88, 451, "Everything, always in reach", 18);
text(88, 482, "Current route", 10, { strokeColor: C.muted });
miniTurn(88, 510, 1, "How does a city remember?", "Explored");
line(116, 588, [[0, 0], [0, 22]], { strokeWidth: 2 });
miniTurn(88, 610, 2, "Who makes memory official?", "Explored · 1 open path");
line(116, 688, [[0, 0], [0, 22]], { strokeWidth: 2 });
miniTurn(88, 710, 3, "When monuments disagree", "You are here · 2 open paths", true);
line(116, 788, [[0, 0], [0, 22]], { strokeWidth: 2 });
miniTurn(88, 810, 4, "Who gets to rename places?", "Explored");
line(116, 888, [[0, 0], [0, 22]], { strokeWidth: 2 });
miniTurn(88, 910, 5, "Can removal strengthen memory?", "Latest answer");

text(88, 1014, "OTHER BRANCHES", 10, { strokeColor: C.muted });
rect(88, 1040, 260, 58, { backgroundColor: C.green, strokeColor: "#849c15", strokeStyle: "dashed", strokeWidth: 1 });
text(102, 1053, "+ Open from turn 1", 10, { strokeColor: "#506500" });
text(102, 1075, "What do cities choose to forget?", 11);
rect(88, 1110, 260, 58, { backgroundColor: C.green, strokeColor: "#849c15", strokeStyle: "dashed", strokeWidth: 1 });
text(102, 1123, "+ Open from turn 2", 10, { strokeColor: "#506500" });
text(102, 1145, "Can unofficial memory win?", 11);
text(88, 1192, "Collapse outline  ‹", 10, { strokeColor: C.muted });

// Center: selected answer.
text(455, 425, "SELECTED TURN · 3", 11, { strokeColor: "#d64b38" });
text(455, 456, "What happens when a monument\nand its community disagree?", 31);
text(455, 544, "Researched by Sage · 8 min ago", 11, { strokeColor: C.muted });
rect(455, 579, 930, 180, { backgroundColor: C.soft, strokeWidth: 1 });
text(480, 602, "ANSWER AT A GLANCE", 10, { strokeColor: C.muted });
text(480, 634, "A monument stops behaving like shared memory when its official story\nno longer matches lived experience. Conflict is not just about the object;\nit is about who is allowed to define the public meaning of a place.", 18);
text(480, 724, "Read full answer  ↓", 11);

text(455, 795, "THE THREAD IN THREE IDEAS", 10, { strokeColor: C.muted });
rect(455, 825, 290, 112, { backgroundColor: C.light, strokeWidth: 1 });
text(473, 842, "01 · AUTHORITY", 10, { strokeColor: C.muted });
text(473, 870, "Official stories compete\nwith lived memory.", 15);
rect(765, 825, 290, 112, { backgroundColor: C.light, strokeWidth: 1 });
text(783, 842, "02 · PLACE", 10, { strokeColor: C.muted });
text(783, 870, "Public meaning changes\nas communities change.", 15);
rect(1075, 825, 310, 112, { backgroundColor: C.light, strokeWidth: 1 });
text(1093, 842, "03 · ACTION", 10, { strokeColor: C.muted });
text(1093, 870, "Removal, reinterpretation,\nor deliberate tension.", 15);

rect(455, 975, 930, 120, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
text(480, 994, "EVIDENCE USED", 10, { strokeColor: C.muted });
text(480, 1024, "12 sources · 7 cited in the answer · 3 primary records", 15);
chip(480, 1056, "Smithsonian", C.soft, 105);
chip(598, 1056, "City archive", C.soft, 102);
chip(713, 1056, "Local reporting", C.soft, 112);
text(1245, 1058, "Inspect all  →", 10);

rect(455, 1130, 930, 90, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
text(480, 1147, "TURN TOOLS", 10, { strokeColor: C.muted });
text(480, 1176, "Listen", 11);
text(570, 1176, "Snapshot", 11);
text(680, 1176, "Share", 11);
text(1210, 1176, "Revisit from here", 11);

// Right: exactly two next directions, no second screen required.
text(1460, 425, "NEXT MOVE", 11, { strokeColor: "#d64b38" });
text(1460, 456, "Where should curiosity go?", 21);
text(1460, 492, "Both earned paths stay beside the answer.", 11, { strokeColor: C.muted });

rect(1460, 535, 465, 220, { backgroundColor: C.green, strokeColor: "#849c15", strokeWidth: 2 });
chip(1480, 555, "OPTION A", C.acid, 86, "#506500");
text(1480, 603, "Who gets to rename\na public place?", 22);
text(1480, 678, "Power · language · belonging", 10, { strokeColor: C.muted });
rect(1480, 707, 425, 30, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
text(1640, 715, "EXPLORE A", 10, { strokeColor: C.light });

rect(1460, 775, 465, 220, { backgroundColor: C.sky, strokeColor: C.ink, strokeWidth: 2 });
chip(1480, 795, "OPTION B", C.light, 86);
text(1480, 843, "Can removal create\na stronger memory?", 22);
text(1480, 918, "Loss · repair · counter-memory", 10, { strokeColor: C.muted });
rect(1480, 947, 425, 30, { backgroundColor: C.ink, strokeColor: C.ink, strokeWidth: 1 });
text(1640, 955, "EXPLORE B", 10, { strokeColor: C.light });

rect(1460, 1035, 465, 104, { backgroundColor: C.light, strokeColor: C.line, strokeWidth: 1 });
text(1480, 1054, "NOT READY TO CHOOSE?", 10, { strokeColor: C.muted });
text(1480, 1082, "Return to the outline, compare an earlier\nturn, or let Sage choose.", 14);
text(1460, 1185, "The right rail is about action only — no settings,\nlong metadata, or duplicate answer content.", 11, { strokeColor: C.muted });

// Interaction callouts.
callout(1, 2020, 315, "No Stage / Map toggle", 1700, 345, C.acid);
callout(2, 2020, 520, "Whole journey stays visible", 290, 720, C.sky);
callout(3, 2020, 745, "Selection changes the center", 930, 610, C.coral);
callout(4, 2020, 970, "Next choices never disappear", 1730, 720, C.green);

// Mobile interpretation.
text(60, 1320, "MOBILE · SAME INFORMATION, STACKED WITH JUMP LINKS", 14, { strokeColor: "#d64b38" });
rect(60, 1355, 540, 1040, { backgroundColor: C.light, strokeWidth: 3, roughness: 1.4 });
rect(60, 1355, 540, 58, { backgroundColor: "#eeeae2", strokeWidth: 1 });
text(85, 1375, "CURIOSITYPEDIA", 13);
text(520, 1376, "•••", 12);
text(85, 1440, "How does a city remember?", 21);
text(85, 1474, "Turn 3 of 5 · 4 open paths", 10, { strokeColor: C.muted });
rect(85, 1510, 490, 44, { backgroundColor: C.soft, strokeWidth: 1 });
text(120, 1524, "PATH", 10);
text(278, 1524, "ANSWER", 10);
text(445, 1524, "NEXT", 10);
line(105, 1568, [[0, 0], [0, 140]], { strokeWidth: 2 });
ellipse(88, 1580, 34, 34, { backgroundColor: C.soft, strokeWidth: 1 });
text(100, 1588, "1", 11);
text(140, 1584, "How does a city remember?", 14);
text(140, 1609, "Explored", 9, { strokeColor: C.muted });
ellipse(88, 1635, 34, 34, { backgroundColor: C.soft, strokeWidth: 1 });
text(100, 1643, "2", 11);
text(140, 1639, "Who makes memory official?", 14);
text(140, 1664, "Explored · 1 open", 9, { strokeColor: C.muted });
ellipse(88, 1690, 34, 34, { backgroundColor: C.acid, strokeWidth: 2 });
text(100, 1698, "3", 11);
text(140, 1694, "When monuments disagree", 14);
text(140, 1719, "You are here · 2 open", 9, { strokeColor: C.muted });
text(85, 1755, "+ Show 2 other open branches", 11, { strokeColor: "#506500" });

rect(85, 1795, 490, 245, { backgroundColor: C.soft, strokeWidth: 1 });
text(105, 1815, "TURN 3 · ANSWER AT A GLANCE", 10, { strokeColor: C.muted });
text(105, 1852, "What happens when a monument\nand its community disagree?", 21);
text(105, 1922, "Conflict is about who is allowed to define\nthe public meaning of a place.", 15);
text(105, 1986, "Read full answer  ↓", 11);

text(85, 2070, "NEXT MOVE", 10, { strokeColor: "#d64b38" });
rect(85, 2100, 490, 100, { backgroundColor: C.green, strokeColor: "#849c15", strokeWidth: 1 });
text(105, 2118, "A · Who gets to rename a public place?", 15);
text(105, 2163, "EXPLORE  →", 10, { strokeColor: "#506500" });
rect(85, 2215, 490, 100, { backgroundColor: C.sky, strokeWidth: 1 });
text(105, 2233, "B · Can removal create stronger memory?", 15);
text(105, 2278, "EXPLORE  →", 10);
text(85, 2343, "Sticky PATH / ANSWER / NEXT links keep the page\norientable without pretending three columns fit on a phone.", 11, { strokeColor: C.muted });

// Decision model and implementation framing.
text(680, 1320, "THE PRODUCT MODEL BECOMES THE LAYOUT", 14, { strokeColor: "#d64b38" });
rect(680, 1355, 1500, 420, { backgroundColor: C.soft, strokeColor: C.line, strokeWidth: 2 });
rect(735, 1445, 300, 130, { backgroundColor: C.light, strokeWidth: 2 });
text(770, 1470, "1 · ORIENT", 11, { strokeColor: C.muted });
text(770, 1502, "See the whole\njourney outline", 20);
arrow(1035, 1510, [[0, 0], [110, 0]], { strokeWidth: 3 });
rect(1145, 1445, 300, 130, { backgroundColor: C.sky, strokeWidth: 3 });
text(1180, 1470, "2 · UNDERSTAND", 11, { strokeColor: C.muted });
text(1180, 1502, "Read the selected\nturn in context", 20);
arrow(1445, 1510, [[0, 0], [110, 0]], { strokeWidth: 3 });
rect(1555, 1445, 300, 130, { backgroundColor: C.green, strokeColor: "#849c15", strokeWidth: 2 });
text(1590, 1470, "3 · CONTINUE", 11, { strokeColor: C.muted });
text(1590, 1502, "Choose exactly one\nof two earned paths", 20);
arrow(1855, 1510, [[0, 0], [110, 0], [110, 155], [-1085, 155], [-1085, 130]], { strokeColor: C.muted, strokeWidth: 2 });
text(1185, 1692, "New turn appears in the outline; context is never lost.", 13, { strokeColor: C.muted });

rect(680, 1815, 1500, 580, { backgroundColor: C.light, strokeWidth: 2 });
text(720, 1850, "WHY THIS FITS THE CODE THAT EXISTS", 13, { strokeColor: "#d64b38" });
text(720, 1895, "KEEP", 11, { strokeColor: C.muted });
text(720, 1925, "• Existing JourneyDetail, turns, parentTurnId, options, and actions\n• Exactly two options per ready turn\n• Full answer, citations, snapshots, performer, and next-model control\n• Library, compare, usage, and settings as global destinations", 16);
text(720, 2065, "CHANGE", 11, { strokeColor: C.muted });
text(720, 2095, "• Merge Stage and Journey map into one Journey Atlas route\n• Make selected turn the single source of context for center + right rails\n• Keep the complete outline persistent on desktop and collapsible on tablet\n• Use sticky jump links and stacked sections on mobile", 16);
text(720, 2235, "THE CORE PRINCIPLE", 11, { strokeColor: C.muted });
rect(720, 2265, 1400, 80, { backgroundColor: C.acid, strokeWidth: 1 });
text(755, 2288, "Show everything that explains the journey — but give only one thing at a time the strongest visual weight.", 19);

const drawing = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: C.paper,
    currentItemFontFamily: 5,
  },
  files: {},
};

fs.mkdirSync("design", { recursive: true });
const stem = "design/curiositypedia-journey-atlas-concept";
fs.writeFileSync(`${stem}.excalidraw`, `${JSON.stringify(drawing, null, 2)}\n`);

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2440" viewBox="0 0 2400 2440">',
  `<rect width="2400" height="2440" fill="${C.paper}"/>`,
  '<style>text{font-family:Arial,Helvetica,sans-serif}</style>',
];

for (const element of elements) {
  const fill = element.backgroundColor === "transparent" ? "none" : element.backgroundColor;
  if (element.type === "rectangle") {
    svg.push(`<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.roundness ? 7 : 0}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" ${element.strokeStyle === "dashed" ? 'stroke-dasharray="9 7"' : ""}/>`);
  }
  if (element.type === "ellipse") {
    svg.push(`<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}"/>`);
  }
  if (element.type === "line" || element.type === "arrow") {
    const points = element.points.map((point) => `${element.x + point[0]},${element.y + point[1]}`).join(" ");
    svg.push(`<polyline points="${points}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}"/>`);
    if (element.type === "arrow") {
      const point = element.points.at(-1);
      const endX = element.x + point[0];
      const endY = element.y + point[1];
      svg.push(`<path d="M${endX - 11},${endY - 7} L${endX},${endY} L${endX - 11},${endY + 7}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}"/>`);
    }
  }
  if (element.type === "text") {
    const lines = element.text.split("\n");
    svg.push(`<text x="${element.x}" y="${element.y + element.fontSize}" fill="${element.strokeColor}" font-size="${element.fontSize}" font-weight="${element.fontSize >= 21 ? 600 : 500}">${lines.map((lineText, index) => `<tspan x="${element.x}" dy="${index ? element.fontSize * 1.25 : 0}">${escapeXml(lineText)}</tspan>`).join("")}</text>`);
  }
}

svg.push("</svg>");
fs.writeFileSync(`${stem}.svg`, svg.join("\n"));
await sharp(Buffer.from(svg.join("\n"))).png().toFile(`${stem}.png`);
console.log(`Created ${stem}.{excalidraw,svg,png}`);
