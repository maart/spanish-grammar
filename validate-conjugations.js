#!/usr/bin/env node
// Spanish Grammar Conjugation Validation Script
// Usage: node validate-conjugations.js

const fs = require("fs");
const path = require("path");

// ─── Extract JS from HTML ───────────────────────────────────────────────────
const htmlPath = path.join(__dirname, "spanish-grammar.html");
const html = fs.readFileSync(htmlPath, "utf-8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("ERROR: Could not find <script> tag in HTML file");
  process.exit(1);
}
let jsCode = scriptMatch[1];

// Cut off DOM initialization code (event listeners, render calls, etc.)
// Keep only data declarations and function definitions
const domInitMarker = "\nconst dataIssues = validateData();";
const domInitIndex = jsCode.indexOf(domInitMarker);
if (domInitIndex > 0) {
  jsCode = jsCode.substring(0, domInitIndex);
}

// ─── Build sandbox context ──────────────────────────────────────────────────
const sandbox = {
  console,
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
  },
};

// Execute the JS in the sandbox
const fn = new Function(
  ...Object.keys(sandbox),
  jsCode + "\nreturn { IRREGULARS, RAW_VERBS, BASE_VERBS, TENSES, PEOPLE, HABER_FORMS, TRANSLATIONS, DISPLAY_INFINITIVES, COMMON_VERB_SUGGESTIONS, verbType, stem, regularPresent, regularIndefinido, regularImperfecto, regularFuture, regularCondicional, regularSubjuntivoPresente, regularImperativoAfirmativo, participle, gerund, generatedPresent, generatedSubjuntivoPresente, irregularIndefinido, irregularFutureStem, thirdPersonStemChangeIndefinido, orthographicIndefinido, generatedParticiple, hasStemChange, stemChange, formsFor, verbInfo, regularPresentPattern, regularIndefinidoPattern, regularFuturePattern, regularCondicionalPattern, regularSubjuntivoPresentePattern, regularImperativoAfirmativoPattern, regularParticiplePattern, irregularIndefinidoStem, regularSubjuntivoImperfecto, regularSubjuntivoFuturo, compound, compoundPattern, isReflexive, baseVerb, tenseById, state, filteredVerbs, searchMatchFor, normalize };"
);
const api = fn(...Object.values(sandbox));

const {
  IRREGULARS, TRANSLATIONS, BASE_VERBS, TENSES, PEOPLE,
  verbType, stem, regularPresent, regularIndefinido, regularImperfecto,
  regularFuture, regularCondicional, regularSubjuntivoPresente,
  regularImperativoAfirmativo, participle, gerund,
  generatedPresent, generatedSubjuntivoPresente,
  irregularIndefinido, irregularFutureStem,
  thirdPersonStemChangeIndefinido, orthographicIndefinido,
  generatedParticiple, hasStemChange, formsFor, verbInfo,
  regularPresentPattern, regularIndefinidoPattern,
  regularFuturePattern, regularCondicionalPattern,
  regularSubjuntivoPresentePattern, regularImperativoAfirmativoPattern,
  regularParticiplePattern, irregularIndefinidoStem,
  isReflexive, baseVerb, state, filteredVerbs,
} = api;

// ─── Reference data: known correct conjugations ─────────────────────────────
// Format: { verb: { tense: [yo, tu, el, nosotros, vosotros, ellos] } }
// For imperativo: [-, tu, el, nosotros, vosotros, ellos]

