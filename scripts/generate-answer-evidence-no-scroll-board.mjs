import fs from "node:fs";
import sharp from "sharp";

const C = {
  paper: "#f4efe5",
  surface: "#fffdf8",
  ink: "#13241e",
  muted: "#66736e",
  line: "#c8cbc4",
  coral: "#ff7564",
  sky: "#cde9f7",
  acid: "#dfff58",
  cream: "#eee3ce",
  wash: "#f7f4ed",
};

const elements = [];
let serial = 0;

function base(type, x, y, width, height, options = {}) {
  serial += 1;
  return {
    id: `wd-evidence-${serial}`,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: options.strokeColor ?? C.ink,
    backgroundColor: options.backgroundColor ?? "transparent",
    fillStyle: "solid",
    strokeWidth: options.strokeWidth ?? 1,
    strokeStyle: options.strokeStyle ?? "solid",
    roughness: options.roughness ?? 0,
    opacity: options.opacity ?? 100,
    groupIds: [],
    frameId: null,
    index: `a${serial.toString(36)}`,
    roundness: options.roundness === false ? null : { type: 3 },
    seed: 148000 + serial * 97,
    version: 1,
    versionNonce: 238000 + serial * 131,
    isDeleted: false,
    boundElements: null,
    updated: 1784073600000,
    link: options.link ?? null,
    locked: false,
  };
}

function rect(x, y, width, height, options = {}) {
  const element = base("rectangle", x, y, width, height, options);
  elements.push(element);
  return element;
}

function ellipse(x, y, width, height, options = {}) {
  const element = base("ellipse", x, y, width, height, { ...options, roundness: false });
  elements.push(element);
  return element;
}

function text(x, y, value, size = 14, options = {}) {
  const lines = value.split("\n");
  const element = {
    ...base("text", x, y, options.width ?? Math.max(...lines.map((line) => line.length)) * size * 0.53, options.height ?? lines.length * size * (options.lineHeight ?? 1.25), {
      strokeColor: options.strokeColor,
      roundness: false,
    }),
    fontSize: size,
    fontFamily: 2,
    text: value,
    textAlign: options.textAlign ?? "left",
    verticalAlign: "top",
    containerId: null,
    originalText: value,
    autoResize: true,
    lineHeight: options.lineHeight ?? 1.25,
  };
  elements.push(element);
  return element;
}

function line(x, y, points, options = {}) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const element = {
    ...base(options.arrow ? "arrow" : "line", x, y, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), { ...options, roundness: false }),
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: options.arrow ? "arrow" : null,
  };
  elements.push(element);
  return element;
}

function imageElement(fileId, x, y, width, height) {
  const element = {
    ...base("image", x, y, width, height, { strokeColor: C.line, roundness: false }),
    fileId,
    status: "saved",
    scale: [1, 1],
    crop: null,
  };
  elements.push(element);
  return element;
}

function label(x, y, value, fill = C.acid, ink = C.ink) {
  const width = Math.max(62, value.length * 6.4 + 20);
  rect(x, y, width, 24, { backgroundColor: fill, strokeColor: ink });
  text(x + 10, y + 6, value.toUpperCase(), 9, { strokeColor: ink });
}

const screenshotPath = "artifacts/answer-surface-audit/02-public-space-answer-current.png";
const screenshot = sharp(screenshotPath);
const crops = [
  { id: "public-space-01", left: 1118, top: 387, width: 411, height: 205 },
  { id: "public-space-02", left: 1118, top: 629, width: 202, height: 178 },
  { id: "public-space-03", left: 1327, top: 629, width: 202, height: 178 },
  { id: "public-space-04", left: 1118, top: 817, width: 202, height: 130 },
  { id: "public-space-05", left: 1327, top: 817, width: 202, height: 130 },
];

