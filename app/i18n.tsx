"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { SupportedLocale } from "../lib/contracts";
import { localeDirection } from "../lib/i18n";

type Values = Record<string, string | number>;
type Translator = (key: string, values?: Values) => string;

const translations: Record<Exclude<SupportedLocale, "en">, Record<string, string>> = {
  es: {
    "New drive": "Nueva ruta", Library: "Biblioteca", Compare: "Comparar", Settings: "Ajustes",
    "curiosity, performed": "curiosidad, en escena", "WonderDrive views": "Vistas de WonderDrive",
    "ChatGPT account": "Cuenta de ChatGPT", "Opening library…": "Abriendo biblioteca…", "{count}/{limit} saved": "{count}/{limit} guardadas", "durable session": "sesión duradera",
    "Sign in": "Iniciar sesión", "Sign out": "Cerrar sesión", "Research first": "Investigar primero", "Your guest library is still separate.": "Tu biblioteca de invitado sigue separada.", Reconnect: "Reconectar", Dismiss: "Descartar",
    "Current journey views": "Vistas del recorrido actual", "Next turn model": "Modelo del próximo turno", "Model for the next research turn": "Modelo para el próximo turno de investigación", Stage: "Escenario", "Journey map": "Mapa del recorrido",
    "One performer. One researched turn. Exactly two ways forward.": "Un intérprete. Un turno investigado. Exactamente dos caminos.", Source: "Código", "Product book": "Libro del producto",
    "Scanning what’s unfolding now…": "Explorando lo que ocurre ahora…", "Current signals + {performer} + {context}": "Señales actuales + {performer} + {context}", "your history": "tu historial", "wild-card domains": "temas inesperados", "Hunting…": "Buscando…", "Find new questions": "Buscar nuevas preguntas", "Questions suggested for {performer}": "Preguntas sugeridas para {performer}",
    "What are you curious about?": "¿Qué te da curiosidad?", "Starting question": "Pregunta inicial", "Ask anything…": "Pregunta lo que quieras…", "Tab to complete": "Tab para completar", "Recommended match": "Coincidencia recomendada", "Start typing for recommendation matches": "Empieza a escribir para ver recomendaciones", Performer: "Intérprete", Model: "Modelo", "Researching in the foreground…": "Investigando ahora…", "Begin the wonder": "Empezar a explorar",
    "Connecting to live foreground research…": "Conectando con la investigación en vivo…", "Research committed": "Investigación guardada", "Research stopped": "Investigación detenida", "Opening the next live research turn…": "Abriendo el siguiente turno de investigación…", "Choose one of the two current paths.": "Elige uno de los dos caminos actuales.",
    "Answer ready": "Respuesta lista", "Buffering answer": "Preparando respuesta", "Retrying {attempt} of {max}": "Reintentando {attempt} de {max}", "Placing the answer into this card": "Colocando la respuesta en esta tarjeta", "Nothing incomplete was saved": "No se guardó nada incompleto", "researching in this foreground turn": "investigando en este turno", "This turn was not committed": "Este turno no se guardó", "Return safely": "Volver con seguridad",
    "Choose the next direction": "Elige la siguiente dirección", "Where should curiosity go next?": "¿Hacia dónde seguimos?", "Two paths will appear here when the answer is ready.": "Aparecerán dos caminos cuando la respuesta esté lista.",
    "Turn {number}": "Turno {number}", "{count} turns": "{count} turnos", "{count} sources": "{count} fuentes", "You are revisiting an earlier turn.": "Estás revisitando un turno anterior.", "Choosing a path here creates a visible branch; your existing turns stay in the map.": "Elegir aquí crea una rama visible; los turnos existentes permanecen en el mapa.", "performed from live web research": "creado con investigación web en vivo", COMPOSED: "COMPUESTO", "Stop reading": "Detener lectura", "Read aloud": "Leer en voz alta", "Save and export options": "Opciones de guardado y exportación", "Save snapshot": "Guardar instantánea", "Export JSON": "Exportar JSON", "The answer": "La respuesta", "Answer characteristics": "Características de la respuesta", "live research": "investigación en vivo", "Evidence & research details": "Detalles de evidencia e investigación", "Deeper dive": "Ver más",
    "Let {performer} choose": "Dejar que {performer} elija", "Replacement question direction": "Dirección de las preguntas nuevas", Practical: "Práctica", Surprising: "Sorprendente", "Different direction": "Otra dirección", "Optional note": "Nota opcional", "What should change about the next two questions?": "¿Qué debería cambiar en las próximas dos preguntas?", "Replacing…": "Reemplazando…", "Generate two new questions": "Generar dos preguntas nuevas",
    "Close deeper dive": "Cerrar detalles", Sources: "Fuentes", Open: "Abrir", "Research summary": "Resumen de investigación", Research: "Investigación", Prompt: "Prompt", Researched: "Investigado", "Close and continue": "Cerrar y continuar",
    "Visual evidence": "Evidencia visual", "Browse visual evidence": "Explorar evidencia visual", "Previous image": "Imagen anterior", "Next image": "Imagen siguiente", "Why it is here": "Por qué está aquí", "What to notice": "Qué observar", "What it helps explain": "Qué ayuda a explicar", "Select an image": "Seleccionar una imagen", "Show {title}": "Mostrar {title}",
    "Follow the path you took, revisit a turn, or open a question you left behind.": "Sigue el camino recorrido, vuelve a un turno o abre una pregunta pendiente.", Current: "Actual", "Open paths": "Caminos abiertos", "Active path": "Camino activo", "How you got here": "Cómo llegaste aquí", "Choose any turn to see its two directions.": "Elige un turno para ver sus dos direcciones.", "You are here": "Estás aquí", Explored: "Explorado", "Earlier branch": "Rama anterior", "This turn is outside your current path. Exploring an open question here creates a new visible branch.": "Este turno está fuera de tu camino actual. Explorar una pregunta abierta crea una rama visible.", "Where could this turn go?": "¿Adónde podría llevar este turno?", "Explore this question": "Explorar esta pregunta", "This answer continues in the map above.": "Esta respuesta continúa en el mapa superior.", "This direction is no longer active.": "Esta dirección ya no está activa.", "Open full answer": "Abrir respuesta completa", "Revisit this answer": "Revisitar esta respuesta", "Other paths": "Otros caminos",
    "Questions worth returning to.": "Preguntas a las que vale la pena volver.", "{count} of {limit} journeys saved": "{count} de {limit} recorridos guardados", "New drive +": "Nueva ruta +", "Library filters": "Filtros de biblioteca", Search: "Buscar", "Title, question, or topic": "Título, pregunta o tema", "All performers": "Todos los intérpretes", "Show hidden": "Mostrar ocultos", PINNED: "FIJADO", Turns: "Turnos", Resume: "Continuar", Delete: "Eliminar", Keep: "Conservar", Remove: "Quitar", Rename: "Renombrar", Unpin: "Desfijar", Pin: "Fijar", Unhide: "Mostrar", Hide: "Ocultar", Snapshot: "Instantánea", Export: "Exportar", "Start the first saved journey": "Iniciar el primer recorrido guardado", "Rename this journey": "Renombrar este recorrido",
    "Two journeys. One closer look.": "Dos recorridos. Una mirada más cercana.", "Select two saved journeys. WonderDrive compares their committed paths, topics, and performers.": "Selecciona dos recorridos guardados. WonderDrive compara sus caminos, temas e intérpretes.", "Reading the paths…": "Leyendo los caminos…", "Compare selected journeys": "Comparar recorridos seleccionados", "Comparison begins after two journeys exist.": "La comparación comienza cuando existen dos recorridos.", "Start another drive": "Iniciar otra ruta", "Comparison ready": "Comparación lista", "The useful difference": "La diferencia útil", "What the saved data shows": "Lo que muestran los datos guardados", "Comparison cautions": "Precauciones de comparación",
    "Audience controls": "Controles de audiencia", "Make the stage comfortable.": "Haz cómodo el escenario.", "Synced to your ChatGPT identity": "Sincronizado con tu identidad de ChatGPT", "Saved to this guest session": "Guardado en esta sesión de invitado", "These preferences change presentation and future turns, never evidence.": "Estas preferencias cambian la presentación y los turnos futuros, nunca la evidencia.", "Experience language": "Idioma de la experiencia", "Changes the whole interface and future learning output.": "Cambia toda la interfaz y el contenido futuro.", "Default answer density": "Densidad predeterminada", Brief: "Breve", Balanced: "Equilibrada", Rich: "Detallada", "Separate from how deeply WonderDrive researches.": "Independiente de la profundidad de investigación.", "Text size": "Tamaño del texto", Small: "Pequeño", Medium: "Mediano", Large: "Grande", "Extra large": "Muy grande", "Factual images": "Imágenes factuales", Avoid: "Evitar", "When useful": "Cuando sean útiles", "Prefer when supported": "Preferir con evidencia", "Decorative imagery is never substituted for factual media.": "Las imágenes decorativas nunca sustituyen evidencia visual.", "Read-aloud speed: {rate}×": "Velocidad de lectura: {rate}×", "Reduce interface motion": "Reducir movimiento", "Saving…": "Guardando…", "Save preferences": "Guardar preferencias",
    "Opening your WonderDrive library…": "Abriendo tu biblioteca de WonderDrive…", "Resolving a durable guest identity": "Preparando una identidad de invitado", "Open the journey library": "Abrir la biblioteca", "No journey is on stage.": "No hay ningún recorrido en escena.", "Start a new question or return to one you have already saved.": "Inicia una pregunta nueva o vuelve a una ya guardada.",
  },
};