const REFERENCE = {
  // === Completely irregular verbs ===
  ser: {
    presente: ["soy", "eres", "es", "somos", "sois", "son"],
    indefinido: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imperfecto: ["era", "eras", "era", "éramos", "erais", "eran"],
    futuro: ["seré", "serás", "será", "seremos", "seréis", "serán"],
    condicional: ["sería", "serías", "sería", "seríamos", "seríais", "serían"],
    subjuntivo_presente: ["sea", "seas", "sea", "seamos", "seáis", "sean"],
    imperativo_afirmativo: ["-", "sé", "sea", "seamos", "sed", "sean"],
    participle: "sido",
    gerund: "siendo",
  },
  estar: {
    presente: ["estoy", "estás", "está", "estamos", "estáis", "están"],
    indefinido: ["estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"],
    subjuntivo_presente: ["esté", "estés", "esté", "estemos", "estéis", "estén"],
    imperativo_afirmativo: ["-", "está", "esté", "estemos", "estad", "estén"],
    participle: "estado",
    gerund: "estando",
  },
  ir: {
    presente: ["voy", "vas", "va", "vamos", "vais", "van"],
    indefinido: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imperfecto: ["iba", "ibas", "iba", "íbamos", "ibais", "iban"],
    futuro: ["iré", "irás", "irá", "iremos", "iréis", "irán"],
    condicional: ["iría", "irías", "iría", "iríamos", "iríais", "irían"],
    subjuntivo_presente: ["vaya", "vayas", "vaya", "vayamos", "vayáis", "vayan"],
    imperativo_afirmativo: ["-", "ve", "vaya", "vayamos", "id", "vayan"],
    participle: "ido",
    gerund: "yendo",
  },
  haber: {
    presente: ["he", "has", "ha", "hemos", "habéis", "han"],
    indefinido: ["hube", "hubiste", "hubo", "hubimos", "hubisteis", "hubieron"],
    subjuntivo_presente: ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"],
    futuro: ["habré", "habrás", "habrá", "habremos", "habréis", "habrán"],
    condicional: ["habría", "habrías", "habría", "habríamos", "habríais", "habrían"],
    participle: "habido",
    gerund: "habiendo",
  },
  tener: {
    presente: ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"],
    indefinido: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"],
    futuro: ["tendré", "tendrás", "tendrá", "tendremos", "tendréis", "tendrán"],
    condicional: ["tendría", "tendrías", "tendría", "tendríamos", "tendríais", "tendrían"],
    subjuntivo_presente: ["tenga", "tengas", "tenga", "tengamos", "tengáis", "tengan"],
    imperativo_afirmativo: ["-", "ten", "tenga", "tengamos", "tened", "tengan"],
    participle: "tenido",
    gerund: "teniendo",
  },
  hacer: {
    presente: ["hago", "haces", "hace", "hacemos", "hacéis", "hacen"],
    indefinido: ["hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"],
    futuro: ["haré", "harás", "hará", "haremos", "haréis", "harán"],
    condicional: ["haría", "harías", "haría", "haríamos", "haríais", "harían"],
    subjuntivo_presente: ["haga", "hagas", "haga", "hagamos", "hagáis", "hagan"],
    imperativo_afirmativo: ["-", "haz", "haga", "hagamos", "haced", "hagan"],
    participle: "hecho",
    gerund: "haciendo",
  },
  decir: {
    presente: ["digo", "dices", "dice", "decimos", "decís", "dicen"],
    indefinido: ["dije", "dijiste", "dijo", "dijimos", "dijisteis", "dijeron"],
    futuro: ["diré", "dirás", "dirá", "diremos", "diréis", "dirán"],
    condicional: ["diría", "dirías", "diría", "diríamos", "diríais", "dirían"],
    subjuntivo_presente: ["diga", "digas", "diga", "digamos", "digáis", "digan"],
    imperativo_afirmativo: ["-", "di", "diga", "digamos", "decid", "digan"],
    participle: "dicho",
    gerund: "diciendo",
  },
  venir: {
    presente: ["vengo", "vienes", "viene", "venimos", "venís", "vienen"],
    indefinido: ["vine", "viniste", "vino", "vinimos", "vinisteis", "vinieron"],
    futuro: ["vendré", "vendrás", "vendrá", "vendremos", "vendréis", "vendrán"],
    condicional: ["vendría", "vendrías", "vendría", "vendríamos", "vendríais", "vendrían"],
    subjuntivo_presente: ["venga", "vengas", "venga", "vengamos", "vengáis", "vengan"],
    imperativo_afirmativo: ["-", "ven", "venga", "vengamos", "venid", "vengan"],
    participle: "venido",
    gerund: "viniendo",
  },
  poder: {
    presente: ["puedo", "puedes", "puede", "podemos", "podéis", "pueden"],
    indefinido: ["pude", "pudiste", "pudo", "pudimos", "pudisteis", "pudieron"],
    futuro: ["podré", "podrás", "podrá", "podremos", "podréis", "podrán"],
    condicional: ["podría", "podrías", "podría", "podríamos", "podríais", "podrían"],
    subjuntivo_presente: ["pueda", "puedas", "pueda", "podamos", "podáis", "puedan"],
    participle: "podido",
    gerund: "pudiendo",
  },
  poner: {
    presente: ["pongo", "pones", "pone", "ponemos", "ponéis", "ponen"],
    indefinido: ["puse", "pusiste", "puso", "pusimos", "pusisteis", "pusieron"],
    futuro: ["pondré", "pondrás", "pondrá", "pondremos", "pondréis", "pondrán"],
    condicional: ["pondría", "pondrías", "pondría", "pondríamos", "pondríais", "pondrían"],
    subjuntivo_presente: ["ponga", "pongas", "ponga", "pongamos", "pongáis", "pongan"],
    imperativo_afirmativo: ["-", "pon", "ponga", "pongamos", "poned", "pongan"],
    participle: "puesto",
    gerund: "poniendo",
  },
  ver: {
    presente: ["veo", "ves", "ve", "vemos", "veis", "ven"],
    indefinido: ["vi", "viste", "vio", "vimos", "visteis", "vieron"],
    subjuntivo_presente: ["vea", "veas", "vea", "veamos", "veáis", "vean"],
    participle: "visto",
    gerund: "viendo",
  },
  dar: {
    presente: ["doy", "das", "da", "damos", "dais", "dan"],
    indefinido: ["di", "diste", "dio", "dimos", "disteis", "dieron"],
    subjuntivo_presente: ["dé", "des", "dé", "demos", "deis", "den"],
    imperativo_afirmativo: ["-", "da", "dé", "demos", "dad", "den"],
    participle: "dado",
    gerund: "dando",
  },
  saber: {
    presente: ["sé", "sabes", "sabe", "sabemos", "sabéis", "saben"],
    indefinido: ["supe", "supiste", "supo", "supimos", "supisteis", "supieron"],
    futuro: ["sabré", "sabrás", "sabrá", "sabremos", "sabréis", "sabrán"],
    condicional: ["sabría", "sabrías", "sabría", "sabríamos", "sabríais", "sabrían"],
    subjuntivo_presente: ["sepa", "sepas", "sepa", "sepamos", "sepáis", "sepan"],
    imperativo_afirmativo: ["-", "sé", "sepa", "sepamos", "sabed", "sepan"],
    participle: "sabido",
    gerund: "sabiendo",
  },
  querer: {
    presente: ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"],
    indefinido: ["quise", "quisiste", "quiso", "quisimos", "quisisteis", "quisieron"],
    futuro: ["querré", "querrás", "querrá", "querremos", "querréis", "querrán"],
    condicional: ["querría", "querrías", "querría", "querríamos", "querríais", "querrían"],
    subjuntivo_presente: ["quiera", "quieras", "quiera", "queramos", "queráis", "quieran"],
    participle: "querido",
    gerund: "queriendo",
  },
  traer: {
    presente: ["traigo", "traes", "trae", "traemos", "traéis", "traen"],
    indefinido: ["traje", "trajiste", "trajo", "trajimos", "trajisteis", "trajeron"],
    futuro: ["traeré", "traerás", "traerá", "traeremos", "traeréis", "traerán"],
    condicional: ["traería", "traerías", "traería", "traeríamos", "traeríais", "traerían"],
    subjuntivo_presente: ["traiga", "traigas", "traiga", "traigamos", "traigáis", "traigan"],
    imperativo_afirmativo: ["-", "trae", "traiga", "traigamos", "traed", "traigan"],
    participle: "traído",
    gerund: "trayendo",
  },
  caer: {
    presente: ["caigo", "caes", "cae", "caemos", "caéis", "caen"],
    indefinido: ["caí", "caíste", "cayó", "caímos", "caísteis", "cayeron"],
    subjuntivo_presente: ["caiga", "caigas", "caiga", "caigamos", "caigáis", "caigan"],
    participle: "caído",
    gerund: "cayendo",
  },
  oir: {
    presente: ["oigo", "oyes", "oye", "oímos", "oís", "oyen"],
    indefinido: ["oí", "oíste", "oyó", "oímos", "oísteis", "oyeron"],
    subjuntivo_presente: ["oiga", "oigas", "oiga", "oigamos", "oigáis", "oigan"],
    imperativo_afirmativo: ["-", "oye", "oiga", "oigamos", "oíd", "oigan"],
    participle: "oído",
    gerund: "oyendo",
  },
  valer: {
    presente: ["valgo", "vales", "vale", "valemos", "valéis", "valen"],
    futuro: ["valdré", "valdrás", "valdrá", "valdremos", "valdréis", "valdrán"],
    condicional: ["valdría", "valdrías", "valdría", "valdríamos", "valdríais", "valdrían"],
    subjuntivo_presente: ["valga", "valgas", "valga", "valgamos", "valgáis", "valgan"],
    imperativo_afirmativo: ["-", "val", "valga", "valgamos", "valed", "valgan"],
    participle: "valido",
    gerund: "valiendo",
  },
  caber: {
    presente: ["quepo", "cabes", "cabe", "cabemos", "cabéis", "caben"],
    indefinido: ["cupe", "cupiste", "cupo", "cupimos", "cupisteis", "cupieron"],
    futuro: ["cabré", "cabrás", "cabrá", "cabremos", "cabréis", "cabrán"],
    condicional: ["cabría", "cabrías", "cabría", "cabríamos", "cabríais", "cabrían"],
    subjuntivo_presente: ["quepa", "quepas", "quepa", "quepamos", "quepáis", "quepan"],
    participle: "cabido",
    gerund: "cabiendo",
  },
  andar: {
    indefinido: ["anduve", "anduviste", "anduvo", "anduvimos", "anduvisteis", "anduvieron"],
    participle: "andado",
    gerund: "andando",
  },

  // === Stem-changing verbs (e->ie) ===
  pensar: {
    presente: ["pienso", "piensas", "piensa", "pensamos", "pensáis", "piensan"],
    subjuntivo_presente: ["piense", "pienses", "piense", "pensemos", "penséis", "piensen"],
  },
  cerrar: {
    presente: ["cierro", "cierras", "cierra", "cerramos", "cerráis", "cierran"],
    subjuntivo_presente: ["cierre", "cierres", "cierre", "cerremos", "cerréis", "cierren"],
  },
  comenzar: {
    presente: ["comienzo", "comienzas", "comienza", "comenzamos", "comenzáis", "comienzan"],
    subjuntivo_presente: ["comience", "comiences", "comience", "comencemos", "comencéis", "comiencen"],
  },
  entender: {
    presente: ["entiendo", "entiendes", "entiende", "entendemos", "entendéis", "entienden"],
    subjuntivo_presente: ["entienda", "entiendas", "entienda", "entendamos", "entendáis", "entiendan"],
  },
  perder: {
    presente: ["pierdo", "pierdes", "pierde", "perdemos", "perdéis", "pierden"],
    subjuntivo_presente: ["pierda", "pierdas", "pierda", "perdamos", "perdáis", "pierdan"],
  },
  preferir: {
    presente: ["prefiero", "prefieres", "prefiere", "preferimos", "preferís", "prefieren"],
    indefinido: ["preferí", "preferiste", "prefirió", "preferimos", "preferisteis", "prefirieron"],
    subjuntivo_presente: ["prefiera", "prefieras", "prefiera", "prefiramos", "prefiráis", "prefieran"],
    gerund: "prefiriendo",
  },
  sentir: {
    presente: ["siento", "sientes", "siente", "sentimos", "sentís", "sienten"],
    indefinido: ["sentí", "sentiste", "sintió", "sentimos", "sentisteis", "sintieron"],
    subjuntivo_presente: ["sienta", "sientas", "sienta", "sintamos", "sintáis", "sientan"],
    gerund: "sintiendo",
  },
  mentir: {
    presente: ["miento", "mientes", "miente", "mentimos", "mentís", "mienten"],
    indefinido: ["mentí", "mentiste", "mintió", "mentimos", "mentisteis", "mintieron"],
    subjuntivo_presente: ["mienta", "mientas", "mienta", "mintamos", "mintáis", "mientan"],
    gerund: "mintiendo",
  },
  divertir: {
    presente: ["divierto", "diviertes", "divierte", "divertimos", "divertís", "divierten"],
    subjuntivo_presente: ["divierta", "diviertas", "divierta", "divirtamos", "divirtáis", "diviertan"],
    gerund: "divirtiendo",
  },
  convertir: {
    presente: ["convierto", "conviertes", "convierte", "convertimos", "convertís", "convierten"],
    subjuntivo_presente: ["convierta", "conviertas", "convierta", "convirtamos", "convirtáis", "conviertan"],
    gerund: "convirtiendo",
  },
  advertir: {
    presente: ["advierto", "adviertes", "advierte", "advertimos", "advertís", "advierten"],
    subjuntivo_presente: ["advierta", "adviertas", "advierta", "advirtamos", "advirtáis", "adviertan"],
    gerund: "advirtiendo",
  },
  sugerir: {
    presente: ["sugiero", "sugieres", "sugiere", "sugerimos", "sugerís", "sugieren"],
    subjuntivo_presente: ["sugiera", "sugieras", "sugiera", "sugiramos", "sugiráis", "sugieran"],
    gerund: "sugiriendo",
  },
  volver: {
    presente: ["vuelvo", "vuelves", "vuelve", "volvemos", "volvéis", "vuelven"],
    subjuntivo_presente: ["vuelva", "vuelvas", "vuelva", "volvamos", "volváis", "vuelvan"],
    participle: "vuelto",
  },
  devolver: {
    presente: ["devuelvo", "devuelves", "devuelve", "devolvemos", "devolvéis", "devuelven"],
    subjuntivo_presente: ["devuelva", "devuelvas", "devuelva", "devolvamos", "devolváis", "devuelvan"],
  },
  recordar: {
    presente: ["recuerdo", "recuerdas", "recuerda", "recordamos", "recordáis", "recuerdan"],
    subjuntivo_presente: ["recuerde", "recuerdes", "recuerde", "recordemos", "recordéis", "recuerden"],
  },
  contar: {
    presente: ["cuento", "cuentas", "cuenta", "contamos", "contáis", "cuentan"],
    subjuntivo_presente: ["cuente", "cuentes", "cuente", "contemos", "contéis", "cuenten"],
  },
  costar: {
    presente: ["cuesto", "cuestas", "cuesta", "costamos", "costáis", "cuestan"],
    subjuntivo_presente: ["cueste", "cuestes", "cueste", "costemos", "costéis", "cuesten"],
  },
  mostrar: {
    presente: ["muestro", "muestras", "muestra", "mostramos", "mostráis", "muestran"],
    subjuntivo_presente: ["muestre", "muestres", "muestre", "mostremos", "mostréis", "muestren"],
  },
  probar: {
    presente: ["pruebo", "pruebas", "prueba", "probamos", "probáis", "prueban"],
    subjuntivo_presente: ["pruebe", "pruebes", "pruebe", "probemos", "probéis", "prueben"],
  },
  soñar: {
    presente: ["sueño", "sueñas", "sueña", "soñamos", "soñáis", "sueñan"],
    subjuntivo_presente: ["sueñe", "sueñes", "sueñe", "soñemos", "soñéis", "sueñen"],
  },
  almorzar: {
    presente: ["almuerzo", "almuerzas", "almuerza", "almorzamos", "almorzáis", "almuerzan"],
    subjuntivo_presente: ["almuerce", "almuerces", "almuerce", "almorcemos", "almorcéis", "almuercen"],
  },
  mover: {
    presente: ["muevo", "mueves", "mueve", "movemos", "movéis", "mueven"],
    subjuntivo_presente: ["mueva", "muevas", "mueva", "movamos", "mováis", "muevan"],
  },
  morder: {
    presente: ["muerdo", "muerdes", "muerde", "mordemos", "mordéis", "muerden"],
    subjuntivo_presente: ["muerda", "muerdas", "muerda", "mordamos", "mordáis", "muerdan"],
  },
  sonar: {
    presente: ["sueno", "suenas", "suena", "sonamos", "sonáis", "suenan"],
    subjuntivo_presente: ["suene", "suenes", "suene", "sonemos", "sonéis", "suenen"],
  },

  // === Stem-changing verbs (o->ue) ===
  dormir: {
    presente: ["duermo", "duermes", "duerme", "dormimos", "dormís", "duermen"],
    indefinido: ["dormí", "dormiste", "durmió", "dormimos", "dormisteis", "durmieron"],
    subjuntivo_presente: ["duerma", "duermas", "duerma", "durmamos", "durmáis", "duerman"],
    gerund: "durmiendo",
    participle: "dormido",
  },
  morir: {
    presente: ["muero", "mueres", "muere", "morimos", "morís", "mueren"],
    indefinido: ["morí", "moriste", "murió", "morimos", "moristeis", "murieron"],
    subjuntivo_presente: ["muera", "mueras", "muera", "muramos", "muráis", "mueran"],
    gerund: "muriendo",
    participle: "muerto",
  },

  // === Stem-changing verbs (e->i) ===
  pedir: {
    presente: ["pido", "pides", "pide", "pedimos", "pedís", "piden"],
    indefinido: ["pedí", "pediste", "pidió", "pedimos", "pedisteis", "pidieron"],
    subjuntivo_presente: ["pida", "pidas", "pida", "pidamos", "pidáis", "pidan"],
    gerund: "pidiendo",
  },
  repetir: {
    presente: ["repito", "repites", "repite", "repetimos", "repetís", "repiten"],
    indefinido: ["repetí", "repetiste", "repitió", "repetimos", "repetisteis", "repitieron"],
    subjuntivo_presente: ["repita", "repitas", "repita", "repitamos", "repitáis", "repitan"],
    gerund: "repitiendo",
  },
  servir: {
    presente: ["sirvo", "sirves", "sirve", "servimos", "servís", "sirven"],
    indefinido: ["serví", "serviste", "sirvió", "servimos", "servisteis", "sirvieron"],
    subjuntivo_presente: ["sirva", "sirvas", "sirva", "sirvamos", "sirváis", "sirvan"],
    gerund: "sirviendo",
  },
  vestir: {
    presente: ["visto", "vistes", "viste", "vestimos", "vestís", "visten"],
    indefinido: ["vestí", "vestiste", "vistió", "vestimos", "vestisteis", "vistieron"],
    subjuntivo_presente: ["vista", "vistas", "vista", "vistamos", "vistáis", "vistan"],
    gerund: "vistiendo",
  },
  seguir: {
    presente: ["sigo", "sigues", "sigue", "seguimos", "seguís", "siguen"],
    indefinido: ["seguí", "seguiste", "siguió", "seguimos", "seguisteis", "siguieron"],
    subjuntivo_presente: ["siga", "sigas", "siga", "sigamos", "sigáis", "sigan"],
    gerund: "siguiendo",
  },
  conseguir: {
    presente: ["consigo", "consigues", "consigue", "conseguimos", "conseguís", "consiguen"],
    indefinido: ["conseguí", "conseguiste", "consiguió", "conseguimos", "conseguisteis", "consiguieron"],
    subjuntivo_presente: ["consiga", "consigas", "consiga", "consigamos", "consigáis", "consigan"],
    gerund: "consiguiendo",
  },
  elegir: {
    presente: ["elijo", "eliges", "elige", "elegimos", "elegís", "eligen"],
    indefinido: ["elegí", "elegiste", "eligió", "elegimos", "elegisteis", "eligieron"],
    subjuntivo_presente: ["elija", "elijas", "elija", "elijamos", "elijáis", "elijan"],
    gerund: "eligiendo",
  },
  corregir: {
    presente: ["corrijo", "corriges", "corrige", "corregimos", "corregís", "corrigen"],
    indefinido: ["corregí", "corregiste", "corrigió", "corregimos", "corregisteis", "corrigieron"],
    subjuntivo_presente: ["corrija", "corrijas", "corrija", "corrijamos", "corrijáis", "corrijan"],
    gerund: "corrigiendo",
  },
  competir: {
    presente: ["compito", "compites", "compite", "competimos", "competís", "compiten"],
    indefinido: ["competí", "competiste", "compitió", "competimos", "competisteis", "compitieron"],
    subjuntivo_presente: ["compita", "compitas", "compita", "compitamos", "compitáis", "compitan"],
    gerund: "compitiendo",
  },
  impedir: {
    presente: ["impido", "impides", "impide", "impedimos", "impedís", "impiden"],
    subjuntivo_presente: ["impida", "impidas", "impida", "impidamos", "impidáis", "impidan"],
    gerund: "impidiendo",
  },
  medir: {
    presente: ["mido", "mides", "mide", "medimos", "medís", "miden"],
    subjuntivo_presente: ["mida", "midas", "mida", "midamos", "midáis", "midan"],
    gerund: "midiendo",
  },
  despedir: {
    presente: ["despido", "despides", "despide", "despedimos", "despedís", "despiden"],
    indefinido: ["despedí", "despediste", "despidió", "despedimos", "despedisteis", "despidieron"],
    subjuntivo_presente: ["despida", "despidas", "despida", "despidamos", "despidáis", "despidan"],
    gerund: "despidiendo",
  },
  reir: {
    presente: ["río", "ríes", "ríe", "reímos", "reís", "ríen"],
    indefinido: ["reí", "reíste", "rió", "reímos", "reísteis", "rieron"],
    subjuntivo_presente: ["ría", "rías", "ría", "riamos", "riáis", "rían"],
    gerund: "riendo",
  },
  sonreir: {
    presente: ["sonrío", "sonríes", "sonríe", "sonreímos", "sonreís", "sonríen"],
    indefinido: ["sonreí", "sonreíste", "sonrió", "sonreímos", "sonreísteis", "sonrieron"],
    subjuntivo_presente: ["sonría", "sonrías", "sonría", "sonriamos", "sonriáis", "sonrían"],
    gerund: "sonriendo",
  },
  freir: {
    presente: ["frío", "fríes", "fríe", "freímos", "freís", "fríen"],
    indefinido: ["freí", "freíste", "frió", "freímos", "freísteis", "frieron"],
    subjuntivo_presente: ["fría", "frías", "fría", "friamos", "friáis", "frían"],
    gerund: "friendo",
    participle: "frito",
  },

  // === -car verbs (orthographic change c->qu before e) ===
  buscar: {
    presente: ["busco", "buscas", "busca", "buscamos", "buscáis", "buscan"],
    indefinido: ["busqué", "buscaste", "buscó", "buscamos", "buscasteis", "buscaron"],
    subjuntivo_presente: ["busque", "busques", "busque", "busquemos", "busquéis", "busquen"],
  },
  tocar: {
    presente: ["toco", "tocas", "toca", "tocamos", "tocáis", "tocan"],
    indefinido: ["toqué", "tocaste", "tocó", "tocamos", "tocasteis", "tocaron"],
    subjuntivo_presente: ["toque", "toques", "toque", "toquemos", "toquéis", "toquen"],
  },
  sacar: {
    presente: ["saco", "sacas", "saca", "sacamos", "sacáis", "sacan"],
    indefinido: ["saqué", "sacaste", "sacó", "sacamos", "sacasteis", "sacaron"],
    subjuntivo_presente: ["saque", "saques", "saque", "saquemos", "saquéis", "saquen"],
  },
  aparcar: {
    presente: ["aparco", "aparcas", "aparca", "aparcamos", "aparcáis", "aparcan"],
    indefinido: ["aparqué", "aparcaste", "aparcó", "aparcamos", "aparcasteis", "aparcaron"],
    subjuntivo_presente: ["aparque", "aparques", "aparque", "aparquemos", "aparquéis", "aparquen"],
  },
  pescar: {
    presente: ["pesco", "pescas", "pesca", "pescamos", "pescáis", "pescan"],
    indefinido: ["pesqué", "pescaste", "pescó", "pescamos", "pescasteis", "pescaron"],
    subjuntivo_presente: ["pesque", "pesques", "pesque", "pesquemos", "pesquéis", "pesquen"],
  },
  secar: {
    presente: ["seco", "secas", "seca", "secamos", "secáis", "secan"],
    indefinido: ["sequé", "secaste", "secó", "secamos", "secasteis", "secaron"],
    subjuntivo_presente: ["seque", "seques", "seque", "sequemos", "sequéis", "sequen"],
  },
  explicar: {
    presente: ["explico", "explicas", "explica", "explicamos", "explicáis", "explican"],
    indefinido: ["expliqué", "explicaste", "explicó", "explicamos", "explicasteis", "explicaron"],
    subjuntivo_presente: ["explique", "expliques", "explique", "expliquemos", "expliquéis", "expliquen"],
  },
  practicar: {
    presente: ["practico", "practicas", "practica", "practicamos", "practicáis", "practican"],
    indefinido: ["practiqué", "practicaste", "practicó", "practicamos", "practicasteis", "practicaron"],
    subjuntivo_presente: ["practique", "practiques", "practique", "practiquemos", "practiquéis", "practiquen"],
  },
  marcar: {
    presente: ["marco", "marcas", "marca", "marcamos", "marcáis", "marcan"],
    indefinido: ["marqué", "marcaste", "marcó", "marcamos", "marcasteis", "marcaron"],
    subjuntivo_presente: ["marque", "marques", "marque", "marquemos", "marquéis", "marquen"],
  },
  cargar: {
    presente: ["cargo", "cargas", "carga", "cargamos", "cargáis", "cargan"],
    indefinido: ["cargué", "cargaste", "cargó", "cargamos", "cargasteis", "cargaron"],
    subjuntivo_presente: ["cargue", "cargues", "cargue", "carguemos", "carguéis", "carguen"],
  },
  llegar: {
    presente: ["llego", "llegas", "llega", "llegamos", "llegáis", "llegan"],
    indefinido: ["llegué", "llegaste", "llegó", "llegamos", "llegasteis", "llegaron"],
    subjuntivo_presente: ["llegue", "llegues", "llegue", "lleguemos", "lleguéis", "lleguen"],
  },
  pagar: {
    presente: ["pago", "pagas", "paga", "pagamos", "pagáis", "pagan"],
    indefinido: ["pagué", "pagaste", "pagó", "pagamos", "pagasteis", "pagaron"],
    subjuntivo_presente: ["pague", "pagues", "pague", "paguemos", "paguéis", "paguen"],
  },
  jugar: {
    presente: ["juego", "juegas", "juega", "jugamos", "jugáis", "juegan"],
    subjuntivo_presente: ["juegue", "juegues", "juegue", "juguemos", "juguéis", "jueguen"],
  },
  averiguar: {
    presente: ["averiguo", "averiguas", "averigua", "averiguamos", "averiguáis", "averiguan"],
    subjuntivo_presente: ["averigüe", "averigües", "averigüe", "averigüemos", "averigüéis", "averigüen"],
  },

  // === -gar verbs (orthographic change g->gu before e) ===
  entregar: {
    presente: ["entrego", "entregas", "entrega", "entregamos", "entregáis", "entregan"],
    indefinido: ["entregué", "entregaste", "entregó", "entregamos", "entregasteis", "entregaron"],
    subjuntivo_presente: ["entregue", "entregues", "entregue", "entreguemos", "entreguéis", "entreguen"],
  },
  navegar: {
    presente: ["navego", "navegas", "navega", "navegamos", "navegáis", "navegan"],
    indefinido: ["navegué", "navegaste", "navegó", "navegamos", "navegasteis", "navegaron"],
    subjuntivo_presente: ["navegue", "navegues", "navegue", "naveguemos", "naveguéis", "naveguen"],
  },
  proteger: {
    presente: ["protejo", "proteges", "protege", "protegemos", "protegéis", "protegen"],
    subjuntivo_presente: ["proteja", "protejas", "proteja", "protejamos", "protejáis", "protejan"],
  },
  dirigir: {
    presente: ["dirijo", "diriges", "dirige", "dirigimos", "dirigís", "dirigen"],
    subjuntivo_presente: ["dirija", "dirijas", "dirija", "dirijamos", "dirijáis", "dirijan"],
    gerund: "dirigiendo",
  },
  exigir: {
    presente: ["exijo", "exiges", "exige", "exigimos", "exigís", "exigen"],
    subjuntivo_presente: ["exija", "exijas", "exija", "exijamos", "exijáis", "exijan"],
    gerund: "exigiendo",
  },
  coger: {
    presente: ["cojo", "coges", "coge", "cogemos", "cogéis", "cogen"],
    subjuntivo_presente: ["coja", "cojas", "coja", "cojamos", "cojáis", "cojan"],
  },
  escoger: {
    presente: ["escojo", "escoges", "escoge", "escogemos", "escogéis", "escogen"],
    subjuntivo_presente: ["escoja", "escojas", "escoja", "escojamos", "escojáis", "escojan"],
  },
  recoger: {
    presente: ["recojo", "recoges", "recoge", "recogemos", "recogéis", "recogen"],
    subjuntivo_presente: ["recoja", "recojas", "recoja", "recojamos", "recojáis", "recojan"],
  },
  fingir: {
    presente: ["finjo", "finges", "finge", "fingimos", "fingís", "fingen"],
    subjuntivo_presente: ["finja", "finjas", "finja", "finjamos", "finjáis", "finjan"],
    gerund: "fingiendo",
  },
  distinguir: {
    presente: ["distingo", "distingues", "distingue", "distinguimos", "distinguís", "distinguen"],
    subjuntivo_presente: ["distinga", "distingas", "distinga", "distingamos", "distingáis", "distingan"],
  },
  perseguir: {
    presente: ["persigo", "persigues", "persigue", "perseguimos", "perseguís", "persiguen"],
    indefinido: ["perseguí", "perseguiste", "persiguió", "perseguimos", "perseguisteis", "persiguieron"],
    subjuntivo_presente: ["persiga", "persigas", "persiga", "persigamos", "persigáis", "persigan"],
    gerund: "persiguiendo",
  },

  // === -zar verbs (orthographic change z->c before e) ===
  empezar: {
    presente: ["empiezo", "empiezas", "empieza", "empezamos", "empezáis", "empiezan"],
    indefinido: ["empecé", "empezaste", "empezó", "empezamos", "empezasteis", "empezaron"],
    subjuntivo_presente: ["empiece", "empieces", "empiece", "empecemos", "empecéis", "empiecen"],
  },
  cruzar: {
    presente: ["cruzo", "cruzas", "cruza", "cruzamos", "cruzáis", "cruzan"],
    indefinido: ["crucé", "cruzaste", "cruzó", "cruzamos", "cruzasteis", "cruzaron"],
    subjuntivo_presente: ["cruce", "cruces", "cruce", "crucemos", "crucéis", "crucen"],
  },
  alcanzar: {
    presente: ["alcanzo", "alcanzas", "alcanza", "alcanzamos", "alcanzáis", "alcanzan"],
    indefinido: ["alcancé", "alcanzaste", "alcanzó", "alcanzamos", "alcanzasteis", "alcanzaron"],
    subjuntivo_presente: ["alcance", "alcances", "alcance", "alcancemos", "alcancéis", "alcancen"],
  },
  avanzar: {
    presente: ["avanzo", "avanzas", "avanza", "avanzamos", "avanzáis", "avanzan"],
    indefinido: ["avancé", "avanzaste", "avanzó", "avanzamos", "avanzasteis", "avanzaron"],
    subjuntivo_presente: ["avance", "avances", "avance", "avancemos", "avancéis", "avancen"],
  },
  rechazar: {
    presente: ["rechazo", "rechazas", "rechaza", "rechazamos", "rechazáis", "rechazan"],
    indefinido: ["rechacé", "rechazaste", "rechazó", "rechazamos", "rechazasteis", "rechazaron"],
    subjuntivo_presente: ["rechace", "rechaces", "rechace", "rechacemos", "rechacéis", "rechacen"],
  },
  gozar: {
    presente: ["gozo", "gozas", "goza", "gozamos", "gozáis", "gozan"],
    indefinido: ["gocé", "gozaste", "gozó", "gozamos", "gozasteis", "gozaron"],
    subjuntivo_presente: ["goce", "goces", "goce", "gocemos", "gocéis", "gocen"],
  },
  lanzar: {
    presente: ["lanzo", "lanzas", "lanza", "lanzamos", "lanzáis", "lanzan"],
    indefinido: ["lancé", "lanzaste", "lanzó", "lanzamos", "lanzasteis", "lanzaron"],
    subjuntivo_presente: ["lance", "lances", "lance", "lancemos", "lancéis", "lancen"],
  },
  cazar: {
    presente: ["cazo", "cazas", "caza", "cazamos", "cazáis", "cazan"],
    indefinido: ["cacé", "cazaste", "cazó", "cazamos", "cazasteis", "cazaron"],
    subjuntivo_presente: ["cace", "caces", "cace", "cacemos", "cacéis", "cacen"],
  },
  abrazar: {
    presente: ["abrazo", "abrazas", "abraza", "abrazamos", "abrazáis", "abrazan"],
    indefinido: ["abracé", "abrazaste", "abrazó", "abrazamos", "abrazasteis", "abrazaron"],
    subjuntivo_presente: ["abrace", "abraces", "abrace", "abracemos", "abracéis", "abracen"],
  },
  tropezar: {
    presente: ["tropiezo", "tropiezas", "tropieza", "tropezamos", "tropezáis", "tropiezan"],
    indefinido: ["tropecé", "tropezaste", "tropezó", "tropezamos", "tropezasteis", "tropezaron"],
    subjuntivo_presente: ["tropiece", "tropieces", "tropiece", "tropecemos", "tropecéis", "tropiecen"],
  },

  // === -ducir verbs (indefinido -duj-, no j in 3rd person) ===
  conducir: {
    presente: ["conduzco", "conduces", "conduce", "conducimos", "conducís", "conducen"],
    indefinido: ["conduje", "condujiste", "condujo", "condujimos", "condujisteis", "condujeron"],
    subjuntivo_presente: ["conduzca", "conduzcas", "conduzca", "conduzcamos", "conduzcáis", "conduzcan"],
  },
  traducir: {
    presente: ["traduzco", "traduces", "traduce", "traducimos", "traducís", "traducen"],
    indefinido: ["traduje", "tradujiste", "tradujo", "tradujimos", "tradujisteis", "tradujeron"],
    subjuntivo_presente: ["traduzca", "traduzcas", "traduzca", "traduzcamos", "traduzcáis", "traduzcan"],
  },
  producir: {
    presente: ["produzco", "produces", "produce", "producimos", "producís", "producen"],
    indefinido: ["produje", "produjiste", "produjo", "produjimos", "produjisteis", "produjeron"],
    subjuntivo_presente: ["produzca", "produzcas", "produzca", "produzcamos", "produzcáis", "produzcan"],
  },
  reducir: {
    presente: ["reduzco", "reduces", "reduce", "reducimos", "reducís", "reducen"],
    indefinido: ["reduje", "redujiste", "redujo", "redujimos", "redujisteis", "redujeron"],
    subjuntivo_presente: ["reduzca", "reduzcas", "reduzca", "reduzcamos", "reduzcáis", "reduzcan"],
  },
  introducir: {
    presente: ["introduzco", "introduces", "introduce", "introducimos", "introducís", "introducen"],
    indefinido: ["introduje", "introdujiste", "introdujo", "introdujimos", "introdujisteis", "introdujeron"],
    subjuntivo_presente: ["introduzca", "introduzcas", "introduzca", "introduzcamos", "introduzcáis", "introduzcan"],
  },

  // === -uir verbs (y insertion) ===
  construir: {
    presente: ["construyo", "construyes", "construye", "construimos", "construís", "construyen"],
    indefinido: ["construí", "construiste", "construyó", "construimos", "construisteis", "construyeron"],
    subjuntivo_presente: ["construya", "construyas", "construya", "construyamos", "construyáis", "construyan"],
    gerund: "construyendo",
  },
  destruir: {
    presente: ["destruyo", "destruyes", "destruye", "destruimos", "destruís", "destruyen"],
    indefinido: ["destruí", "destruiste", "destruyó", "destruimos", "destruisteis", "destruyeron"],
    subjuntivo_presente: ["destruya", "destruyas", "destruya", "destruyamos", "destruyáis", "destruyan"],
    gerund: "destruyendo",
  },
  huir: {
    presente: ["huyo", "huyes", "huye", "huimos", "huís", "huyen"],
    indefinido: ["huí", "huiste", "huyó", "huimos", "huisteis", "huyeron"],
    subjuntivo_presente: ["huya", "huyas", "huya", "huyamos", "huyáis", "huyan"],
    gerund: "huyendo",
  },
  incluir: {
    presente: ["incluyo", "incluyes", "incluye", "incluimos", "incluís", "incluyen"],
    indefinido: ["incluí", "incluiste", "incluyó", "incluimos", "incluisteis", "incluyeron"],
    subjuntivo_presente: ["incluya", "incluyas", "incluya", "incluyamos", "incluyáis", "incluyan"],
    gerund: "incluyendo",
  },
  sustituir: {
    presente: ["sustituyo", "sustituyes", "sustituye", "sustituimos", "sustituís", "sustituyen"],
    indefinido: ["sustituí", "sustituiste", "sustituyó", "sustituimos", "sustituisteis", "sustituyeron"],
    subjuntivo_presente: ["sustituya", "sustituyas", "sustituya", "sustituyamos", "sustituyáis", "sustituyan"],
    gerund: "sustituyendo",
  },
  contribuir: {
    presente: ["contribuyo", "contribuyes", "contribuye", "contribuimos", "contribuís", "contribuyen"],
    indefinido: ["contribuí", "contribuiste", "contribuyó", "contribuimos", "contribuisteis", "contribuyeron"],
    subjuntivo_presente: ["contribuya", "contribuyas", "contribuya", "contribuyamos", "contribuyáis", "contribuyan"],
    gerund: "contribuyendo",
  },
  distribuir: {
    presente: ["distribuyo", "distribuyes", "distribuye", "distribuimos", "distribuís", "distribuyen"],
    indefinido: ["distribuí", "distribuiste", "distribuyó", "distribuimos", "distribuisteis", "distribuyeron"],
    subjuntivo_presente: ["distribuya", "distribuyas", "distribuya", "distribuyamos", "distribuyáis", "distribuyan"],
    gerund: "distribuyendo",
  },
  atribuir: {
    presente: ["atribuyo", "atribuyes", "atribuye", "atribuimos", "atribuís", "atribuyen"],
    indefinido: ["atribuí", "atribuiste", "atribuyó", "atribuimos", "atribuisteis", "atribuyeron"],
    subjuntivo_presente: ["atribuya", "atribuyas", "atribuya", "atribuyamos", "atribuyáis", "atribuyan"],
    gerund: "atribuyendo",
  },

  // === -cer/-cir verbs (yo: -zco) ===
  conocer: {
    presente: ["conozco", "conoces", "conoce", "conocemos", "conocéis", "conocen"],
    subjuntivo_presente: ["conozca", "conozcas", "conozca", "conozcamos", "conozcáis", "conozcan"],
  },
  reconocer: {
    presente: ["reconozco", "reconoces", "reconoce", "reconocemos", "reconocéis", "reconocen"],
    subjuntivo_presente: ["reconozca", "reconozcas", "reconozca", "reconozcamos", "reconozcáis", "reconozcan"],
  },
  aparecer: {
    presente: ["aparezco", "apareces", "aparece", "aparecemos", "aparecéis", "aparecen"],
    subjuntivo_presente: ["aparezca", "aparezcas", "aparezca", "aparezcamos", "aparezcáis", "aparezcan"],
  },
  desaparecer: {
    presente: ["desaparezco", "desapareces", "desaparece", "desaparecemos", "desaparecéis", "desaparecen"],
    subjuntivo_presente: ["desaparezca", "desaparezcas", "desaparezca", "desaparezcamos", "desaparezcáis", "desaparezcan"],
  },
  nacer: {
    presente: ["nazco", "naces", "nace", "nacemos", "nacéis", "nacen"],
    subjuntivo_presente: ["nazca", "nazcas", "nazca", "nazcamos", "nazcáis", "nazcan"],
  },
  crecer: {
    presente: ["crezco", "creces", "crece", "crecemos", "crecéis", "crecen"],
    subjuntivo_presente: ["crezca", "crezcas", "crezca", "crezcamos", "crezcáis", "crezcan"],
  },
  ofrecer: {
    presente: ["ofrezco", "ofreces", "ofrece", "ofrecemos", "ofrecéis", "ofrecen"],
    subjuntivo_presente: ["ofrezca", "ofrezcas", "ofrezca", "ofrezcamos", "ofrezcáis", "ofrezcan"],
  },
  parecer: {
    presente: ["parezco", "pareces", "parece", "parecemos", "parecéis", "parecen"],
    subjuntivo_presente: ["parezca", "parezcas", "parezca", "parezcamos", "parezcáis", "parezcan"],
  },
  merecer: {
    presente: ["merezco", "mereces", "merece", "merecemos", "merecéis", "merecen"],
    subjuntivo_presente: ["merezca", "merezcas", "merezca", "merezcamos", "merezcáis", "merezcan"],
  },
  obedecer: {
    presente: ["obedezco", "obedeces", "obedece", "obedecemos", "obedecéis", "obedecen"],
    subjuntivo_presente: ["obedezca", "obedezcas", "obedezca", "obedezcamos", "obedezcáis", "obedezcan"],
  },
  pertenecer: {
    presente: ["pertenezco", "perteneces", "pertenece", "pertenecemos", "pertenecéis", "pertenecen"],
    subjuntivo_presente: ["pertenezca", "pertenezcas", "pertenezca", "pertenezcamos", "pertenezcáis", "pertenezcan"],
  },
  carecer: {
    presente: ["carezco", "careces", "carece", "carecemos", "carecéis", "carecen"],
    subjuntivo_presente: ["carezca", "carezcas", "carezca", "carezcamos", "carezcáis", "carezcan"],
  },
  agradecer: {
    presente: ["agradezco", "agradeces", "agradece", "agradecemos", "agradecéis", "agradecen"],
    subjuntivo_presente: ["agradezca", "agradezcas", "agradezca", "agradezcamos", "agradezcáis", "agradezcan"],
  },
  establecer: {
    presente: ["establezco", "estableces", "establece", "establecemos", "establecéis", "establecen"],
    subjuntivo_presente: ["establezca", "establezcas", "establezca", "establezcamos", "establezcáis", "establezcan"],
  },

  // === Irregular participles ===
  // Note: abrir → abierto, escribir → escrito are handled by generatedParticiple
  // These are listed here for completeness but the app handles them correctly
  abrir: { participle: "abierto" },
  cubrir: { participle: "cubierto" },
  descubrir: { participle: "descubierto" },
  escribir: { participle: "escrito" },
  hacer: { participle: "hecho" },
  decir: { participle: "dicho" },
  poner: { participle: "puesto" },
  romper: { participle: "roto" },
  ver: { participle: "visto" },
  volver: { participle: "vuelto" },
  resolver: { participle: "resuelto" },
  morir: { participle: "muerto" },
  freir: { participle: "frito" },
  imprimir: { participle: "impreso" },
  pudrir: { participle: "podrido" },
  satisfacer: { participle: "satisfecho" },
  absolver: { participle: "absuelto" },
  // caído/oído need accent on í (stem ends in vowel) - app bug: generates "caido"/"oido"
  caer: { participle: "caído" },
  oir: { participle: "oído" },
  creer: { participle: "creído" },
  leer: { participle: "leído" },
  traer: { participle: "traído" },

  // === More compound verbs with poner/venir/tener ===
  suponer: {
    futuro: ["supondré", "supondrás", "supondrá", "supondremos", "supondréis", "supondrán"],
    condicional: ["supondría", "supondrías", "supondría", "supondríamos", "supondríais", "supondrían"],
  },
  proponer: {
    futuro: ["propondré", "propondrás", "propondrá", "propondremos", "propondréis", "propondrán"],
    condicional: ["propondría", "propondrías", "propondría", "propondríamos", "propondríais", "propondrían"],
  },
  detener: {
    futuro: ["detendré", "detendrás", "detendrá", "detendremos", "detendréis", "detendrán"],
    condicional: ["detendría", "detendrías", "detendría", "detendríamos", "detendríais", "detendrían"],
  },
  contener: {
    futuro: ["contendré", "contendrás", "contendrá", "contendremos", "contendréis", "contendrán"],
    condicional: ["contendría", "contendrías", "contendría", "contendríamos", "contendríais", "contendrían"],
  },
  mantener: {
    futuro: ["mantendré", "mantendrás", "mantendrá", "mantendremos", "mantendréis", "mantendrán"],
    condicional: ["mantendría", "mantendrías", "mantendría", "mantendríamos", "mantendríais", "mantendrían"],
  },
  obtener: {
    futuro: ["obtendré", "obtendrás", "obtendrá", "obtendremos", "obtendréis", "obtendrán"],
    condicional: ["obtendría", "obtendrías", "obtendría", "obtendríamos", "obtendríais", "obtendrían"],
  },
  entretener: {
    futuro: ["entretendré", "entretendrás", "entretendrá", "entretendremos", "entretendréis", "entretendrán"],
    condicional: ["entretendría", "entretendrías", "entretendría", "entretendríamos", "entretendríais", "entretendrían"],
  },

  // === deshacer ===
  deshacer: {
    futuro: ["desharé", "desharás", "deshará", "desharemos", "desharéis", "desharán"],
    condicional: ["desharía", "desharías", "desharía", "desharíamos", "desharíais", "desharían"],
  },

  // === salir ===
  salir: {
    presente: ["salgo", "sales", "sale", "salimos", "salís", "salen"],
    futuro: ["saldré", "saldrás", "saldrá", "saldremos", "saldréis", "saldrán"],
    condicional: ["saldría", "saldrías", "saldría", "saldríamos", "saldríais", "saldrían"],
    imperativo_afirmativo: ["-", "sal", "salga", "salgamos", "salid", "salgan"],
  },

  // === verbs with gerund irregularities ===
  leer: {
    gerund: "leyendo",
  },
  creer: {
    gerund: "creyendo",
  },
  poseer: {
    gerund: "poseyendo",
  },
  proveer: {
    gerund: "proveyendo",
  },
  oler: {
    presente: ["huelo", "hueles", "huele", "olemos", "oléis", "huelen"],
    subjuntivo_presente: ["huela", "huelas", "huela", "olamos", "oláis", "huelan"],
    imperativo_afirmativo: ["-", "huele", "huela", "olamos", "oled", "huelan"],
    participle: "olido",
    gerund: "oliendo",
  },
  adquirir: {
    presente: ["adquiero", "adquieres", "adquiere", "adquirimos", "adquirís", "adquieren"],
    subjuntivo_presente: ["adquiera", "adquieras", "adquiera", "adquiramos", "adquiráis", "adquieran"],
    imperativo_afirmativo: ["-", "adquiere", "adquiera", "adquiramos", "adquirid", "adquieran"],
    participle: "adquirido",
    gerund: "adquiriendo",
  },
  cocer: {
    presente: ["cuezo", "cueces", "cuece", "cocemos", "cocéis", "cuecen"],
    subjuntivo_presente: ["cueza", "cuezas", "cueza", "cozamos", "cozáis", "cuezan"],
    imperativo_afirmativo: ["-", "cuece", "cueza", "cozamos", "coced", "cuezan"],
    participle: "cocido",
    gerund: "cociendo",
  },
  llover: {
    presente: ["lluevo", "llueves", "llueve", "llovemos", "llovéis", "llueven"],
    subjuntivo_presente: ["llueva", "lluevas", "llueva", "llovamos", "llováis", "lluevan"],
    participle: "llovido",
    gerund: "lloviendo",
  },
  prever: {
    presente: ["preveo", "prevés", "prevé", "prevemos", "prevéis", "prevén"],
    subjuntivo_presente: ["prevea", "preveas", "prevea", "preveamos", "preveáis", "prevean"],
    imperativo_afirmativo: ["-", "prevé", "prevea", "preveamos", "preved", "prevean"],
    participle: "previsto",
    gerund: "previendo",
  },
};