const files = {};
const imageDataUrls = {};
for (const crop of crops) {
  const buffer = await screenshot.clone().extract(crop).resize(920, 520, { fit: "cover", position: "centre" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  const dataURL = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  imageDataUrls[crop.id] = dataURL;
  files[crop.id] = {
    mimeType: "image/jpeg",
    id: crop.id,
    dataURL,
    created: 1784073600000,
    lastRetrieved: 1784073600000,
  };
}

text(60, 34, "WonderDrive · full answer + visual evidence + always-visible directions", 28);
text(60, 72, "Rough Excalidraw composition · the answer, selected image, and image notes live together inside a fixed viewport", 13, { strokeColor: C.muted });
label(1647, 47, "No page scroll", C.acid);

const pageX = 60;
const pageY = 112;
const pageW = 1600;
const pageH = 900;
rect(pageX, pageY, pageW, pageH, { backgroundColor: C.paper, strokeColor: C.ink, strokeWidth: 2 });

// Global header and research status.
rect(pageX, pageY, pageW, 64, { backgroundColor: C.surface, strokeColor: C.surface });
ellipse(pageX + 20, pageY + 15, 34, 34, { backgroundColor: C.ink, strokeColor: C.ink });
text(pageX + 32, pageY + 23, "W", 14, { strokeColor: C.surface });
text(pageX + 68, pageY + 18, "WonderDrive", 14);
text(pageX + 68, pageY + 38, "CURIOSITY, PERFORMED", 8, { strokeColor: C.muted });
text(pageX + 610, pageY + 25, "NEW DRIVE      LIBRARY      COMPARE      SETTINGS", 10, { strokeColor: C.muted });
text(pageX + 1410, pageY + 25, "Jignasu Pathak", 10);
line(pageX, pageY + 64, [[0, 0], [pageW, 0]], { strokeColor: C.line });

rect(pageX, pageY + 64, pageW, 30, { backgroundColor: C.ink, strokeColor: C.ink });
rect(pageX + 480, pageY + 70, 114, 18, { backgroundColor: C.acid, strokeColor: C.acid });
text(pageX + 494, pageY + 74, "RESEARCH FIRST", 8, { strokeColor: C.ink });
text(pageX + 608, pageY + 74, "INSPECTABLE SOURCES · DURABLE BRANCHING GRAPH", 8, { strokeColor: C.surface });

// Compact question header.
text(pageX + 170, pageY + 118, "TURN 1 · SAGE", 9, { strokeColor: C.coral });
text(pageX + 170, pageY + 144, "Can a public space teach people how to behave?", 30);
rect(pageX + 1390, pageY + 118, 76, 58, { backgroundColor: C.wash, strokeColor: C.line });
text(pageX + 1407, pageY + 127, "1", 20);
text(pageX + 1407, pageY + 153, "TURNS", 8, { strokeColor: C.muted });
rect(pageX + 1466, pageY + 118, 76, 58, { backgroundColor: C.wash, strokeColor: C.line });
text(pageX + 1483, pageY + 127, "24", 20);
text(pageX + 1483, pageY + 153, "SOURCES", 8, { strokeColor: C.muted });

// Answer workbench: fixed height regardless of image count.
const cardX = pageX + 170;
const cardY = pageY + 198;
const cardW = 1260;
const cardH = 430;
rect(cardX, cardY, cardW, cardH, { backgroundColor: C.surface, strokeColor: C.line });
rect(cardX, cardY, 7, cardH, { backgroundColor: C.coral, strokeColor: C.coral });

ellipse(cardX + 26, cardY + 14, 34, 34, { backgroundColor: C.coral, strokeColor: C.coral });
text(cardX + 39, cardY + 21, "S", 13);
text(cardX + 72, cardY + 17, "Sage", 14);
text(cardX + 72, cardY + 36, "performed from live web research", 8, { strokeColor: C.muted });
label(cardX + 1100, cardY + 16, "Composed", C.surface);
rect(cardX + 1182, cardY + 16, 55, 24, { backgroundColor: C.surface, strokeColor: C.line });
text(cardX + 1196, cardY + 22, "•••", 10);
line(cardX + 20, cardY + 56, [[0, 0], [1218, 0]], { strokeColor: C.line });

// Full answer stays present beside the visual evidence.
const answerX = cardX + 24;
const answerY = cardY + 70;
const answerW = 460;
const answerH = 260;
rect(answerX, answerY, answerW, answerH, { backgroundColor: C.surface, strokeColor: C.line });
text(answerX + 16, answerY + 13, "THE FULL ANSWER", 8, { strokeColor: C.coral });
text(answerX + 16, answerY + 34, "Public Spaces As Silent Teachers", 20);
text(answerX + 16, answerY + 66, "A public space teaches mostly through hints, not lectures. A wide\nsidewalk invites people to walk side by side; shade and a comfortable\nbench say that staying is welcome. [15]\n\nDesigners call these cues affordances: features that make an action\neasy, visible, or socially natural. People also learn by watching how\nother people use the same place. [21]\n\nBut these lessons are not neutral. Fences, hostile seating, lighting,\nand narrow gates can quietly communicate who may enter or linger.\nThe behavior of a place emerges from design, observation, and habit.", 10, { lineHeight: 1.33 });

// Large selected image remains visible with the answer.
const imageX = cardX + 500;
const imageY = cardY + 72;
const imageW = 420;
const imageH = 246;
rect(imageX, imageY, imageW, imageH, { backgroundColor: C.cream, strokeColor: C.line });
imageElement("public-space-01", imageX + 8, imageY + 8, imageW - 16, imageH - 42);
text(imageX + 16, imageY + 222, "Paley Park, New York", 9);
text(imageX + 330, imageY + 222, "Source ↗", 9, { strokeColor: C.muted });

// Selected-image teaching information is a third, simultaneous pane.
const infoX = cardX + 936;
const infoY = cardY + 72;
const infoW = 300;
const infoH = 246;
rect(infoX, infoY, infoW, infoH, { backgroundColor: C.wash, strokeColor: C.line });
label(infoX + 16, infoY + 14, "Context", C.acid);
text(infoX + 16, infoY + 49, "WHY IT IS HERE", 8, { strokeColor: C.muted });
text(infoX + 16, infoY + 66, "It shows seating, shade, and circulation\nworking together in one public space.", 10, { lineHeight: 1.35 });
text(infoX + 16, infoY + 108, "WHAT TO NOTICE", 8, { strokeColor: C.muted });
text(infoX + 16, infoY + 125, "• Curved benches form shared and private zones\n• Trees make longer stays comfortable\n• Open paths keep movement visible", 9, { lineHeight: 1.38 });
text(infoX + 16, infoY + 181, "WHAT IT HELPS EXPLAIN", 8, { strokeColor: C.muted });
text(infoX + 16, infoY + 198, "Comfort and visibility encourage lingering.", 9);
text(infoX + 16, infoY + 220, "Context · source, credit, and rights ↗", 9, { strokeColor: C.muted });

// A quiet, horizontally scrollable image selector—no counts or overflow controls.
const railY = cardY + 338;
const thumbStart = cardX + 500;
for (let index = 0; index < 5; index += 1) {
  const x = thumbStart + index * 146;
  rect(x, railY, 136, 50, { backgroundColor: C.cream, strokeColor: index === 0 ? C.coral : C.line, strokeWidth: index === 0 ? 3 : 1 });
  imageElement(crops[index].id, x + 4, railY + 4, 128, 42);
}
rect(thumbStart, railY + 53, 736, 3, { backgroundColor: C.line, strokeColor: C.line, roundness: false });
rect(thumbStart, railY + 53, 286, 3, { backgroundColor: C.ink, strokeColor: C.ink, roundness: false });

// Evidence row remains compact and does not own the directions.
rect(cardX + 24, cardY + 406, 1212, 18, { backgroundColor: C.surface, strokeColor: C.line });
text(cardX + 34, cardY + 410, "Evidence & research details", 7);
text(cardX + 1008, cardY + 410, "24 sources · 3 searches · Deeper dive ↗", 7, { strokeColor: C.muted });

// Directions live inside the viewport budget.
const directionY = pageY + 642;
text(cardX, directionY, "CHOOSE THE NEXT DIRECTION", 9, { strokeColor: C.coral });
text(cardX, directionY + 22, "Where should curiosity go next?", 19);
rect(cardX, directionY + 53, 608, 88, { backgroundColor: C.sky, strokeColor: "#79afcb" });
text(cardX + 18, directionY + 66, "←  SOCIAL CUES", 9, { strokeColor: "#315d79" });
text(cardX + 18, directionY + 92, "Can a bench make strangers talk to each other?", 15);
text(cardX + 563, directionY + 87, "←", 22, { strokeColor: "#315d79" });
rect(cardX + 652, directionY + 53, 608, 88, { backgroundColor: C.acid, strokeColor: "#9eb536" });
text(cardX + 670, directionY + 66, "MOVEMENT & CONTROL  →", 9, { strokeColor: "#526500" });
text(cardX + 670, directionY + 92, "Who decides where people are allowed to linger?", 15);
text(cardX + 1211, directionY + 87, "→", 22, { strokeColor: "#526500" });
text(cardX + 438, directionY + 157, "✦  Let Sage choose", 10, { strokeColor: C.muted });
text(cardX + 670, directionY + 157, "Neither question works  ⌄", 10, { strokeColor: C.muted });

// Annotation rail on the right side of the Excalidraw board.
const noteX = 1710;
text(noteX, 128, "VIEWPORT RULES", 13, { strokeColor: C.coral });
rect(noteX, 158, 310, 178, { backgroundColor: C.surface, strokeColor: C.line });
text(noteX + 18, 176, "1. All three live together", 14);
text(noteX + 18, 207, "The full answer, selected image, and teaching\nnotes are simultaneous—not alternate states.", 11, { strokeColor: C.muted, lineHeight: 1.4 });
text(noteX + 18, 267, "HARD RULE", 8, { strokeColor: C.coral });
text(noteX + 18, 286, "Directions remain visible below the complete card.", 11);
line(noteX, 248, [[0, 0], [-146, 560]], { strokeColor: C.coral, strokeWidth: 2, arrow: true });

rect(noteX, 366, 310, 166, { backgroundColor: C.surface, strokeColor: C.line });
text(noteX + 18, 384, "2. One image gets the stage", 14);
text(noteX + 18, 415, "Clicking thumbnails changes the selected image\nand its teaching notes in place.", 11, { strokeColor: C.muted, lineHeight: 1.4 });
text(noteX + 18, 475, "Expand opens a modal; it does not make\nthe main page taller.", 11);
line(noteX, 450, [[0, 0], [-346, 0]], { strokeColor: C.sky, strokeWidth: 2, arrow: true });

rect(noteX, 562, 310, 166, { backgroundColor: C.surface, strokeColor: C.line });
text(noteX + 18, 580, "3. More media stays compact", 14);
text(noteX + 18, 611, "Images sit in one horizontal scroll strip.\nSelecting one updates the image and notes above.", 11, { strokeColor: C.muted, lineHeight: 1.4 });
text(noteX + 18, 671, "No counts, overflow labels, or extra controls.", 11);
line(noteX, 646, [[0, 0], [-378, -124]], { strokeColor: C.acid, strokeWidth: 2, arrow: true });

rect(noteX, 758, 310, 192, { backgroundColor: C.ink, strokeColor: C.ink });
text(noteX + 18, 778, "HEIGHT BUDGET", 9, { strokeColor: C.acid });
text(noteX + 18, 807, "Header + research strip       94px\nQuestion header              104px\nAnswer + evidence viewer     430px\nDirections + actions         208px\nBreathing room                64px", 11, { strokeColor: C.surface, lineHeight: 1.55 });
text(noteX + 18, 918, "TOTAL                         900px", 12, { strokeColor: C.acid });

const drawing = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: { gridSize: null, viewBackgroundColor: C.paper, currentItemFontFamily: 2 },
  files,
};

fs.mkdirSync("design", { recursive: true });
const stem = "design/wonderdrive-answer-evidence-no-scroll";
fs.writeFileSync(`${stem}.excalidraw`, `${JSON.stringify(drawing, null, 2)}\n`);

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="2080" height="1060" viewBox="0 0 2080 1060">',
  `<rect width="2080" height="1060" fill="${C.paper}"/>`,
  "<style>text{font-family:Inter,Arial,Helvetica,sans-serif}</style>",
  '<defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><path d="M0,0 L10,3.5 L0,7 z" fill="#13241e"/></marker></defs>',
];