Object.assign(translations.es, {
  "rabbit holes": "madrigueras de curiosidad", "Next turn": "Siguiente turno", "Neither question works": "Ninguna pregunta funciona",
  "{count} checked sources": "{count} fuentes verificadas", "Your journey": "Tu recorrido", "Journey overview": "Resumen del recorrido", Option: "Opción",
  "Durable library / D1": "Biblioteca duradera / D1", "unclassified journey": "recorrido sin clasificar",
  "Manual comparison / no provider call": "Comparación manual / sin llamada al proveedor",
  "Private diagnostics": "Diagnóstico privado", "What failed, where, and when.": "Qué falló, dónde y cuándo.", Checking: "Comprobando",
  "Checking…": "Comprobando…", "Refresh incidents": "Actualizar incidentes", "Sign in with ChatGPT to keep private, identity-scoped diagnostic history.": "Inicia sesión con ChatGPT para conservar un historial de diagnóstico privado.",
  "Loading privacy-safe request health…": "Cargando el estado privado de las solicitudes…", "requests · 24h": "solicitudes · 24 h", "failures · 24h": "fallos · 24 h", "failure rate": "tasa de fallos", retention: "retención",
  "Repeated failure detected": "Se detectaron fallos repetidos", "Last provider event": "Último evento del proveedor", "Parsed events": "Eventos procesados", "Malformed events": "Eventos inválidos", "Output deltas": "Fragmentos de salida", "Provider done marker": "Marca de finalización", seen: "vista", "not seen": "no vista", Latency: "Latencia", "HTTP status": "Estado HTTP", "OpenAI request": "Solicitud de OpenAI", Preset: "Configuración", unrecorded: "sin registrar",
  "No failed research requests in the retained window.": "No hubo solicitudes de investigación fallidas en el período conservado.", "Prompts, answers, API keys, cookies, and source contents are never included.": "Nunca se incluyen prompts, respuestas, claves API, cookies ni contenido de fuentes.",
  "Input/output prices shown per 1M tokens; search is metered separately.": "Los precios de entrada y salida se muestran por 1 millón de tokens; la búsqueda se cobra por separado.",
  "WonderDrive — Give curiosity a direction": "WonderDrive — Dale una dirección a la curiosidad",
  "Highest-quality current OpenAI research model; highest cost.": "Modelo actual de investigación de OpenAI con la máxima calidad; también el de mayor costo.",
  "Current balanced OpenAI research model.": "Modelo actual y equilibrado de investigación de OpenAI.",
  "Recommended current OpenAI model for economical live research.": "Modelo actual de OpenAI recomendado para investigación en vivo económica.",
  "Cheapest compatible model; best for simple questions.": "Modelo compatible más económico; ideal para preguntas sencillas.",
  "Faster, lower-cost research with good answer quality.": "Investigación más rápida y económica con buena calidad de respuesta.",
  "Previous flagship; strong but less economical than Luna.": "Anterior modelo insignia; potente, pero menos económico que Luna.",
  "Strong previous-generation general-purpose model.": "Potente modelo de propósito general de la generación anterior.",
  "path taken": "camino elegido", chosen: "elegida", expired: "vencida", replaced: "reemplazada",
  "Both journeys touched {topics}.": "Ambos recorridos pasaron por {topics}.",
  "The journeys did not land on the same fixture topic.": "Los recorridos no llegaron al mismo tema.",
  "They used the same performer, so the path—not the persona—is the clearest visible difference.": "Usaron el mismo intérprete, así que el camino —no la personalidad— es la diferencia más clara.",
  "They used different performers, so both path and persona shape the contrast.": "Usaron intérpretes distintos, así que tanto el camino como la personalidad dan forma al contraste.",
  "Both contain 1 committed turn.": "Ambos contienen 1 turno guardado.",
  "Both contain {count} committed turns.": "Ambos contienen {count} turnos guardados.",
  "{leftTitle} contains {leftCount} turns; {rightTitle} contains {rightCount}.": "{leftTitle} contiene {leftCount} turnos; {rightTitle} contiene {rightCount}.",
  "Live-web evidence can change between research dates.": "La evidencia web en vivo puede cambiar entre fechas de investigación.",
  "Audience choices and rejected paths change the context of later turns.": "Las decisiones del público y los caminos rechazados cambian el contexto de los turnos posteriores.",
  "Model output is stochastic; this view is descriptive, not a winner ranking.": "La salida del modelo es probabilística; esta vista es descriptiva, no una clasificación de ganadores.",
  "Both journeys began from the same seed.": "Ambos recorridos comenzaron con la misma pregunta inicial.",
  "The starting seeds differ.": "Las preguntas iniciales son distintas.",
  "{performer} will carry this question": "{performer} llevará esta pregunta", "Performer pick": "Elección del intérprete",
  "Same selected model researches and performs · inspectable sources · durable branching graph": "El mismo modelo investiga y presenta · fuentes verificables · mapa de ramas duradero",
  "Move guest journeys into this account": "Mover los recorridos de invitado a esta cuenta", "{count} open questions": "{count} preguntas abiertas", "{count} earlier branches": "{count} ramas anteriores",
  Path: "Camino", "{count} source appearances": "{count} apariciones de fuentes", "{count} open branches": "{count} ramas abiertas", "{count} decisions": "{count} decisiones", "{count} redraws": "{count} reemplazos", "{count} delegated": "{count} delegadas",
  "{code} happened {count} times in ten minutes.": "{code} ocurrió {count} veces en diez minutos.",
  "Patient connections": "Conexiones pacientes", "Playful surprise": "Sorpresa juguetona", "How things work": "Cómo funcionan las cosas",
  "Patiently connects the present question to deeper patterns without rushing the surprise.": "Conecta con paciencia la pregunta actual con patrones más profundos sin apresurar la sorpresa.",
  "Finds the unexpected hinge in the evidence and makes surprise useful rather than random.": "Encuentra el giro inesperado en la evidencia y convierte la sorpresa en algo útil.",
  "Makes hidden mechanisms legible through concrete parts, forces, feedback, and failure modes.": "Hace comprensibles los mecanismos ocultos mediante piezas, fuerzas, retroalimentación y fallos concretos.",
  patient: "paciente", warm: "cálido", precise: "preciso", playful: "juguetón", nimble: "ágil", vivid: "vívido", "clear-eyed": "lúcido", tactile: "táctil", structured: "estructurado",
  instant: "instantáneo", fast: "rápido", balanced: "equilibrado", deliberate: "deliberado",
});

function format(template: string, values: Values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

export function translate(locale: SupportedLocale, key: string, values?: Values) {
  return format(locale === "en" ? key : translations[locale][key] ?? key, values);
}

export function hasTranslation(locale: Exclude<SupportedLocale, "en">, key: string) {
  return Object.hasOwn(translations[locale], key);
}

const I18nContext = createContext<{ locale: SupportedLocale; t: Translator }>({
  locale: "en",
  t: (key, values) => format(key, values),
});

export function I18nProvider({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    document.title = translate(locale, "WonderDrive — Give curiosity a direction");
  }, [locale]);
  const t: Translator = (key, values) => translate(locale, key, values);
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