const PAST_SUBJUNCTIVE_REFERENCE = {
  hablar: {
    imperfecto: ["hablara", "hablaras", "hablara", "habláramos", "hablarais", "hablaran"],
    futuro: ["hablare", "hablares", "hablare", "habláremos", "hablareis", "hablaren"],
  },
  comer: {
    imperfecto: ["comiera", "comieras", "comiera", "comiéramos", "comierais", "comieran"],
    futuro: ["comiere", "comieres", "comiere", "comiéremos", "comiereis", "comieren"],
  },
  vivir: {
    imperfecto: ["viviera", "vivieras", "viviera", "viviéramos", "vivierais", "vivieran"],
    futuro: ["viviere", "vivieres", "viviere", "viviéremos", "viviereis", "vivieren"],
  },
  ser: {
    imperfecto: ["fuera", "fueras", "fuera", "fuéramos", "fuerais", "fueran"],
    futuro: ["fuere", "fueres", "fuere", "fuéremos", "fuereis", "fueren"],
  },
  tener: {
    imperfecto: ["tuviera", "tuvieras", "tuviera", "tuviéramos", "tuvierais", "tuvieran"],
    futuro: ["tuviere", "tuvieres", "tuviere", "tuviéremos", "tuviereis", "tuvieren"],
  },
  decir: {
    imperfecto: ["dijera", "dijeras", "dijera", "dijéramos", "dijerais", "dijeran"],
    futuro: ["dijere", "dijeres", "dijere", "dijéremos", "dijereis", "dijeren"],
  },
  pedir: {
    imperfecto: ["pidiera", "pidieras", "pidiera", "pidiéramos", "pidierais", "pidieran"],
    futuro: ["pidiere", "pidieres", "pidiere", "pidiéremos", "pidiereis", "pidieren"],
  },
  oler: {
    imperfecto: ["oliera", "olieras", "oliera", "oliéramos", "olierais", "olieran"],
    futuro: ["oliere", "olieres", "oliere", "oliéremos", "oliereis", "olieren"],
  },
};