for (const element of elements) {
  const fill = element.backgroundColor === "transparent" ? "none" : element.backgroundColor;
  const opacity = element.opacity / 100;
  if (element.type === "rectangle") svg.push(`<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.roundness ? 5 : 0}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}"/>`);
  if (element.type === "ellipse") svg.push(`<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}"/>`);
  if (element.type === "line" || element.type === "arrow") {
    const points = element.points.map((point) => `${element.x + point[0]},${element.y + point[1]}`).join(" ");
    svg.push(`<polyline points="${points}" fill="none" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" opacity="${opacity}" ${element.type === "arrow" ? 'marker-end="url(#arrow)"' : ""}/>`);
  }
  if (element.type === "image") svg.push(`<image href="${imageDataUrls[element.fileId]}" x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" preserveAspectRatio="xMidYMid slice"/>`);
  if (element.type === "text") {
    const weight = element.fontSize >= 18 ? 600 : 500;
    const lines = element.text.split("\n");
    svg.push(`<text x="${element.x}" y="${element.y + element.fontSize}" fill="${element.strokeColor}" font-size="${element.fontSize}" font-weight="${weight}" opacity="${opacity}">${lines.map((value, index) => `<tspan x="${element.x}" dy="${index ? element.fontSize * element.lineHeight : 0}">${escapeXml(value)}</tspan>`).join("")}</text>`);
  }
}

svg.push("</svg>");
fs.writeFileSync(`${stem}.svg`, svg.join("\n"));
await sharp(Buffer.from(svg.join("\n"))).png().toFile(`${stem}.png`);
console.log(`Created ${stem}.{excalidraw,svg,png}`);