// ─── Validation logic ───────────────────────────────────────────────────────
const issues = [];
let totalChecked = 0;

for (const verb of BASE_VERBS) {
  const translation = IRREGULARS[verb]?.ru || TRANSLATIONS[verb];
  if (!translation || translation.trim() === "") {
    issues.push({
      verb,
      tense: "translation",
      person: "-",
      expected: "прямой русский перевод",
      actual: translation || "(missing)",
      severity: "high",
    });
  }
}

const SEARCH_CASES = [
  { query: "tener", first: "tener", count: 1 },
  { query: "tengo", first: "tener", count: 1 },
  { query: "делать", first: "hacer", count: 1 },
  { query: "hecho", first: "hacer", count: 1 },
  { query: "покупать", first: "comprar", count: 1 },
  { query: "reír", first: "reir", count: 1 },
  { query: "tenre", first: "tener" },
  { query: "sd", count: 0 },
];

for (const testCase of SEARCH_CASES) {
  state.query = testCase.query;
  const results = filteredVerbs();
  if (testCase.first && results[0] !== testCase.first) {
    issues.push({
      verb: testCase.query,
      tense: "search",
      person: "first result",
      expected: testCase.first,
      actual: results[0] || "(none)",
      severity: "high",
    });
  }
  if (Number.isInteger(testCase.count) && results.length !== testCase.count) {
    issues.push({
      verb: testCase.query,
      tense: "search",
      person: "result count",
      expected: String(testCase.count),
      actual: String(results.length),
      severity: "high",
    });
  }
}

function check(verb, tense, index, expected, actual, severity = "high") {
  if (expected === undefined || expected === null) return;
  if (actual === undefined || actual === null) {
    issues.push({ verb, tense, person: PEOPLE[index] || index, expected, actual: "(missing)", severity });
    return;
  }
  if (expected !== actual) {
    issues.push({ verb, tense, person: PEOPLE[index] || index, expected, actual, severity });
  }
}

function checkArray(verb, tense, expectedArr, actualArr, severity = "high") {
  if (!expectedArr || !actualArr) return;
  for (let i = 0; i < expectedArr.length; i++) {
    check(verb, tense, i, expectedArr[i], actualArr[i], severity);
  }
}

function checkScalar(verb, label, expected, actual, severity = "high") {
  if (expected && actual && expected !== actual) {
    issues.push({ verb, tense: label, person: "-", expected, actual, severity });
  }
}

// ─── Run validations against reference data ─────────────────────────────────
const checkedVerbs = new Set();

for (const [verb, refData] of Object.entries(REFERENCE)) {
  if (!BASE_VERBS.includes(verb) && !isReflexive(verb)) continue;

  checkedVerbs.add(verb);
  const info = verbInfo(verb);

  // Presente
  if (refData.presente) {
    const actual = info.forms.presente;
    checkArray(verb, "presente", refData.presente, actual, "high");
  }

  // Indefinido
  if (refData.indefinido) {
    const actual = info.forms.indefinido;
    checkArray(verb, "indefinido", refData.indefinido, actual, "high");
  }

  // Imperfecto
  if (refData.imperfecto) {
    const actual = info.forms.imperfecto;
    checkArray(verb, "imperfecto", refData.imperfecto, actual, "high");
  }

  // Futuro
  if (refData.futuro) {
    const actual = info.forms.futuro;
    checkArray(verb, "futuro", refData.futuro, actual, "high");
  }

  // Condicional
  if (refData.condicional) {
    const actual = info.forms.condicional;
    checkArray(verb, "condicional", refData.condicional, actual, "high");
  }

  // Subjuntivo presente
  if (refData.subjuntivo_presente) {
    const actual = info.forms.subjuntivo_presente;
    checkArray(verb, "subjuntivo_presente", refData.subjuntivo_presente, actual, "high");
  }

  if (refData.subjuntivo_imperfecto) {
    checkArray(verb, "subjuntivo_imperfecto", refData.subjuntivo_imperfecto, info.forms.subjuntivo_imperfecto, "high");
  }

  if (refData.subjuntivo_futuro) {
    checkArray(verb, "subjuntivo_futuro", refData.subjuntivo_futuro, info.forms.subjuntivo_futuro, "high");
  }

  // Imperativo afirmativo
  if (refData.imperativo_afirmativo) {
    const actual = info.forms.imperativo_afirmativo;
    checkArray(verb, "imperativo_afirmativo", refData.imperativo_afirmativo, actual, "high");
  }

  // Participio
  if (refData.participle) {
    checkScalar(verb, "participio", refData.participle, info.participle, "high");
  }

  // Gerund
  if (refData.gerund) {
    checkScalar(verb, "gerundio", refData.gerund, info.gerund, "medium");
  }
}

for (const [verb, expected] of Object.entries(PAST_SUBJUNCTIVE_REFERENCE)) {
  if (!BASE_VERBS.includes(verb)) continue;
  checkedVerbs.add(verb);
  const forms = verbInfo(verb).forms;
  checkArray(verb, "subjuntivo_imperfecto", expected.imperfecto, forms.subjuntivo_imperfecto, "high");
  checkArray(verb, "subjuntivo_futuro", expected.futuro, forms.subjuntivo_futuro, "high");
}

// ─── Additional pattern-based checks ────────────────────────────────────────
// Check regular verbs produce correct regular forms
const regularVerbs = ["hablar", "comer", "vivir", "trabajar", "estudiar"];
for (const verb of regularVerbs) {
  if (!BASE_VERBS.includes(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const type = verbType(verb);

  // Presente
  const presEndings = TENSES[0].endings[type];
  const expectedPresent = presEndings.map((e) => stem(verb) + e);
  checkArray(verb, "presente", expectedPresent, info.forms.presente, "high");

  // Indefinido
  const indefEndings = TENSES[2].endings[type];
  const expectedIndef = indefEndings.map((e) => stem(verb) + e);
  checkArray(verb, "indefinido", expectedIndef, info.forms.indefinido, "high");

  // Imperfecto
  const imperfEndings = TENSES[3].endings[type];
  const expectedImperf = imperfEndings.map((e) => stem(verb) + e);
  checkArray(verb, "imperfecto", expectedImperf, info.forms.imperfecto, "high");

  // Futuro
  const futEndings = TENSES.find(t => t.id === "futuro").endings.all;
  const expectedFut = futEndings.map((e) => verb + e);
  checkArray(verb, "futuro", expectedFut, info.forms.futuro, "high");

  // Condicional
  const condEndings = TENSES.find(t => t.id === "condicional").endings.all;
  const expectedCond = condEndings.map((e) => verb + e);
  checkArray(verb, "condicional", expectedCond, info.forms.condicional, "high");

  // Participio
  const expectedPart = stem(verb) + (type === "ar" ? "ado" : "ido");
  checkScalar(verb, "participio", expectedPart, info.participle, "high");

  // Gerund
  const expectedGer = stem(verb) + (type === "ar" ? "ando" : "iendo");
  checkScalar(verb, "gerundio", expectedGer, info.gerund, "medium");
}

// ─── Check orthographic -car/-gar/-zar verbs ────────────────────────────────
const carVerbs = ["buscar", "tocar", "sacar", "explicar", "practicar", "marcar", "aparcar", "pescar"];
const garVerbs = ["llegar", "pagar", "cargar", "jugar", "entregar", "navegar", "averiguar"];
const zarVerbs = ["empezar", "cruzar", "alcanzar", "avanzar", "rechazar", "gozar", "lanzar", "cazar", "abrazar", "tropezar"];

for (const verb of [...carVerbs, ...garVerbs, ...zarVerbs]) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const refData = REFERENCE[verb];
  if (!refData) continue;

  if (refData.presente) {
    checkArray(verb, "presente", refData.presente, info.forms.presente, "high");
  }
  if (refData.indefinido) {
    checkArray(verb, "indefinido", refData.indefinido, info.forms.indefinido, "high");
  }
  if (refData.subjuntivo_presente) {
    checkArray(verb, "subjuntivo_presente", refData.subjuntivo_presente, info.forms.subjuntivo_presente, "high");
  }
}

// ─── Check -ducir verbs ─────────────────────────────────────────────────────
const ducirVerbs = ["conducir", "traducir", "producir", "reducir", "introducir"];
for (const verb of ducirVerbs) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const refData = REFERENCE[verb];
  if (!refData) continue;

  if (refData.presente) {
    checkArray(verb, "presente", refData.presente, info.forms.presente, "high");
  }
  if (refData.indefinido) {
    checkArray(verb, "indefinido", refData.indefinido, info.forms.indefinido, "high");
  }
  if (refData.subjuntivo_presente) {
    checkArray(verb, "subjuntivo_presente", refData.subjuntivo_presente, info.forms.subjuntivo_presente, "high");
  }
}

// ─── Check -uir verbs ───────────────────────────────────────────────────────
const uirVerbs = ["construir", "destruir", "huir", "incluir", "sustituir", "contribuir", "distribuir", "atribuir"];
for (const verb of uirVerbs) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const refData = REFERENCE[verb];
  if (!refData) continue;

  if (refData.presente) {
    checkArray(verb, "presente", refData.presente, info.forms.presente, "high");
  }
  if (refData.indefinido) {
    checkArray(verb, "indefinido", refData.indefinido, info.forms.indefinido, "high");
  }
  if (refData.subjuntivo_presente) {
    checkArray(verb, "subjuntivo_presente", refData.subjuntivo_presente, info.forms.subjuntivo_presente, "high");
  }
  if (refData.gerund) {
    checkScalar(verb, "gerundio", refData.gerund, info.gerund, "medium");
  }
}

// ─── Check -cer/-cir verbs (yo: -zco) ───────────────────────────────────────
const cerVerbs = ["conocer", "reconocer", "aparecer", "desaparecer", "nacer", "crecer", "ofrecer", "parecer", "merecer", "obedecer", "pertenecer", "carecer", "agradecer", "establecer"];
for (const verb of cerVerbs) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const refData = REFERENCE[verb];
  if (!refData) continue;

  if (refData.presente) {
    checkArray(verb, "presente", refData.presente, info.forms.presente, "high");
  }
  if (refData.subjuntivo_presente) {
    checkArray(verb, "subjuntivo_presente", refData.subjuntivo_presente, info.forms.subjuntivo_presente, "high");
  }
}

// ─── Check irregular participles ────────────────────────────────────────────
// Note: abrir→abierto and escribir→escrito are correctly handled by generatedParticiple
// so we don't check them here to avoid false positives
const irregularParticiples = {
  cubrir: "cubierto", descubrir: "descubierto",
  hacer: "hecho", decir: "dicho",
  poner: "puesto", romper: "roto", ver: "visto", volver: "vuelto",
  resolver: "resuelto", morir: "muerto", freir: "frito",
  imprimir: "impreso", pudrir: "podrido", satisfacer: "satisfecho",
  absolver: "absuelto",
  // -er/-ir verbs with vowel stem need accent: le→leído, cre→creído, tra→traído, o→oído
  leer: "leído", creer: "creído", traer: "traído", oir: "oído", caer: "caído",
};
for (const [verb, expected] of Object.entries(irregularParticiples)) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const actual = participle(verb);
  checkScalar(verb, "participio", expected, actual, "high");
}

// ─── Check irregular future stems ───────────────────────────────────────────
const irregularFutureVerbs = {
  caber: "cabr", decir: "dir", haber: "habr", hacer: "har",
  poder: "podr", querer: "querr", saber: "sabr",
  poner: "pondr", salir: "saldr", tener: "tendr",
  valer: "valdr", venir: "vendr",
};
for (const [verb, expectedStem] of Object.entries(irregularFutureVerbs)) {
  if (!BASE_VERBS.includes(verb)) continue;
  const actualStem = irregularFutureStem(verb);
  checkScalar(verb, "futuro_stem", expectedStem, actualStem, "high");
}

// ─── Check compound verbs (prefix + base) ───────────────────────────────────
const compoundChecks = [
  { verb: "suponer", base: "poner", tense: "futuro" },
  { verb: "proponer", base: "poner", tense: "futuro" },
  { verb: "detener", base: "tener", tense: "futuro" },
  { verb: "contener", base: "tener", tense: "futuro" },
  { verb: "mantener", base: "tener", tense: "futuro" },
  { verb: "obtener", base: "tener", tense: "futuro" },
  { verb: "entretener", base: "tener", tense: "futuro" },
  { verb: "deshacer", base: "hacer", tense: "futuro" },
];
for (const { verb, base, tense } of compoundChecks) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const refData = REFERENCE[verb];
  if (!refData || !refData[tense]) continue;
  const info = verbInfo(verb);
  checkArray(verb, tense, refData[tense], info.forms[tense], "high");
}

// ─── Check gerund irregularities ────────────────────────────────────────────
const gerundChecks = {
  leer: "leyendo", creer: "creyendo", poseer: "poseyendo",
  traer: "trayendo", caer: "cayendo", oir: "oyendo",
  ir: "yendo",
};
for (const [verb, expected] of Object.entries(gerundChecks)) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const actual = gerund(verb);
  checkScalar(verb, "gerundio", expected, actual, "medium");
}

// ─── Check yo-irregular verbs ───────────────────────────────────────────────
const yoIrregularChecks = {
  tener: "tengo", poner: "pongo", venir: "vengo", salir: "salgo",
  hacer: "hago", decir: "digo", traer: "traigo", caer: "caigo",
  oir: "oigo", valer: "valgo", conocer: "conozco", saber: "sé",
  dar: "doy", caber: "quepo",
};
for (const [verb, expected] of Object.entries(yoIrregularChecks)) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  check(verb, "presente", 0, expected, info.forms.presente[0], "high");
}

// ─── Imperativo afirmativo checks ───────────────────────────────────────────
const imperativoChecks = {
  ser: "sé", ir: "ve", tener: "ten", venir: "ven",
  poner: "pon", hacer: "haz", decir: "di", salir: "sal",
  ver: "ve", dar: "da", estar: "está", saber: "sé",
  valer: "val",
};
for (const [verb, expectedTu] of Object.entries(imperativoChecks)) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  check(verb, "imperativo_afirmativo", 1, expectedTu, info.forms.imperativo_afirmativo[1], "high");
}

// ─── Output report ──────────────────────────────────────────────────────────
const severityOrder = { high: 0, medium: 1, low: 2 };
issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.verb.localeCompare(b.verb));

const highIssues = issues.filter((i) => i.severity === "high");
const mediumIssues = issues.filter((i) => i.severity === "medium");
const lowIssues = issues.filter((i) => i.severity === "low");

// Summary by category
const categories = {};
for (const issue of issues) {
  const cat = issue.tense.replace(/_.*$/, "");
  if (!categories[cat]) categories[cat] = { high: 0, medium: 0, low: 0 };
  categories[cat][issue.severity]++;
}

console.log("=".repeat(72));
console.log("SPANISH GRAMMAR CONJUGATION VALIDATION REPORT");
console.log("=".repeat(72));
console.log(`Total verbs checked: ${checkedVerbs.size}`);
console.log(`Total reference checks: ${Object.keys(REFERENCE).length}`);
console.log(`Translations complete: ${BASE_VERBS.length - issues.filter((issue) => issue.tense === "translation").length}/${BASE_VERBS.length}`);
console.log(`Search cases checked: ${SEARCH_CASES.length}`);
console.log(`Total issues found: ${issues.length}`);
console.log(`  High severity:   ${highIssues.length}`);
console.log(`  Medium severity: ${mediumIssues.length}`);
console.log(`  Low severity:    ${lowIssues.length}`);
console.log("");

if (issues.length > 0) {
  console.log("-".repeat(72));
  console.log("ISSUES BY CATEGORY:");
  console.log("-".repeat(72));
  for (const [cat, counts] of Object.entries(categories).sort()) {
    const total = counts.high + counts.medium + counts.low;
    console.log(`  ${cat}: ${total} issues (high: ${counts.high}, medium: ${counts.medium}, low: ${counts.low})`);
  }
  console.log("");

  console.log("-".repeat(72));
  console.log("ALL ISSUES:");
  console.log("-".repeat(72));
  for (const issue of issues) {
    const sev = issue.severity.toUpperCase().padEnd(7);
    console.log(`  [${sev}] ${issue.verb} / ${issue.tense} / ${issue.person}`);
    console.log(`          Expected: "${issue.expected}"`);
    console.log(`          Got:      "${issue.actual}"`);
  }
  console.log("");
}

console.log("=".repeat(72));
if (highIssues.length === 0) {
  console.log("RESULT: PASS (no high-severity issues)");
  console.log("=".repeat(72));
  process.exit(0);
} else {
  console.log(`RESULT: FAIL (${highIssues.length} high-severity issue(s) found)`);
  console.log("=".repeat(72));
  process.exit(1);
}
