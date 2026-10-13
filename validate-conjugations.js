#!/usr/bin/env node
// Spanish Grammar Conjugation Validation Script
// Usage: node validate-conjugations.js [path/to/spanish-grammar.html]

const fs = require("fs");
const path = require("path");

// ─── Extract JS from HTML ───────────────────────────────────────────────────
const htmlPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "spanish-grammar.html");
const html = fs.readFileSync(htmlPath, "utf-8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("ERROR: Could not find <script> tag in HTML file");
  process.exit(1);
}
// Полный текст скрипта нужен статическим проверкам (см. раздел «Static integrity checks»).
const fullScriptCode = scriptMatch[1];
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
  jsCode + "\nreturn { IRREGULARS, RAW_VERBS, BASE_VERBS, TENSES, TENSE_EXAMPLES, PEOPLE, HABER_FORMS, TRANSLATIONS, DISPLAY_INFINITIVES, COMMON_VERB_SUGGESTIONS, VERB_TENSE_GROUPS, verbType, stem, regularPresent, regularIndefinido, regularImperfecto, regularFuture, regularCondicional, regularSubjuntivoPresente, regularImperativoAfirmativo, participle, gerund, generatedPresent, generatedSubjuntivoPresente, irregularIndefinido, irregularFutureStem, thirdPersonStemChangeIndefinido, orthographicIndefinido, generatedParticiple, hasStemChange, stemChange, formsFor, verbInfo, regularPresentPattern, regularIndefinidoPattern, regularFuturePattern, regularCondicionalPattern, regularSubjuntivoPresentePattern, regularImperativoAfirmativoPattern, regularParticiplePattern, irregularIndefinidoStem, regularSubjuntivoImperfecto, regularSubjuntivoFuturo, compound, compoundPattern, isReflexive, baseVerb, tenseById, state, filteredVerbs, searchMatchFor, normalize, generateInfinitiveQuestions, generateConjugationQuestions, evaluateAnswer, cardAccuracy, isCardMastered, cardNeedsReview, cardsForFilter, studyCardCounts, validateData, normalizeTextbookAnswer, diagnoseVerbMistake, verbSynonyms, reflexivePair, scheduleFormReview, dueFormReviews, dayKey, addDays, staticChecksData: { TRANSLATIONS, TENSES, TENSE_EXAMPLES, TENSE_LESSONS, USEFUL_TABLES, TABLE_GROUPS, MOODS, LEARNING_MODULES, TEXTBOOK_LESSONS, BASE_VERBS, LEARNING_AFTER_B2 } };"
);
const api = fn(...Object.values(sandbox));

const {
  IRREGULARS, TRANSLATIONS, BASE_VERBS, TENSES, TENSE_EXAMPLES, PEOPLE, VERB_TENSE_GROUPS,
  COMMON_VERB_SUGGESTIONS,
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
  generateInfinitiveQuestions, generateConjugationQuestions, evaluateAnswer, verbSynonyms, reflexivePair,
  cardAccuracy, isCardMastered, cardNeedsReview, cardsForFilter, studyCardCounts,
  validateData, normalizeTextbookAnswer, diagnoseVerbMistake,
  scheduleFormReview, dueFormReviews, dayKey, addDays,
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
  irse: {
    presente: ["me voy", "te vas", "se va", "nos vamos", "os vais", "se van"],
    perfecto: ["me he ido", "te has ido", "se ha ido", "nos hemos ido", "os habéis ido", "se han ido"],
    indefinido: ["me fui", "te fuiste", "se fue", "nos fuimos", "os fuisteis", "se fueron"],
    imperfecto: ["me iba", "te ibas", "se iba", "nos íbamos", "os ibais", "se iban"],
    futuro: ["me iré", "te irás", "se irá", "nos iremos", "os iréis", "se irán"],
    condicional: ["me iría", "te irías", "se iría", "nos iríamos", "os iríais", "se irían"],
    subjuntivo_presente: ["me vaya", "te vayas", "se vaya", "nos vayamos", "os vayáis", "se vayan"],
    subjuntivo_imperfecto: ["me fuera", "te fueras", "se fuera", "nos fuéramos", "os fuerais", "se fueran"],
    imperativo_afirmativo: ["-", "vete", "váyase", "vayámonos", "idos", "váyanse"],
    imperativo_negativo: ["-", "no te vayas", "no se vaya", "no nos vayamos", "no os vayáis", "no se vayan"],
    participle: "ido",
    gerund: "yéndose",
  },
  caerse: { imperativo_afirmativo: ["-", "cáete", "cáigase", "caigámonos", "caeos", "cáiganse"] },
  ducharse: {
    presente: ["me ducho", "te duchas", "se ducha", "nos duchamos", "os ducháis", "se duchan"],
    perfecto: ["me he duchado", "te has duchado", "se ha duchado", "nos hemos duchado", "os habéis duchado", "se han duchado"],
    imperativo_afirmativo: ["-", "dúchate", "dúchese", "duchémonos", "duchaos", "dúchense"],
    imperativo_negativo: ["-", "no te duches", "no se duche", "no nos duchemos", "no os duchéis", "no se duchen"],
    participle: "duchado",
    gerund: "duchándose",
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
    imperativo_afirmativo: ["-", "sabe", "sepa", "sepamos", "sabed", "sepan"],
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
    imperativo_afirmativo: ["-", "vale", "valga", "valgamos", "valed", "valgan"],
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
    // RAE, Ortografía 2010: односложные rio, riais пишутся без тильды.
    indefinido: ["reí", "reíste", "rio", "reímos", "reísteis", "rieron"],
    subjuntivo_presente: ["ría", "rías", "ría", "riamos", "riais", "rían"],
    // reíd: í в зиянии сохраняет тильду (не односложное слово).
    imperativo_afirmativo: ["-", "ríe", "ría", "riamos", "reíd", "rían"],
    gerund: "riendo",
  },
  sonreir: {
    presente: ["sonrío", "sonríes", "sonríe", "sonreímos", "sonreís", "sonríen"],
    indefinido: ["sonreí", "sonreíste", "sonrió", "sonreímos", "sonreísteis", "sonrieron"],
    subjuntivo_presente: ["sonría", "sonrías", "sonría", "sonriamos", "sonriáis", "sonrían"],
    imperativo_afirmativo: ["-", "sonríe", "sonría", "sonriamos", "sonreíd", "sonrían"],
    gerund: "sonriendo",
  },
  freir: {
    presente: ["frío", "fríes", "fríe", "freímos", "freís", "fríen"],
    indefinido: ["freí", "freíste", "frio", "freímos", "freísteis", "frieron"],
    subjuntivo_presente: ["fría", "frías", "fría", "friamos", "friais", "frían"],
    imperativo_afirmativo: ["-", "fríe", "fría", "friamos", "freíd", "frían"],
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
    // RAE, Ortografía 2010: односложные huis, hui пишутся без тильды.
    presente: ["huyo", "huyes", "huye", "huimos", "huis", "huyen"],
    indefinido: ["hui", "huiste", "huyó", "huimos", "huisteis", "huyeron"],
    subjuntivo_presente: ["huya", "huyas", "huya", "huyamos", "huyáis", "huyan"],
    gerund: "huyendo",
  },
  // ─── Регрессии, найденные во втором анализе (DLE/DPD, Ortografía 2010) ───
  vencer: {
    presente: ["venzo", "vences", "vence", "vencemos", "vencéis", "vencen"],
    subjuntivo_presente: ["venza", "venzas", "venza", "venzamos", "venzáis", "venzan"],
  },
  ejercer: {
    presente: ["ejerzo", "ejerces", "ejerce", "ejercemos", "ejercéis", "ejercen"],
  },
  esparcir: {
    subjuntivo_presente: ["esparza", "esparzas", "esparza", "esparzamos", "esparzáis", "esparzan"],
  },
  mecer: {
    presente: ["mezo", "meces", "mece", "mecemos", "mecéis", "mecen"],
  },
  adormecer: {
    presente: ["adormezco", "adormeces", "adormece", "adormecemos", "adormecéis", "adormecen"],
  },
  torcer: {
    presente: ["tuerzo", "tuerces", "tuerce", "torcemos", "torcéis", "tuercen"],
    subjuntivo_presente: ["tuerza", "tuerzas", "tuerza", "torzamos", "torzáis", "tuerzan"],
    imperativo_afirmativo: ["-", "tuerce", "tuerza", "torzamos", "torced", "tuerzan"],
  },
  predecir: {
    presente: ["predigo", "predices", "predice", "predecimos", "predecís", "predicen"],
    participle: "predicho",
  },
  contradecir: {
    presente: ["contradigo", "contradices", "contradice", "contradecimos", "contradecís", "contradicen"],
  },
  deshacer: {
    presente: ["deshago", "deshaces", "deshace", "deshacemos", "deshacéis", "deshacen"],
    futuro: ["desharé", "desharás", "deshará", "desharemos", "desharéis", "desharán"],
    condicional: ["desharía", "desharías", "desharía", "desharíamos", "desharíais", "desharían"],
  },
  satisfacer: {
    presente: ["satisfago", "satisfaces", "satisface", "satisfacemos", "satisfacéis", "satisfacen"],
    futuro: ["satisfaré", "satisfarás", "satisfará", "satisfaremos", "satisfaréis", "satisfarán"],
    condicional: ["satisfaría", "satisfarías", "satisfaría", "satisfaríamos", "satisfaríais", "satisfarían"],
    participle: "satisfecho",
  },
  prohibir: {
    presente: ["prohíbo", "prohíbes", "prohíbe", "prohibimos", "prohibís", "prohíben"],
    subjuntivo_presente: ["prohíba", "prohíbas", "prohíba", "prohibamos", "prohibáis", "prohíban"],
  },
  aislar: {
    presente: ["aíslo", "aíslas", "aísla", "aislamos", "aisláis", "aíslan"],
  },
  enraizar: {
    presente: ["enraízo", "enraízas", "enraíza", "enraizamos", "enraizáis", "enraízan"],
    subjuntivo_presente: ["enraíce", "enraíces", "enraíce", "enraicemos", "enraicéis", "enraícen"],
  },
  aunar: {
    presente: ["aúno", "aúnas", "aúna", "aunamos", "aunáis", "aúnan"],
  },
  rehusar: {
    presente: ["rehúso", "rehúsas", "rehúsa", "rehusamos", "rehusáis", "rehúsan"],
  },
  reunir: {
    presente: ["reúno", "reúnes", "reúne", "reunimos", "reunís", "reúnen"],
  },
  errar: {
    presente: ["yerro", "yerras", "yerra", "erramos", "erráis", "yerran"],
    subjuntivo_presente: ["yerre", "yerres", "yerre", "erremos", "erréis", "yerren"],
  },
  guiar: {
    presente: ["guío", "guías", "guía", "guiamos", "guiais", "guían"],
    indefinido: ["guie", "guiaste", "guio", "guiamos", "guiasteis", "guiaron"],
    subjuntivo_presente: ["guíe", "guíes", "guíe", "guiemos", "guieis", "guíen"],
  },
  criar: {
    indefinido: ["crie", "criaste", "crio", "criamos", "criasteis", "criaron"],
  },
  enfriar: {
    indefinido: ["enfrié", "enfriaste", "enfrió", "enfriamos", "enfriasteis", "enfriaron"],
  },
  creer: {
    indefinido: ["creí", "creíste", "creyó", "creímos", "creísteis", "creyeron"],
    subjuntivo_presente: ["crea", "creas", "crea", "creamos", "creáis", "crean"],
    participle: "creído",
    gerund: "creyendo",
  },
  roer: {
    indefinido: ["roí", "roíste", "royó", "roímos", "roísteis", "royeron"],
    participle: "roído",
    gerund: "royendo",
  },
  poseer: {
    participle: "poseído",
    indefinido: ["poseí", "poseíste", "poseyó", "poseímos", "poseísteis", "poseyeron"],
    gerund: "poseyendo",
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
  romper: { participle: "roto" },
  resolver: { participle: "resuelto" },
  imprimir: { participle: "impreso" },
  pudrir: { participle: "podrido" },
  absolver: { participle: "absuelto" },
  // caído/oído need accent on í (stem ends in vowel) - app bug: generates "caido"/"oido"
  leer: {
    participle: "leído",
    indefinido: ["leí", "leíste", "leyó", "leímos", "leísteis", "leyeron"],
    gerund: "leyendo",
  },

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

  // === salir ===
  salir: {
    presente: ["salgo", "sales", "sale", "salimos", "salís", "salen"],
    futuro: ["saldré", "saldrás", "saldrá", "saldremos", "saldréis", "saldrán"],
    condicional: ["saldría", "saldrías", "saldría", "saldríamos", "saldríais", "saldrían"],
    imperativo_afirmativo: ["-", "sal", "salga", "salgamos", "salid", "salgan"],
  },

  // === verbs with gerund irregularities ===
  proveer: {
    indefinido: ["proveí", "proveíste", "proveyó", "proveímos", "proveísteis", "proveyeron"],
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

// RAE model audit for the frequent verbs that rely on generated patterns.
// Values: present yo/tú, indefinido yo/él/ellos, subjuntivo yo, futuro yo,
// participio and gerundio.
const COMMON_PATTERN_REFERENCE = {
  llegar: ["llego", "llegas", "llegué", "llegó", "llegaron", "llegue", "llegaré", "llegado", "llegando"],
  seguir: ["sigo", "sigues", "seguí", "siguió", "siguieron", "siga", "seguiré", "seguido", "siguiendo"],
  encontrar: ["encuentro", "encuentras", "encontré", "encontró", "encontraron", "encuentre", "encontraré", "encontrado", "encontrando"],
  parecer: ["parezco", "pareces", "parecí", "pareció", "parecieron", "parezca", "pareceré", "parecido", "pareciendo"],
  explicar: ["explico", "explicas", "expliqué", "explicó", "explicaron", "explique", "explicaré", "explicado", "explicando"],
  contar: ["cuento", "cuentas", "conté", "contó", "contaron", "cuente", "contaré", "contado", "contando"],
  creer: ["creo", "crees", "creí", "creyó", "creyeron", "crea", "creeré", "creído", "creyendo"],
  realizar: ["realizo", "realizas", "realicé", "realizó", "realizaron", "realice", "realizaré", "realizado", "realizando"],
  conocer: ["conozco", "conoces", "conocí", "conoció", "conocieron", "conozca", "conoceré", "conocido", "conociendo"],
  mantener: ["mantengo", "mantienes", "mantuve", "mantuvo", "mantuvieron", "mantenga", "mantendré", "mantenido", "manteniendo"],
  volver: ["vuelvo", "vuelves", "volví", "volvió", "volvieron", "vuelva", "volveré", "vuelto", "volviendo"],
  mostrar: ["muestro", "muestras", "mostré", "mostró", "mostraron", "muestre", "mostraré", "mostrado", "mostrando"],
  pensar: ["pienso", "piensas", "pensé", "pensó", "pensaron", "piense", "pensaré", "pensado", "pensando"],
  convertir: ["convierto", "conviertes", "convertí", "convirtió", "convirtieron", "convierta", "convertiré", "convertido", "convirtiendo"],
  ofrecer: ["ofrezco", "ofreces", "ofrecí", "ofreció", "ofrecieron", "ofrezca", "ofreceré", "ofrecido", "ofreciendo"],
  empezar: ["empiezo", "empiezas", "empecé", "empezó", "empezaron", "empiece", "empezaré", "empezado", "empezando"],
  recordar: ["recuerdo", "recuerdas", "recordé", "recordó", "recordaron", "recuerde", "recordaré", "recordado", "recordando"],
  suponer: ["supongo", "supones", "supuse", "supuso", "supusieron", "suponga", "supondré", "supuesto", "suponiendo"],
  conseguir: ["consigo", "consigues", "conseguí", "consiguió", "consiguieron", "consiga", "conseguiré", "conseguido", "consiguiendo"],
  jugar: ["juego", "juegas", "jugué", "jugó", "jugaron", "juegue", "jugaré", "jugado", "jugando"],
  utilizar: ["utilizo", "utilizas", "utilicé", "utilizó", "utilizaron", "utilice", "utilizaré", "utilizado", "utilizando"],
  perder: ["pierdo", "pierdes", "perdí", "perdió", "perdieron", "pierda", "perderé", "perdido", "perdiendo"],
  buscar: ["busco", "buscas", "busqué", "buscó", "buscaron", "busque", "buscaré", "buscado", "buscando"],
  incluir: ["incluyo", "incluyes", "incluí", "incluyó", "incluyeron", "incluya", "incluiré", "incluido", "incluyendo"],
  comenzar: ["comienzo", "comienzas", "comencé", "comenzó", "comenzaron", "comience", "comenzaré", "comenzado", "comenzando"],
  escribir: ["escribo", "escribes", "escribí", "escribió", "escribieron", "escriba", "escribiré", "escrito", "escribiendo"],
  abrir: ["abro", "abres", "abrí", "abrió", "abrieron", "abra", "abriré", "abierto", "abriendo"],
  entender: ["entiendo", "entiendes", "entendí", "entendió", "entendieron", "entienda", "entenderé", "entendido", "entendiendo"],
  reconocer: ["reconozco", "reconoces", "reconocí", "reconoció", "reconocieron", "reconozca", "reconoceré", "reconocido", "reconociendo"],
  sentir: ["siento", "sientes", "sentí", "sintió", "sintieron", "sienta", "sentiré", "sentido", "sintiendo"],
  destacar: ["destaco", "destacas", "destaqué", "destacó", "destacaron", "destaque", "destacaré", "destacado", "destacando"],
  aparecer: ["aparezco", "apareces", "aparecí", "apareció", "aparecieron", "aparezca", "apareceré", "aparecido", "apareciendo"],
  dirigir: ["dirijo", "diriges", "dirigí", "dirigió", "dirigieron", "dirija", "dirigiré", "dirigido", "dirigiendo"],
  alcanzar: ["alcanzo", "alcanzas", "alcancé", "alcanzó", "alcanzaron", "alcance", "alcanzaré", "alcanzado", "alcanzando"],
  publicar: ["publico", "publicas", "publiqué", "publicó", "publicaron", "publique", "publicaré", "publicado", "publicando"],
  indicar: ["indico", "indicas", "indiqué", "indicó", "indicaron", "indique", "indicaré", "indicado", "indicando"],
  establecer: ["establezco", "estableces", "establecí", "estableció", "establecieron", "establezca", "estableceré", "establecido", "estableciendo"],
  obtener: ["obtengo", "obtienes", "obtuve", "obtuvo", "obtuvieron", "obtenga", "obtendré", "obtenido", "obteniendo"]
};

const COMMON_REGULAR_MODEL_VERBS = [
  "deber", "pasar", "llevar", "dejar", "tratar", "quedar", "presentar", "permitir",
  "considerar", "asegurar", "acabar", "llamar", "existir", "esperar", "tomar", "ganar",
  "recibir", "señalar", "afirmar", "crear", "formar", "resultar", "añadir", "intentar",
  "entrar", "lograr", "desarrollar", "evitar", "decidir", "cambiar", "necesitar", "sufrir",
  "celebrar", "afectar", "ocurrir", "cumplir", "gustar", "ayudar", "participar", "superar"
];

const ACCENTED_MODEL_REFERENCE = {
  ampliar: {
    presente: ["amplío", "amplías", "amplía", "ampliamos", "ampliáis", "amplían"],
    subjuntivo_presente: ["amplíe", "amplíes", "amplíe", "ampliemos", "ampliéis", "amplíen"]
  },
  enviar: {
    presente: ["envío", "envías", "envía", "enviamos", "enviáis", "envían"],
    subjuntivo_presente: ["envíe", "envíes", "envíe", "enviemos", "enviéis", "envíen"]
  },
  actuar: {
    presente: ["actúo", "actúas", "actúa", "actuamos", "actuáis", "actúan"],
    subjuntivo_presente: ["actúe", "actúes", "actúe", "actuemos", "actuéis", "actúen"]
  },
  continuar: {
    presente: ["continúo", "continúas", "continúa", "continuamos", "continuáis", "continúan"],
    subjuntivo_presente: ["continúe", "continúes", "continúe", "continuemos", "continuéis", "continúen"]
  },
  nevar: {
    presente: ["nievo", "nievas", "nieva", "nevamos", "neváis", "nievan"],
    subjuntivo_presente: ["nieve", "nieves", "nieve", "nevemos", "nevéis", "nieven"]
  }
};

// ─── Validation logic ───────────────────────────────────────────────────────
const issues = [];

// Learning-plan tab: levels A1–B2 are built from modules linked to textbook lessons; C1–C2 are one «C1 и C2» page.
const learningPlanScaffold = [
  ["navigation", 'data-view="learning-plan"'],
  ["renderer", "function renderLearningPlan()"],
  ["view renderer", '"learning-plan": renderLearningPlan'],
  ["levels", "const LEARNING_LEVELS = ["],
  ["A1", 'id: "a1"'],
  ["A2", 'id: "a2"'],
  ["B1", 'id: "b1"'],
  ["B2", 'id: "b2"'],
  ["after B2", 'id: "after"'],
  ["modules", "const LEARNING_MODULES = ["],
  ["C1–C2 page", "const LEARNING_AFTER_B2 = {"],
  ["lesson levels", "const TEXTBOOK_LESSON_LEVELS = {"],
  ["legacy progress migration", "function migrateLearningProgress()"],
  ["back to plan", "data-textbook-plan"],
  // Favorites tab: three sections — verbs (quiz and list), saved cheat sheets, saved lessons.
  ["favorites sections", "const CARDS_SECTIONS = Object.freeze(["],
  ["favorites verbs", '{ id: "verbs", label: "Глаголы" }'],
  ["favorites tables", '{ id: "tables", label: "Шпаргалки" }'],
  ["favorites lessons", '{ id: "lessons", label: "Уроки" }'],
  ["favorites routes", 'route.startsWith("cards-")'],
];
for (const [part, expected] of learningPlanScaffold) {
  if (!html.includes(expected)) {
    issues.push({
      verb: "learning plan",
      tense: part,
      person: "-",
      expected,
      actual: "(missing)",
      severity: "high",
    });
  }
}

const forbiddenLearningPlanFragments = ["data-learning-resource", "function learningResourceFor", "learning-item-actions", "data-learning-next", "learning-next-step", "function learningItemDetails", "LEARNING_DETAIL_PATTERNS", "_LEARNING_DETAILS", "data-learning-filter"];
for (const fragment of forbiddenLearningPlanFragments) {
  if (html.includes(fragment)) {
    issues.push({
      verb: "learning plan",
      tense: "removed learning-plan code",
      person: "-",
      expected: "no code from the old item-list plan",
      actual: fragment,
      severity: "high",
    });
  }
}

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

const groupedVerbTenses = VERB_TENSE_GROUPS.flatMap((group) => group.tenseIds);
const expectedVerbTenses = TENSES
  .map((tense) => tense.id)
  .filter((id) => id !== "formas_no_personales");
const uniqueGroupedVerbTenses = [...new Set(groupedVerbTenses)];
const missingGroupedTenses = expectedVerbTenses.filter((id) => !uniqueGroupedVerbTenses.includes(id));
const duplicateGroupedTenses = uniqueGroupedVerbTenses.filter((id) => groupedVerbTenses.filter((item) => item === id).length > 1);
if (missingGroupedTenses.length > 0 || duplicateGroupedTenses.length > 0 || uniqueGroupedVerbTenses.length !== expectedVerbTenses.length) {
  issues.push({
    verb: "verb tense groups",
    tense: "ui",
    person: "-",
    expected: expectedVerbTenses.join(", "),
    actual: groupedVerbTenses.join(", "),
    severity: "high",
  });
}

const tenseExampleCount = Object.values(TENSE_EXAMPLES).reduce((total, rows) => total + rows.length, 0);
for (const tense of TENSES) {
  const examples = TENSE_EXAMPLES[tense.id];
  if (!Array.isArray(examples) || examples.length < 4) {
    issues.push({
      verb: tense.id,
      tense: "examples",
      person: "-",
      expected: "не менее 4 примеров",
      actual: Array.isArray(examples) ? String(examples.length) : "(missing)",
      severity: "high",
    });
    continue;
  }
  examples.forEach((row, index) => {
    const complete = Array.isArray(row)
      && row.length >= 3
      && row.slice(0, 3).every((value) => typeof value === "string" && value.trim() !== "");
    if (!complete) {
      issues.push({
        verb: tense.id,
        tense: "examples",
        person: index + 1,
        expected: "испанский пример, русский перевод и пояснение",
        actual: JSON.stringify(row),
        severity: "high",
      });
    }
  });
}

const SEARCH_CASES = [
  { query: "tener", first: "tener", count: 1 },
  { query: "tengo", first: "tener", count: 1 },
  { query: "делать", first: "hacer", count: 1 },
  { query: "hecho", first: "hacer", count: 2 }, // + hacerse: se ha hecho
  { query: "покупать", first: "comprar", count: 1 },
  { query: "reír", first: "reir", count: 1 },
  { query: "irse", first: "irse", count: 1 },
  { query: "уходить", first: "irse" },
  { query: "tenre", first: "tener" },
  { query: "sd", count: 0 },
  // Частичный запрос не должен совпадать со вспомогательным haber и местоимениями составных форм.
  { query: "hab", first: "haber", maxCount: 10 },
  { query: "habl", first: "hablar", count: 1 },
  { query: "hemos", first: "haber", count: 1 },
  { query: "ha sido", first: "ser", count: 1 },
  { query: "me voy", first: "irse", count: 1 },
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
  if (Number.isInteger(testCase.maxCount) && results.length > testCase.maxCount) {
    issues.push({
      verb: testCase.query,
      tense: "search",
      person: "result count",
      expected: `не больше ${testCase.maxCount}`,
      actual: String(results.length),
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

const describeDiagnosis = (mistake) => mistake ? `${mistake.kind}: ${mistake.user} = ${mistake.userLabel} | ${mistake.expectedLabel}` : "null";
const QUIZ_CASES = [
  {
    label: "textbook answer accepts decomposed Spanish accents",
    actual: () => normalizeTextbookAnswer("¿SI\u0301, man\u0303ana!"),
    expected: "sí mañana",
  },
  {
    label: "textbook answer ignores punctuation",
    actual: () => normalizeTextbookAnswer("¿Sí, la tengo!"),
    expected: "sí la tengo",
  },
  {
    label: "diagnosis: wrong person",
    actual: () => describeDiagnosis(diagnoseVerbMistake("fui", "fue", ["(ir, él)"], 59)),
    expected: "person: fui = yo | él/ella",
  },
  {
    label: "diagnosis: compound vs simple tense in a sentence",
    actual: () => describeDiagnosis(diagnoseVerbMistake("Ayer he comido mucho.", "Ayer comí mucho.", ["(comer)"], 62)),
    expected: "tense: he comido = pretérito perfecto | pretérito indefinido",
  },
  {
    label: "diagnosis: lesson tense resolves habla (imperativo tú, not presente él)",
    actual: () => describeDiagnosis(diagnoseVerbMistake("hablas", "habla", ["(hablar, tú)"], 73)),
    expected: "tense: hablas = presente | imperativo",
  },
  {
    label: "diagnosis: ser instead of estar",
    actual: () => describeDiagnosis(diagnoseVerbMistake("es", "está", ["Completa con ser o estar."], 44)),
    expected: "verb: es = ser | estar",
  },
  {
    label: "diagnosis: no verb named in the task (casa is not casar)",
    actual: () => describeDiagnosis(diagnoseVerbMistake("casa", "casas", ["casa"], 3)),
    expected: "null",
  },
  {
    label: "diagnosis: reflexive verb named in the task but missing from the list",
    actual: () => describeDiagnosis(diagnoseVerbMistake("te pones", "me pongo", ["(ponerse)"], 51)),
    expected: "person: te pones = tú | yo",
  },
  {
    label: "infinitive quiz accepts verbs that share a meaning, from the whole list",
    actual: () => [
      evaluateAnswer("trasladarse", generateInfinitiveQuestions(["mudarse"], 1)[0]).status,
      evaluateAnswer("hablar", generateInfinitiveQuestions(["decir"], 1)[0]).status,
      evaluateAnswer("comer", generateInfinitiveQuestions(["decir"], 1)[0]).status,
    ].join(","),
    expected: "correct,correct,wrong",
  },
  {
    label: "reflexive pair links a verb and its se form",
    actual: () => [reflexivePair("dormir")?.verb, reflexivePair("irse")?.verb, reflexivePair("reir")?.verb, String(reflexivePair("hablar")), BASE_VERBS.filter((verb) => reflexivePair(verb)?.withSe).length].join(","),
    expected: "dormirse,ir,reirse,null,97",
  },
  {
    label: "soler is defective: no futuro, condicional or imperativo in forms and in the quiz",
    actual: () => [formsFor("soler").presente[0], formsFor("soler").futuro.join(""), formsFor("soler").condicional_compuesto.join(""), formsFor("soler").imperativo_afirmativo.join(""), formsFor("soler").imperativo_negativo.join(""), generateConjugationQuestions(["soler"], ["futuro", "condicional", "imperativo_afirmativo"], [0, 1, 2, 3, 4, 5], 0).length].join(","),
    expected: "suelo,------,------,------,------,0",
  },
  {
    label: "enclitic tilde after a hiatus: cáete, léase, créanse, provéete",
    actual: () => ["traerse", "leerse", "creerse", "verse", "proveerse"].map((verb) => formsFor(verb).imperativo_afirmativo.slice(1).join(" ")).join(" | "),
    expected: "tráete tráigase traigámonos traeos tráiganse | léete léase leámonos leeos léanse | créete créase creámonos creeos créanse | vete véase veámonos veos véanse | provéete provéase proveámonos proveeos provéanse",
  },
  {
    label: "schedule: correct twice in one day promotes once, mistake resets to box 1 for tomorrow",
    actual: () => {
      const saved = { schedule: state.formSchedule, cards: state.cards };
      state.formSchedule = {};
      state.cards = ["tener"];
      const question = { type: "conjugation", verb: "tener", tense: "presente", person: 0 };
      const today = dayKey();
      scheduleFormReview(question, true);
      scheduleFormReview(question, true);
      const afterCorrect = { ...state.formSchedule["tener|presente"] };
      state.formSchedule["tener|presente"] = { box: 3, due: today };
      const due = dueFormReviews().length;
      scheduleFormReview(question, false);
      const afterMistake = state.formSchedule["tener|presente"];
      state.formSchedule = saved.schedule;
      state.cards = saved.cards;
      return [afterCorrect.box, afterCorrect.due === addDays(today, 1), due, afterMistake.box, afterMistake.due === addDays(today, 1)].join(",");
    },
    expected: "1,true,1,1,true",
  },
  {
    label: "quiz accepts -se subjunctive and the second participle",
    actual: () => [
      evaluateAnswer("hablásemos", { type: "conjugation", verb: "hablar", tense: "subjuntivo_imperfecto", person: 3, answer: "habláramos" }).status,
      evaluateAnswer("hubiese hablado", { type: "conjugation", verb: "hablar", tense: "subjuntivo_pluscuamperfecto", person: 0, answer: "hubiera hablado" }).status,
      evaluateAnswer("he freído", { type: "conjugation", verb: "freir", tense: "perfecto", person: 0, answer: "he frito" }).status,
      evaluateAnswer("hablasemos", { type: "conjugation", verb: "hablar", tense: "subjuntivo_imperfecto", person: 3, answer: "habláramos" }).status,
    ].join(","),
    expected: "correct,correct,correct,almost",
  },
  {
    label: "quiz explains a wrong person",
    actual: () => evaluateAnswer("hablas", { type: "conjugation", verb: "hablar", tense: "presente", person: 0, answer: "hablo" }).message,
    expected: "Ответ пока неверный: «hablas» — форма для tú; здесь нужна форма для yo.",
  },
  {
    label: "infinitive count",
    actual: () => generateInfinitiveQuestions(["tener", "hacer"], 2).length,
    expected: 2,
  },
  {
    label: "single conjugation form",
    actual: () => generateConjugationQuestions(["tener"], ["presente"], [0], 0)[0]?.answer,
    expected: "tengo",
  },
  {
    label: "reflexive conjugation is not doubled",
    actual: () => generateConjugationQuestions(["irse"], ["presente"], [0], 0)[0]?.answer,
    expected: "me voy",
  },
  {
    label: "imperative skips yo",
    actual: () => generateConjugationQuestions(["hacer"], ["imperativo_afirmativo"], [0, 1], 0).map((q) => q.answer).join(","),
    expected: "haz",
  },
  {
    label: "answer comparison ignores case",
    actual: () => evaluateAnswer("TENGO", { type: "conjugation", verb: "tener", tense: "presente", person: 0, answer: "tengo" }).status,
    expected: "correct",
  },
  {
    label: "single verb quiz has five forms",
    actual: () => generateConjugationQuestions(["tener"], ["presente", "indefinido"], PEOPLE.map((_, index) => index), 5).length,
    expected: 5,
  },
  {
    label: "mastery threshold",
    actual: () => {
      const previousStats = state.cardStats;
      state.cardStats = { tener: { attempts: 3, correct: 3, mistakes: 0, streak: 2, lastReviewed: null } };
      const result = isCardMastered("tener");
      state.cardStats = previousStats;
      return result;
    },
    expected: true,
  },
  {
    label: "study filters and counters",
    actual: () => {
      const previousCards = state.cards;
      const previousStats = state.cardStats;
      state.cards = ["tener", "hacer", "hablar"];
      state.cardStats = {
        hacer: { attempts: 2, correct: 1, mistakes: 1, streak: 0, lastReviewed: null },
        hablar: { attempts: 3, correct: 3, mistakes: 0, streak: 3, lastReviewed: null }
      };
      const counts = studyCardCounts();
      const result = [counts.reviewed, counts.unreviewed, counts.mistakes, counts.mastered, cardsForFilter("mistakes").length, cardsForFilter("mastered").length].join(",");
      state.cards = previousCards;
      state.cardStats = previousStats;
      return result;
    },
    expected: "2,1,1,1,1,1",
  },
];

for (const testCase of QUIZ_CASES) {
  const actual = testCase.actual();
  if (actual !== testCase.expected) {
    issues.push({
      verb: testCase.label,
      tense: "quiz",
      person: "-",
      expected: String(testCase.expected),
      actual: String(actual),
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

  if (refData.perfecto) {
    checkArray(verb, "perfecto", refData.perfecto, info.forms.perfecto, "high");
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

  if (refData.imperativo_negativo) {
    checkArray(verb, "imperativo_negativo", refData.imperativo_negativo, info.forms.imperativo_negativo, "high");
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

const REFLEXIVE_PERSONAL_TENSES = [
  "presente", "perfecto", "indefinido", "imperfecto", "pluscuamperfecto",
  "futuro", "futuro_perfecto", "condicional", "condicional_compuesto",
  "subjuntivo_presente", "subjuntivo_perfecto", "subjuntivo_imperfecto",
  "subjuntivo_pluscuamperfecto"
];
const reflexivePronouns = ["me ", "te ", "se ", "nos ", "os ", "se "];
for (const verb of BASE_VERBS.filter(isReflexive)) {
  const forms = verbInfo(verb).forms;
  for (const tenseId of REFLEXIVE_PERSONAL_TENSES) {
    forms[tenseId]?.forEach((form, index) => {
      if (!form.startsWith(reflexivePronouns[index])) {
        issues.push({
          verb,
          tense: tenseId,
          person: PEOPLE[index],
          expected: `форма начинается с «${reflexivePronouns[index].trim()}»`,
          actual: form,
          severity: "high",
        });
      }
    });
  }
}

for (const [verb, expected] of Object.entries(COMMON_PATTERN_REFERENCE)) {
  if (!BASE_VERBS.includes(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const [presentYo, presentTu, indefYo, indefEl, indefEllos, subjYo, futureYo, expectedParticiple, expectedGerund] = expected;
  check(verb, "common_presente", 0, presentYo, info.forms.presente[0], "high");
  check(verb, "common_presente", 1, presentTu, info.forms.presente[1], "high");
  check(verb, "common_indefinido", 0, indefYo, info.forms.indefinido[0], "high");
  check(verb, "common_indefinido", 2, indefEl, info.forms.indefinido[2], "high");
  check(verb, "common_indefinido", 5, indefEllos, info.forms.indefinido[5], "high");
  check(verb, "common_subjuntivo", 0, subjYo, info.forms.subjuntivo_presente[0], "high");
  check(verb, "common_futuro", 0, futureYo, info.forms.futuro[0], "high");
  checkScalar(verb, "common_participio", expectedParticiple, info.participle, "high");
  checkScalar(verb, "common_gerundio", expectedGerund, info.gerund, "high");
}

const regularModelEndings = {
  ar: {
    presente: ["o", "as", "a", "amos", "áis", "an"],
    indefinido: ["é", "aste", "ó", "amos", "asteis", "aron"],
    imperfecto: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    subjuntivo: ["e", "es", "e", "emos", "éis", "en"],
    participio: "ado",
    gerundio: "ando"
  },
  er: {
    presente: ["o", "es", "e", "emos", "éis", "en"],
    indefinido: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperfecto: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    subjuntivo: ["a", "as", "a", "amos", "áis", "an"],
    participio: "ido",
    gerundio: "iendo"
  },
  ir: {
    presente: ["o", "es", "e", "imos", "ís", "en"],
    indefinido: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperfecto: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    subjuntivo: ["a", "as", "a", "amos", "áis", "an"],
    participio: "ido",
    gerundio: "iendo"
  }
};
const futureModelEndings = ["é", "ás", "á", "emos", "éis", "án"];
const conditionalModelEndings = ["ía", "ías", "ía", "íamos", "íais", "ían"];

for (const verb of COMMON_REGULAR_MODEL_VERBS) {
  if (!BASE_VERBS.includes(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  const type = verb.slice(-2);
  const root = verb.slice(0, -2);
  const model = regularModelEndings[type];
  checkArray(verb, "common_regular_presente", model.presente.map((ending) => root + ending), info.forms.presente, "high");
  checkArray(verb, "common_regular_indefinido", model.indefinido.map((ending) => root + ending), info.forms.indefinido, "high");
  checkArray(verb, "common_regular_imperfecto", model.imperfecto.map((ending) => root + ending), info.forms.imperfecto, "high");
  checkArray(verb, "common_regular_futuro", futureModelEndings.map((ending) => verb + ending), info.forms.futuro, "high");
  checkArray(verb, "common_regular_condicional", conditionalModelEndings.map((ending) => verb + ending), info.forms.condicional, "high");
  checkArray(verb, "common_regular_subjuntivo", model.subjuntivo.map((ending) => root + ending), info.forms.subjuntivo_presente, "high");
  checkScalar(verb, "common_regular_participio", root + model.participio, info.participle, "high");
  checkScalar(verb, "common_regular_gerundio", root + model.gerundio, info.gerund, "high");
}

for (const [verb, reference] of Object.entries(ACCENTED_MODEL_REFERENCE)) {
  if (!BASE_VERBS.includes(verb)) continue;
  checkedVerbs.add(verb);
  const forms = verbInfo(verb).forms;
  checkArray(verb, "presente", reference.presente, forms.presente, "high");
  checkArray(verb, "subjuntivo_presente", reference.subjuntivo_presente, forms.subjuntivo_presente, "high");
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
// Производный глагол спрягается как базовый с приставкой: proponer — propongo, propuse, propondré.
// Ударение при этом не сдвигается, поэтому односложная форма базового глагола на гласную, -n или -s
// с приставкой получает тильду (pon → propón, ve → prevé, vio → previó), а ударная i после приставки
// на гласную стоит в зиянии (hice → rehíce). Отклонения от правила — по DLE — перечислены в DERIVED_EXCEPTIONS.
const DERIVED_BASES = ["poner", "tener", "venir", "salir", "hacer", "decir", "traer", "caer", "ver"];
const DERIVED_TENSES = ["presente", "indefinido", "futuro", "condicional", "subjuntivo_presente", "subjuntivo_imperfecto", "imperativo_afirmativo"];
const regularDecirFuture = (prefix) => ["é", "ás", "á", "emos", "éis", "án"].map((ending) => `${prefix}deciré`.slice(0, -1) + ending);
const regularDecirConditional = (prefix) => ["ía", "ías", "ía", "íamos", "íais", "ían"].map((ending) => `${prefix}decir${ending}`);
// DLE: bendecir и maldecir — будущее и условное правильные, tú — bendice; predecir и contradecir — tú predice.
const DERIVED_EXCEPTIONS = {
  bendecir: { futuro: regularDecirFuture("ben"), condicional: regularDecirConditional("ben"), imperativo_afirmativo: { 1: "bendice" } },
  maldecir: { futuro: regularDecirFuture("mal"), condicional: regularDecirConditional("mal"), imperativo_afirmativo: { 1: "maldice" } },
  predecir: { imperativo_afirmativo: { 1: "predice" } },
  contradecir: { imperativo_afirmativo: { 1: "contradice" } },
};
const DERIVED_ALSO_ACCEPTED = {
  // DLE допускает и правильное будущее: predeciré, contradeciré.
  predecir: { futuro: regularDecirFuture("pre"), condicional: regularDecirConditional("pre") },
  contradecir: { futuro: regularDecirFuture("contra"), condicional: regularDecirConditional("contra") },
};
const derivedVowelGroups = (word) => word.match(/[aeiouáéíóúü]+/g) || [];
function derivedForm(prefix, form) {
  if (form === "-") return form;
  const groups = derivedVowelGroups(form);
  // Две открытые гласные подряд (tra-es, ca-e) — два слога, такая форма не односложная.
  if (groups.length === 1 && !/[aeo]{2}/.test(groups[0]) && !/[áéíóú]/.test(form) && /[aeiouns]$/.test(form)) {
    const nucleus = groups[0];
    const strong = Math.max(nucleus.lastIndexOf("a"), nucleus.lastIndexOf("e"), nucleus.lastIndexOf("o"));
    const offset = form.indexOf(nucleus) + (strong >= 0 ? strong : nucleus.length - 1);
    return prefix + form.slice(0, offset) + accentChar(form[offset]) + form.slice(offset + 1);
  }
  if (/[aeiou]$/.test(prefix) && /^h[iu]/.test(form) && groups.length === 2 && /[aeiouns]$/.test(form)) {
    return prefix + form[0] + accentChar(form[1]) + form.slice(2);
  }
  return prefix + form;
}
function accentChar(char) {
  return ({ a: "á", e: "é", i: "í", o: "ó", u: "ú" })[char] || char;
}
let derivedChecked = 0;
for (const base of DERIVED_BASES) {
  const baseForms = formsFor(base);
  for (const verb of BASE_VERBS.filter((item) => item.endsWith(base) && item !== base)) {
    const prefix = verb.slice(0, -base.length);
    // Не производные: prever уже проверяется ниже, а -ver в volver, mover и т. п. — часть корня.
    if (base === "ver" && prefix !== "pre") continue;
    derivedChecked++;
    const forms = formsFor(verb);
    for (const tense of DERIVED_TENSES) {
      const override = DERIVED_EXCEPTIONS[verb]?.[tense];
      const accepted = DERIVED_ALSO_ACCEPTED[verb]?.[tense];
      baseForms[tense].forEach((form, index) => {
        const expected = Array.isArray(override) ? override[index] : override?.[index] ?? derivedForm(prefix, form);
        const actual = forms[tense][index];
        if (actual !== expected && actual !== accepted?.[index]) {
          issues.push({ verb, tense, person: PEOPLE[index] || index, expected, actual, severity: "high" });
        }
      });
    }
  }
}

// ─── DLE reference: every verb of the list ──────────────────────────────────
// Спряжение всех глаголов списка сверено с DLE (dle.rae.es); основы возвратных глаголов (acostarse → acostar) тоже,
// даже если их нет в списке. Эталон хранит только формы, которые
// отличаются от правильного спряжения: правильные глаголы в нём не перечислены, у неправильных — лишь
// особые формы. Правильное спряжение строит dleRegularForms — независимо от движка приложения.
// Метки: pres/indef/fut/cond/sp (subjuntivo presente)/si (imperfecto de subjuntivo на -ra)/impf + номер лица 0–5,
// imp1 и imp4 — imperativo tú и vosotros, part, ger. DLE_UNVERIFIED — глаголы, которых нет в DLE.
// Новый глагол без записи в эталоне проверяется как правильный: если он неправильный, сверьте его с DLE
// и добавьте строку. Эталон собран 12.10.2026 из движка после того, как спряжение всех глаголов совпало
// с таблицами DLE; DLE даёт первым другой допустимый вариант только у freír (freído) и imprimir (imprimido) —
// здесь стоят frito и impreso. trasmitir в DLE отсылает к transmitir, acontecer дан только в 3-м лице,
// arrepentir — только как arrepentirse; их формы сверены вручную.
function dleRegularForms(inf) {
  const type = inf.slice(-2);
  const stem = inf.slice(0, -2);
  const front = (ending) => /^[eé]/.test(ending);
  const back = (ending) => /^[aoáó]/.test(ending);
  const join = (ending) => {
    let root = stem;
    if (type === "ar" && front(ending)) {
      if (/c$/.test(root)) root = root.slice(0, -1) + "qu";
      else if (/gu$/.test(root)) root = root.slice(0, -2) + "gü";
      else if (/g$/.test(root)) root += "u";
      else if (/z$/.test(root)) root = root.slice(0, -1) + "c";
    }
    if (type !== "ar" && back(ending)) {
      if (/[^aeiou]c$/.test(root)) root = root.slice(0, -1) + "z";
      else if (/gu$/.test(root)) root = root.slice(0, -1);
      else if (/qu$/.test(root)) root = root.slice(0, -2) + "c";
      else if (/g$/.test(root)) root = root.slice(0, -1) + "j";
    }
    return root + ending;
  };
  const endings = {
    pres: type === "ar" ? ["o", "as", "a", "amos", "áis", "an"] : type === "er" ? ["o", "es", "e", "emos", "éis", "en"] : ["o", "es", "e", "imos", "ís", "en"],
    indef: type === "ar" ? ["é", "aste", "ó", "amos", "asteis", "aron"] : ["í", "iste", "ió", "imos", "isteis", "ieron"],
    sp: type === "ar" ? ["e", "es", "e", "emos", "éis", "en"] : ["a", "as", "a", "amos", "áis", "an"],
    impf: type === "ar" ? ["aba", "abas", "aba", "ábamos", "abais", "aban"] : ["ía", "ías", "ía", "íamos", "íais", "ían"],
  };
  const forms = Object.fromEntries(Object.entries(endings).map(([tense, list]) => [tense, list.map(join)]));
  const fut = ["é", "ás", "á", "emos", "éis", "án"].map((ending) => inf + ending);
  const cond = ["ía", "ías", "ía", "íamos", "íais", "ían"].map((ending) => inf + ending);
  const siStem = forms.indef[5].replace(/ron$/, "");
  const si = ["ra", "ras", "ra", "ramos", "rais", "ran"].map((ending, index) => (index === 3 ? siStem.replace(/([aeiou])([^aeiou]*)$/, (_m, vowel, rest) => ({ a: "á", e: "é", i: "í", o: "ó", u: "ú" })[vowel] + rest) : siStem) + ending);
  return [...forms.pres, ...forms.indef, ...fut, ...cond, ...forms.sp, ...si, ...forms.impf, forms.pres[2], inf.slice(0, -1) + "d", stem + (type === "ar" ? "ado" : "ido"), stem + (type === "ar" ? "ando" : "iendo")].map((form) => form.normalize("NFC"));
}
// END dleRegularForms
const DLE_LABELS = [...["pres", "indef", "fut", "cond", "sp", "si", "impf"].flatMap((tense) => [0, 1, 2, 3, 4, 5].map((index) => tense + index)), "imp1", "imp4", "part", "ger"];
// BEGIN DLE_REFERENCE (сгенерировано; сверено с DLE 12.10.2026)
const DLE_REFERENCE = `
ser pres0=soy pres1=eres pres2=es pres3=somos pres4=sois pres5=son indef0=fui indef1=fuiste indef2=fue indef3=fuimos indef4=fuisteis indef5=fueron sp0=sea sp1=seas sp2=sea sp3=seamos sp4=seáis sp5=sean si0=fuera si1=fueras si2=fuera si3=fuéramos si4=fuerais si5=fueran impf0=era impf1=eras impf2=era impf3=éramos impf4=erais impf5=eran imp1=sé
estar pres0=estoy pres1=estás pres2=está pres5=están indef0=estuve indef1=estuviste indef2=estuvo indef3=estuvimos indef4=estuvisteis indef5=estuvieron sp0=esté sp1=estés sp2=esté sp5=estén si0=estuviera si1=estuvieras si2=estuviera si3=estuviéramos si4=estuvierais si5=estuvieran imp1=está
haber pres0=he pres1=has pres2=ha pres3=hemos pres5=han indef0=hube indef1=hubiste indef2=hubo indef3=hubimos indef4=hubisteis indef5=hubieron fut0=habré fut1=habrás fut2=habrá fut3=habremos fut4=habréis fut5=habrán cond0=habría cond1=habrías cond2=habría cond3=habríamos cond4=habríais cond5=habrían sp0=haya sp1=hayas sp2=haya sp3=hayamos sp4=hayáis sp5=hayan si0=hubiera si1=hubieras si2=hubiera si3=hubiéramos si4=hubierais si5=hubieran imp1=he
tener pres0=tengo pres1=tienes pres2=tiene pres5=tienen indef0=tuve indef1=tuviste indef2=tuvo indef3=tuvimos indef4=tuvisteis indef5=tuvieron fut0=tendré fut1=tendrás fut2=tendrá fut3=tendremos fut4=tendréis fut5=tendrán cond0=tendría cond1=tendrías cond2=tendría cond3=tendríamos cond4=tendríais cond5=tendrían sp0=tenga sp1=tengas sp2=tenga sp3=tengamos sp4=tengáis sp5=tengan si0=tuviera si1=tuvieras si2=tuviera si3=tuviéramos si4=tuvierais si5=tuvieran imp1=ten
hacer pres0=hago indef0=hice indef1=hiciste indef2=hizo indef3=hicimos indef4=hicisteis indef5=hicieron fut0=haré fut1=harás fut2=hará fut3=haremos fut4=haréis fut5=harán cond0=haría cond1=harías cond2=haría cond3=haríamos cond4=haríais cond5=harían sp0=haga sp1=hagas sp2=haga sp3=hagamos sp4=hagáis sp5=hagan si0=hiciera si1=hicieras si2=hiciera si3=hiciéramos si4=hicierais si5=hicieran imp1=haz part=hecho
decir pres0=digo pres1=dices pres2=dice pres5=dicen indef0=dije indef1=dijiste indef2=dijo indef3=dijimos indef4=dijisteis indef5=dijeron fut0=diré fut1=dirás fut2=dirá fut3=diremos fut4=diréis fut5=dirán cond0=diría cond1=dirías cond2=diría cond3=diríamos cond4=diríais cond5=dirían sp0=diga sp1=digas sp2=diga sp3=digamos sp4=digáis sp5=digan si0=dijera si1=dijeras si2=dijera si3=dijéramos si4=dijerais si5=dijeran imp1=di part=dicho ger=diciendo
ir pres0=voy pres1=vas pres2=va pres3=vamos pres4=vais pres5=van indef0=fui indef1=fuiste indef2=fue indef3=fuimos indef4=fuisteis indef5=fueron sp0=vaya sp1=vayas sp2=vaya sp3=vayamos sp4=vayáis sp5=vayan si0=fuera si1=fueras si2=fuera si3=fuéramos si4=fuerais si5=fueran impf0=iba impf1=ibas impf2=iba impf3=íbamos impf4=ibais impf5=iban imp1=ve ger=yendo
ver pres0=veo pres4=veis indef0=vi indef2=vio sp0=vea sp1=veas sp2=vea sp3=veamos sp4=veáis sp5=vean impf0=veía impf1=veías impf2=veía impf3=veíamos impf4=veíais impf5=veían part=visto
dar pres0=doy pres4=dais indef0=di indef1=diste indef2=dio indef3=dimos indef4=disteis indef5=dieron sp0=dé sp2=dé sp4=deis si0=diera si1=dieras si2=diera si3=diéramos si4=dierais si5=dieran
saber pres0=sé indef0=supe indef1=supiste indef2=supo indef3=supimos indef4=supisteis indef5=supieron fut0=sabré fut1=sabrás fut2=sabrá fut3=sabremos fut4=sabréis fut5=sabrán cond0=sabría cond1=sabrías cond2=sabría cond3=sabríamos cond4=sabríais cond5=sabrían sp0=sepa sp1=sepas sp2=sepa sp3=sepamos sp4=sepáis sp5=sepan si0=supiera si1=supieras si2=supiera si3=supiéramos si4=supierais si5=supieran
querer pres0=quiero pres1=quieres pres2=quiere pres5=quieren indef0=quise indef1=quisiste indef2=quiso indef3=quisimos indef4=quisisteis indef5=quisieron fut0=querré fut1=querrás fut2=querrá fut3=querremos fut4=querréis fut5=querrán cond0=querría cond1=querrías cond2=querría cond3=querríamos cond4=querríais cond5=querrían sp0=quiera sp1=quieras sp2=quiera sp5=quieran si0=quisiera si1=quisieras si2=quisiera si3=quisiéramos si4=quisierais si5=quisieran imp1=quiere
poder pres0=puedo pres1=puedes pres2=puede pres5=pueden indef0=pude indef1=pudiste indef2=pudo indef3=pudimos indef4=pudisteis indef5=pudieron fut0=podré fut1=podrás fut2=podrá fut3=podremos fut4=podréis fut5=podrán cond0=podría cond1=podrías cond2=podría cond3=podríamos cond4=podríais cond5=podrían sp0=pueda sp1=puedas sp2=pueda sp5=puedan si0=pudiera si1=pudieras si2=pudiera si3=pudiéramos si4=pudierais si5=pudieran imp1=puede ger=pudiendo
poner pres0=pongo indef0=puse indef1=pusiste indef2=puso indef3=pusimos indef4=pusisteis indef5=pusieron fut0=pondré fut1=pondrás fut2=pondrá fut3=pondremos fut4=pondréis fut5=pondrán cond0=pondría cond1=pondrías cond2=pondría cond3=pondríamos cond4=pondríais cond5=pondrían sp0=ponga sp1=pongas sp2=ponga sp3=pongamos sp4=pongáis sp5=pongan si0=pusiera si1=pusieras si2=pusiera si3=pusiéramos si4=pusierais si5=pusieran imp1=pon part=puesto
venir pres0=vengo pres1=vienes pres2=viene pres5=vienen indef0=vine indef1=viniste indef2=vino indef3=vinimos indef4=vinisteis indef5=vinieron fut0=vendré fut1=vendrás fut2=vendrá fut3=vendremos fut4=vendréis fut5=vendrán cond0=vendría cond1=vendrías cond2=vendría cond3=vendríamos cond4=vendríais cond5=vendrían sp0=venga sp1=vengas sp2=venga sp3=vengamos sp4=vengáis sp5=vengan si0=viniera si1=vinieras si2=viniera si3=viniéramos si4=vinierais si5=vinieran imp1=ven ger=viniendo
salir pres0=salgo fut0=saldré fut1=saldrás fut2=saldrá fut3=saldremos fut4=saldréis fut5=saldrán cond0=saldría cond1=saldrías cond2=saldría cond3=saldríamos cond4=saldríais cond5=saldrían sp0=salga sp1=salgas sp2=salga sp3=salgamos sp4=salgáis sp5=salgan imp1=sal
traer pres0=traigo indef0=traje indef1=trajiste indef2=trajo indef3=trajimos indef4=trajisteis indef5=trajeron sp0=traiga sp1=traigas sp2=traiga sp3=traigamos sp4=traigáis sp5=traigan si0=trajera si1=trajeras si2=trajera si3=trajéramos si4=trajerais si5=trajeran part=traído ger=trayendo
caer pres0=caigo indef1=caíste indef2=cayó indef3=caímos indef4=caísteis indef5=cayeron sp0=caiga sp1=caigas sp2=caiga sp3=caigamos sp4=caigáis sp5=caigan si0=cayera si1=cayeras si2=cayera si3=cayéramos si4=cayerais si5=cayeran part=caído ger=cayendo
oír pres0=oigo pres1=oyes pres2=oye pres3=oímos pres5=oyen indef1=oíste indef2=oyó indef3=oímos indef4=oísteis indef5=oyeron fut0=oiré fut1=oirás fut2=oirá fut3=oiremos fut4=oiréis fut5=oirán cond0=oiría cond1=oirías cond2=oiría cond3=oiríamos cond4=oiríais cond5=oirían sp0=oiga sp1=oigas sp2=oiga sp3=oigamos sp4=oigáis sp5=oigan si0=oyera si1=oyeras si2=oyera si3=oyéramos si4=oyerais si5=oyeran imp1=oye part=oído ger=oyendo
valer pres0=valgo fut0=valdré fut1=valdrás fut2=valdrá fut3=valdremos fut4=valdréis fut5=valdrán cond0=valdría cond1=valdrías cond2=valdría cond3=valdríamos cond4=valdríais cond5=valdrían sp0=valga sp1=valgas sp2=valga sp3=valgamos sp4=valgáis sp5=valgan
caber pres0=quepo indef0=cupe indef1=cupiste indef2=cupo indef3=cupimos indef4=cupisteis indef5=cupieron fut0=cabré fut1=cabrás fut2=cabrá fut3=cabremos fut4=cabréis fut5=cabrán cond0=cabría cond1=cabrías cond2=cabría cond3=cabríamos cond4=cabríais cond5=cabrían sp0=quepa sp1=quepas sp2=quepa sp3=quepamos sp4=quepáis sp5=quepan si0=cupiera si1=cupieras si2=cupiera si3=cupiéramos si4=cupierais si5=cupieran
andar indef0=anduve indef1=anduviste indef2=anduvo indef3=anduvimos indef4=anduvisteis indef5=anduvieron si0=anduviera si1=anduvieras si2=anduviera si3=anduviéramos si4=anduvierais si5=anduvieran
escribir part=escrito
leer indef1=leíste indef2=leyó indef3=leímos indef4=leísteis indef5=leyeron si0=leyera si1=leyeras si2=leyera si3=leyéramos si4=leyerais si5=leyeran part=leído ger=leyendo
abrir part=abierto
cerrar pres0=cierro pres1=cierras pres2=cierra pres5=cierran sp0=cierre sp1=cierres sp2=cierre sp5=cierren imp1=cierra
pensar pres0=pienso pres1=piensas pres2=piensa pres5=piensan sp0=piense sp1=pienses sp2=piense sp5=piensen imp1=piensa
creer indef1=creíste indef2=creyó indef3=creímos indef4=creísteis indef5=creyeron si0=creyera si1=creyeras si2=creyera si3=creyéramos si4=creyerais si5=creyeran part=creído ger=creyendo
encontrar pres0=encuentro pres1=encuentras pres2=encuentra pres5=encuentran sp0=encuentre sp1=encuentres sp2=encuentre sp5=encuentren imp1=encuentra
seguir pres0=sigo pres1=sigues pres2=sigue pres5=siguen indef2=siguió indef5=siguieron sp0=siga sp1=sigas sp2=siga sp3=sigamos sp4=sigáis sp5=sigan si0=siguiera si1=siguieras si2=siguiera si3=siguiéramos si4=siguierais si5=siguieran imp1=sigue ger=siguiendo
conseguir pres0=consigo pres1=consigues pres2=consigue pres5=consiguen indef2=consiguió indef5=consiguieron sp0=consiga sp1=consigas sp2=consiga sp3=consigamos sp4=consigáis sp5=consigan si0=consiguiera si1=consiguieras si2=consiguiera si3=consiguiéramos si4=consiguierais si5=consiguieran imp1=consigue ger=consiguiendo
pedir pres0=pido pres1=pides pres2=pide pres5=piden indef2=pidió indef5=pidieron sp0=pida sp1=pidas sp2=pida sp3=pidamos sp4=pidáis sp5=pidan si0=pidiera si1=pidieras si2=pidiera si3=pidiéramos si4=pidierais si5=pidieran imp1=pide ger=pidiendo
repetir pres0=repito pres1=repites pres2=repite pres5=repiten indef2=repitió indef5=repitieron sp0=repita sp1=repitas sp2=repita sp3=repitamos sp4=repitáis sp5=repitan si0=repitiera si1=repitieras si2=repitiera si3=repitiéramos si4=repitierais si5=repitieran imp1=repite ger=repitiendo
servir pres0=sirvo pres1=sirves pres2=sirve pres5=sirven indef2=sirvió indef5=sirvieron sp0=sirva sp1=sirvas sp2=sirva sp3=sirvamos sp4=sirváis sp5=sirvan si0=sirviera si1=sirvieras si2=sirviera si3=sirviéramos si4=sirvierais si5=sirvieran imp1=sirve ger=sirviendo
vestir pres0=visto pres1=vistes pres2=viste pres5=visten indef2=vistió indef5=vistieron sp0=vista sp1=vistas sp2=vista sp3=vistamos sp4=vistáis sp5=vistan si0=vistiera si1=vistieras si2=vistiera si3=vistiéramos si4=vistierais si5=vistieran imp1=viste ger=vistiendo
dormir pres0=duermo pres1=duermes pres2=duerme pres5=duermen indef2=durmió indef5=durmieron sp0=duerma sp1=duermas sp2=duerma sp3=durmamos sp4=durmáis sp5=duerman si0=durmiera si1=durmieras si2=durmiera si3=durmiéramos si4=durmierais si5=durmieran imp1=duerme ger=durmiendo
morir pres0=muero pres1=mueres pres2=muere pres5=mueren indef2=murió indef5=murieron sp0=muera sp1=mueras sp2=muera sp3=muramos sp4=muráis sp5=mueran si0=muriera si1=murieras si2=muriera si3=muriéramos si4=murierais si5=murieran imp1=muere part=muerto ger=muriendo
volver pres0=vuelvo pres1=vuelves pres2=vuelve pres5=vuelven sp0=vuelva sp1=vuelvas sp2=vuelva sp5=vuelvan imp1=vuelve part=vuelto
devolver pres0=devuelvo pres1=devuelves pres2=devuelve pres5=devuelven sp0=devuelva sp1=devuelvas sp2=devuelva sp5=devuelvan imp1=devuelve part=devuelto
recordar pres0=recuerdo pres1=recuerdas pres2=recuerda pres5=recuerdan sp0=recuerde sp1=recuerdes sp2=recuerde sp5=recuerden imp1=recuerda
contar pres0=cuento pres1=cuentas pres2=cuenta pres5=cuentan sp0=cuente sp1=cuentes sp2=cuente sp5=cuenten imp1=cuenta
costar pres0=cuesto pres1=cuestas pres2=cuesta pres5=cuestan sp0=cueste sp1=cuestes sp2=cueste sp5=cuesten imp1=cuesta
mostrar pres0=muestro pres1=muestras pres2=muestra pres5=muestran sp0=muestre sp1=muestres sp2=muestre sp5=muestren imp1=muestra
probar pres0=pruebo pres1=pruebas pres2=prueba pres5=prueban sp0=pruebe sp1=pruebes sp2=pruebe sp5=prueben imp1=prueba
jugar pres0=juego pres1=juegas pres2=juega pres5=juegan sp0=juegue sp1=juegues sp2=juegue sp5=jueguen imp1=juega
empezar pres0=empiezo pres1=empiezas pres2=empieza pres5=empiezan sp0=empiece sp1=empieces sp2=empiece sp5=empiecen imp1=empieza
comenzar pres0=comienzo pres1=comienzas pres2=comienza pres5=comienzan sp0=comience sp1=comiences sp2=comience sp5=comiencen imp1=comienza
almorzar pres0=almuerzo pres1=almuerzas pres2=almuerza pres5=almuerzan sp0=almuerce sp1=almuerces sp2=almuerce sp5=almuercen imp1=almuerza
negar pres0=niego pres1=niegas pres2=niega pres5=niegan sp0=niegue sp1=niegues sp2=niegue sp5=nieguen imp1=niega
entender pres0=entiendo pres1=entiendes pres2=entiende pres5=entienden sp0=entienda sp1=entiendas sp2=entienda sp5=entiendan imp1=entiende
perder pres0=pierdo pres1=pierdes pres2=pierde pres5=pierden sp0=pierda sp1=pierdas sp2=pierda sp5=pierdan imp1=pierde
romper part=roto
cubrir part=cubierto
descubrir part=descubierto
construir pres0=construyo pres1=construyes pres2=construye pres5=construyen indef2=construyó indef5=construyeron sp0=construya sp1=construyas sp2=construya sp3=construyamos sp4=construyáis sp5=construyan si0=construyera si1=construyeras si2=construyera si3=construyéramos si4=construyerais si5=construyeran imp1=construye ger=construyendo
destruir pres0=destruyo pres1=destruyes pres2=destruye pres5=destruyen indef2=destruyó indef5=destruyeron sp0=destruya sp1=destruyas sp2=destruya sp3=destruyamos sp4=destruyáis sp5=destruyan si0=destruyera si1=destruyeras si2=destruyera si3=destruyéramos si4=destruyerais si5=destruyeran imp1=destruye ger=destruyendo
incluir pres0=incluyo pres1=incluyes pres2=incluye pres5=incluyen indef2=incluyó indef5=incluyeron sp0=incluya sp1=incluyas sp2=incluya sp3=incluyamos sp4=incluyáis sp5=incluyan si0=incluyera si1=incluyeras si2=incluyera si3=incluyéramos si4=incluyerais si5=incluyeran imp1=incluye ger=incluyendo
excluir pres0=excluyo pres1=excluyes pres2=excluye pres5=excluyen indef2=excluyó indef5=excluyeron sp0=excluya sp1=excluyas sp2=excluya sp3=excluyamos sp4=excluyáis sp5=excluyan si0=excluyera si1=excluyeras si2=excluyera si3=excluyéramos si4=excluyerais si5=excluyeran imp1=excluye ger=excluyendo
huir pres0=huyo pres1=huyes pres2=huye pres4=huis pres5=huyen indef0=hui indef2=huyó indef5=huyeron sp0=huya sp1=huyas sp2=huya sp3=huyamos sp4=huyáis sp5=huyan si0=huyera si1=huyeras si2=huyera si3=huyéramos si4=huyerais si5=huyeran imp1=huye ger=huyendo
sustituir pres0=sustituyo pres1=sustituyes pres2=sustituye pres5=sustituyen indef2=sustituyó indef5=sustituyeron sp0=sustituya sp1=sustituyas sp2=sustituya sp3=sustituyamos sp4=sustituyáis sp5=sustituyan si0=sustituyera si1=sustituyeras si2=sustituyera si3=sustituyéramos si4=sustituyerais si5=sustituyeran imp1=sustituye ger=sustituyendo
contribuir pres0=contribuyo pres1=contribuyes pres2=contribuye pres5=contribuyen indef2=contribuyó indef5=contribuyeron sp0=contribuya sp1=contribuyas sp2=contribuya sp3=contribuyamos sp4=contribuyáis sp5=contribuyan si0=contribuyera si1=contribuyeras si2=contribuyera si3=contribuyéramos si4=contribuyerais si5=contribuyeran imp1=contribuye ger=contribuyendo
conocer pres0=conozco sp0=conozca sp1=conozcas sp2=conozca sp3=conozcamos sp4=conozcáis sp5=conozcan
reconocer pres0=reconozco sp0=reconozca sp1=reconozcas sp2=reconozca sp3=reconozcamos sp4=reconozcáis sp5=reconozcan
aparecer pres0=aparezco sp0=aparezca sp1=aparezcas sp2=aparezca sp3=aparezcamos sp4=aparezcáis sp5=aparezcan
desaparecer pres0=desaparezco sp0=desaparezca sp1=desaparezcas sp2=desaparezca sp3=desaparezcamos sp4=desaparezcáis sp5=desaparezcan
nacer pres0=nazco sp0=nazca sp1=nazcas sp2=nazca sp3=nazcamos sp4=nazcáis sp5=nazcan
crecer pres0=crezco sp0=crezca sp1=crezcas sp2=crezca sp3=crezcamos sp4=crezcáis sp5=crezcan
ofrecer pres0=ofrezco sp0=ofrezca sp1=ofrezcas sp2=ofrezca sp3=ofrezcamos sp4=ofrezcáis sp5=ofrezcan
parecer pres0=parezco sp0=parezca sp1=parezcas sp2=parezca sp3=parezcamos sp4=parezcáis sp5=parezcan
merecer pres0=merezco sp0=merezca sp1=merezcas sp2=merezca sp3=merezcamos sp4=merezcáis sp5=merezcan
conducir pres0=conduzco indef0=conduje indef1=condujiste indef2=condujo indef3=condujimos indef4=condujisteis indef5=condujeron sp0=conduzca sp1=conduzcas sp2=conduzca sp3=conduzcamos sp4=conduzcáis sp5=conduzcan si0=condujera si1=condujeras si2=condujera si3=condujéramos si4=condujerais si5=condujeran
traducir pres0=traduzco indef0=traduje indef1=tradujiste indef2=tradujo indef3=tradujimos indef4=tradujisteis indef5=tradujeron sp0=traduzca sp1=traduzcas sp2=traduzca sp3=traduzcamos sp4=traduzcáis sp5=traduzcan si0=tradujera si1=tradujeras si2=tradujera si3=tradujéramos si4=tradujerais si5=tradujeran
producir pres0=produzco indef0=produje indef1=produjiste indef2=produjo indef3=produjimos indef4=produjisteis indef5=produjeron sp0=produzca sp1=produzcas sp2=produzca sp3=produzcamos sp4=produzcáis sp5=produzcan si0=produjera si1=produjeras si2=produjera si3=produjéramos si4=produjerais si5=produjeran
reducir pres0=reduzco indef0=reduje indef1=redujiste indef2=redujo indef3=redujimos indef4=redujisteis indef5=redujeron sp0=reduzca sp1=reduzcas sp2=reduzca sp3=reduzcamos sp4=reduzcáis sp5=reduzcan si0=redujera si1=redujeras si2=redujera si3=redujéramos si4=redujerais si5=redujeran
introducir pres0=introduzco indef0=introduje indef1=introdujiste indef2=introdujo indef3=introdujimos indef4=introdujisteis indef5=introdujeron sp0=introduzca sp1=introduzcas sp2=introduzca sp3=introduzcamos sp4=introduzcáis sp5=introduzcan si0=introdujera si1=introdujeras si2=introdujera si3=introdujéramos si4=introdujerais si5=introdujeran
elegir pres0=elijo pres1=eliges pres2=elige pres5=eligen indef2=eligió indef5=eligieron sp0=elija sp1=elijas sp2=elija sp3=elijamos sp4=elijáis sp5=elijan si0=eligiera si1=eligieras si2=eligiera si3=eligiéramos si4=eligierais si5=eligieran imp1=elige ger=eligiendo
corregir pres0=corrijo pres1=corriges pres2=corrige pres5=corrigen indef2=corrigió indef5=corrigieron sp0=corrija sp1=corrijas sp2=corrija sp3=corrijamos sp4=corrijáis sp5=corrijan si0=corrigiera si1=corrigieras si2=corrigiera si3=corrigiéramos si4=corrigierais si5=corrigieran imp1=corrige ger=corrigiendo
perseguir pres0=persigo pres1=persigues pres2=persigue pres5=persiguen indef2=persiguió indef5=persiguieron sp0=persiga sp1=persigas sp2=persiga sp3=persigamos sp4=persigáis sp5=persigan si0=persiguiera si1=persiguieras si2=persiguiera si3=persiguiéramos si4=persiguierais si5=persiguieran imp1=persigue ger=persiguiendo
preferir pres0=prefiero pres1=prefieres pres2=prefiere pres5=prefieren indef2=prefirió indef5=prefirieron sp0=prefiera sp1=prefieras sp2=prefiera sp3=prefiramos sp4=prefiráis sp5=prefieran si0=prefiriera si1=prefirieras si2=prefiriera si3=prefiriéramos si4=prefirierais si5=prefirieran imp1=prefiere ger=prefiriendo
sentir pres0=siento pres1=sientes pres2=siente pres5=sienten indef2=sintió indef5=sintieron sp0=sienta sp1=sientas sp2=sienta sp3=sintamos sp4=sintáis sp5=sientan si0=sintiera si1=sintieras si2=sintiera si3=sintiéramos si4=sintierais si5=sintieran imp1=siente ger=sintiendo
mentir pres0=miento pres1=mientes pres2=miente pres5=mienten indef2=mintió indef5=mintieron sp0=mienta sp1=mientas sp2=mienta sp3=mintamos sp4=mintáis sp5=mientan si0=mintiera si1=mintieras si2=mintiera si3=mintiéramos si4=mintierais si5=mintieran imp1=miente ger=mintiendo
convertir pres0=convierto pres1=conviertes pres2=convierte pres5=convierten indef2=convirtió indef5=convirtieron sp0=convierta sp1=conviertas sp2=convierta sp3=convirtamos sp4=convirtáis sp5=conviertan si0=convirtiera si1=convirtieras si2=convirtiera si3=convirtiéramos si4=convirtierais si5=convirtieran imp1=convierte ger=convirtiendo
divertir pres0=divierto pres1=diviertes pres2=divierte pres5=divierten indef2=divirtió indef5=divirtieron sp0=divierta sp1=diviertas sp2=divierta sp3=divirtamos sp4=divirtáis sp5=diviertan si0=divirtiera si1=divirtieras si2=divirtiera si3=divirtiéramos si4=divirtierais si5=divirtieran imp1=divierte ger=divirtiendo
advertir pres0=advierto pres1=adviertes pres2=advierte pres5=advierten indef2=advirtió indef5=advirtieron sp0=advierta sp1=adviertas sp2=advierta sp3=advirtamos sp4=advirtáis sp5=adviertan si0=advirtiera si1=advirtieras si2=advirtiera si3=advirtiéramos si4=advirtierais si5=advirtieran imp1=advierte ger=advirtiendo
sugerir pres0=sugiero pres1=sugieres pres2=sugiere pres5=sugieren indef2=sugirió indef5=sugirieron sp0=sugiera sp1=sugieras sp2=sugiera sp3=sugiramos sp4=sugiráis sp5=sugieran si0=sugiriera si1=sugirieras si2=sugiriera si3=sugiriéramos si4=sugirierais si5=sugirieran imp1=sugiere ger=sugiriendo
hervir pres0=hiervo pres1=hierves pres2=hierve pres5=hierven indef2=hirvió indef5=hirvieron sp0=hierva sp1=hiervas sp2=hierva sp3=hirvamos sp4=hirváis sp5=hiervan si0=hirviera si1=hirvieras si2=hirviera si3=hirviéramos si4=hirvierais si5=hirvieran imp1=hierve ger=hirviendo
competir pres0=compito pres1=compites pres2=compite pres5=compiten indef2=compitió indef5=compitieron sp0=compita sp1=compitas sp2=compita sp3=compitamos sp4=compitáis sp5=compitan si0=compitiera si1=compitieras si2=compitiera si3=compitiéramos si4=compitierais si5=compitieran imp1=compite ger=compitiendo
impedir pres0=impido pres1=impides pres2=impide pres5=impiden indef2=impidió indef5=impidieron sp0=impida sp1=impidas sp2=impida sp3=impidamos sp4=impidáis sp5=impidan si0=impidiera si1=impidieras si2=impidiera si3=impidiéramos si4=impidierais si5=impidieran imp1=impide ger=impidiendo
medir pres0=mido pres1=mides pres2=mide pres5=miden indef2=midió indef5=midieron sp0=mida sp1=midas sp2=mida sp3=midamos sp4=midáis sp5=midan si0=midiera si1=midieras si2=midiera si3=midiéramos si4=midierais si5=midieran imp1=mide ger=midiendo
despedir pres0=despido pres1=despides pres2=despide pres5=despiden indef2=despidió indef5=despidieron sp0=despida sp1=despidas sp2=despida sp3=despidamos sp4=despidáis sp5=despidan si0=despidiera si1=despidieras si2=despidiera si3=despidiéramos si4=despidierais si5=despidieran imp1=despide ger=despidiendo
reír pres0=río pres1=ríes pres2=ríe pres3=reímos pres5=ríen indef1=reíste indef2=rio indef3=reímos indef4=reísteis indef5=rieron fut0=reiré fut1=reirás fut2=reirá fut3=reiremos fut4=reiréis fut5=reirán cond0=reiría cond1=reirías cond2=reiría cond3=reiríamos cond4=reiríais cond5=reirían sp0=ría sp1=rías sp2=ría sp3=riamos sp4=riais sp5=rían si0=riera si1=rieras si2=riera si3=riéramos si4=rierais si5=rieran imp1=ríe part=reído ger=riendo
sonreír pres0=sonrío pres1=sonríes pres2=sonríe pres3=sonreímos pres5=sonríen indef1=sonreíste indef2=sonrió indef3=sonreímos indef4=sonreísteis indef5=sonrieron fut0=sonreiré fut1=sonreirás fut2=sonreirá fut3=sonreiremos fut4=sonreiréis fut5=sonreirán cond0=sonreiría cond1=sonreirías cond2=sonreiría cond3=sonreiríamos cond4=sonreiríais cond5=sonreirían sp0=sonría sp1=sonrías sp2=sonría sp3=sonriamos sp4=sonriáis sp5=sonrían si0=sonriera si1=sonrieras si2=sonriera si3=sonriéramos si4=sonrierais si5=sonrieran imp1=sonríe part=sonreído ger=sonriendo
freír pres0=frío pres1=fríes pres2=fríe pres3=freímos pres5=fríen indef1=freíste indef2=frio indef3=freímos indef4=freísteis indef5=frieron fut0=freiré fut1=freirás fut2=freirá fut3=freiremos fut4=freiréis fut5=freirán cond0=freiría cond1=freirías cond2=freiría cond3=freiríamos cond4=freiríais cond5=freirían sp0=fría sp1=frías sp2=fría sp3=friamos sp4=friais sp5=frían si0=friera si1=frieras si2=friera si3=friéramos si4=frierais si5=frieran imp1=fríe part=frito ger=friendo
enviar pres0=envío pres1=envías pres2=envía pres5=envían sp0=envíe sp1=envíes sp2=envíe sp5=envíen imp1=envía
confiar pres0=confío pres1=confías pres2=confía pres5=confían sp0=confíe sp1=confíes sp2=confíe sp5=confíen imp1=confía
variar pres0=varío pres1=varías pres2=varía pres5=varían sp0=varíe sp1=varíes sp2=varíe sp5=varíen imp1=varía
actuar pres0=actúo pres1=actúas pres2=actúa pres5=actúan sp0=actúe sp1=actúes sp2=actúe sp5=actúen imp1=actúa
continuar pres0=continúo pres1=continúas pres2=continúa pres5=continúan sp0=continúe sp1=continúes sp2=continúe sp5=continúen imp1=continúa
graduar pres0=gradúo pres1=gradúas pres2=gradúa pres5=gradúan sp0=gradúe sp1=gradúes sp2=gradúe sp5=gradúen imp1=gradúa
evaluar pres0=evalúo pres1=evalúas pres2=evalúa pres5=evalúan sp0=evalúe sp1=evalúes sp2=evalúe sp5=evalúen imp1=evalúa
colgar pres0=cuelgo pres1=cuelgas pres2=cuelga pres5=cuelgan sp0=cuelgue sp1=cuelgues sp2=cuelgue sp5=cuelguen imp1=cuelga
rogar pres0=ruego pres1=ruegas pres2=ruega pres5=ruegan sp0=ruegue sp1=ruegues sp2=ruegue sp5=rueguen imp1=ruega
tropezar pres0=tropiezo pres1=tropiezas pres2=tropieza pres5=tropiezan sp0=tropiece sp1=tropieces sp2=tropiece sp5=tropiecen imp1=tropieza
sentar pres0=siento pres1=sientas pres2=sienta pres5=sientan sp0=siente sp1=sientes sp2=siente sp5=sienten imp1=sienta
soñar pres0=sueño pres1=sueñas pres2=sueña pres5=sueñan sp0=sueñe sp1=sueñes sp2=sueñe sp5=sueñen imp1=sueña
agradecer pres0=agradezco sp0=agradezca sp1=agradezcas sp2=agradezca sp3=agradezcamos sp4=agradezcáis sp5=agradezcan
adquirir pres0=adquiero pres1=adquieres pres2=adquiere pres5=adquieren sp0=adquiera sp1=adquieras sp2=adquiera sp5=adquieran imp1=adquiere
aprobar pres0=apruebo pres1=apruebas pres2=aprueba pres5=aprueban sp0=apruebe sp1=apruebes sp2=apruebe sp5=aprueben imp1=aprueba
atraer pres0=atraigo indef0=atraje indef1=atrajiste indef2=atrajo indef3=atrajimos indef4=atrajisteis indef5=atrajeron sp0=atraiga sp1=atraigas sp2=atraiga sp3=atraigamos sp4=atraigáis sp5=atraigan si0=atrajera si1=atrajeras si2=atrajera si3=atrajéramos si4=atrajerais si5=atrajeran part=atraído ger=atrayendo
atravesar pres0=atravieso pres1=atraviesas pres2=atraviesa pres5=atraviesan sp0=atraviese sp1=atravieses sp2=atraviese sp5=atraviesen imp1=atraviesa
calentar pres0=caliento pres1=calientas pres2=calienta pres5=calientan sp0=caliente sp1=calientes sp2=caliente sp5=calienten imp1=calienta
comprobar pres0=compruebo pres1=compruebas pres2=comprueba pres5=comprueban sp0=compruebe sp1=compruebes sp2=compruebe sp5=comprueben imp1=comprueba
concluir pres0=concluyo pres1=concluyes pres2=concluye pres5=concluyen indef2=concluyó indef5=concluyeron sp0=concluya sp1=concluyas sp2=concluya sp3=concluyamos sp4=concluyáis sp5=concluyan si0=concluyera si1=concluyeras si2=concluyera si3=concluyéramos si4=concluyerais si5=concluyeran imp1=concluye ger=concluyendo
contener pres0=contengo pres1=contienes pres2=contiene pres5=contienen indef0=contuve indef1=contuviste indef2=contuvo indef3=contuvimos indef4=contuvisteis indef5=contuvieron fut0=contendré fut1=contendrás fut2=contendrá fut3=contendremos fut4=contendréis fut5=contendrán cond0=contendría cond1=contendrías cond2=contendría cond3=contendríamos cond4=contendríais cond5=contendrían sp0=contenga sp1=contengas sp2=contenga sp3=contengamos sp4=contengáis sp5=contengan si0=contuviera si1=contuvieras si2=contuviera si3=contuviéramos si4=contuvierais si5=contuvieran imp1=contén
describir part=descrito
detener pres0=detengo pres1=detienes pres2=detiene pres5=detienen indef0=detuve indef1=detuviste indef2=detuvo indef3=detuvimos indef4=detuvisteis indef5=detuvieron fut0=detendré fut1=detendrás fut2=detendrá fut3=detendremos fut4=detendréis fut5=detendrán cond0=detendría cond1=detendrías cond2=detendría cond3=detendríamos cond4=detendríais cond5=detendrían sp0=detenga sp1=detengas sp2=detenga sp3=detengamos sp4=detengáis sp5=detengan si0=detuviera si1=detuvieras si2=detuviera si3=detuviéramos si4=detuvierais si5=detuvieran imp1=detén
disponer pres0=dispongo indef0=dispuse indef1=dispusiste indef2=dispuso indef3=dispusimos indef4=dispusisteis indef5=dispusieron fut0=dispondré fut1=dispondrás fut2=dispondrá fut3=dispondremos fut4=dispondréis fut5=dispondrán cond0=dispondría cond1=dispondrías cond2=dispondría cond3=dispondríamos cond4=dispondríais cond5=dispondrían sp0=disponga sp1=dispongas sp2=disponga sp3=dispongamos sp4=dispongáis sp5=dispongan si0=dispusiera si1=dispusieras si2=dispusiera si3=dispusiéramos si4=dispusierais si5=dispusieran imp1=dispón part=dispuesto
doler pres0=duelo pres1=dueles pres2=duele pres5=duelen sp0=duela sp1=duelas sp2=duela sp5=duelan imp1=duele
encender pres0=enciendo pres1=enciendes pres2=enciende pres5=encienden sp0=encienda sp1=enciendas sp2=encienda sp5=enciendan imp1=enciende
establecer pres0=establezco sp0=establezca sp1=establezcas sp2=establezca sp3=establezcamos sp4=establezcáis sp5=establezcan
imprimir part=impreso
inscribir part=inscrito
invertir pres0=invierto pres1=inviertes pres2=invierte pres5=invierten indef2=invirtió indef5=invirtieron sp0=invierta sp1=inviertas sp2=invierta sp3=invirtamos sp4=invirtáis sp5=inviertan si0=invirtiera si1=invirtieras si2=invirtiera si3=invirtiéramos si4=invirtierais si5=invirtieran imp1=invierte ger=invirtiendo
mantener pres0=mantengo pres1=mantienes pres2=mantiene pres5=mantienen indef0=mantuve indef1=mantuviste indef2=mantuvo indef3=mantuvimos indef4=mantuvisteis indef5=mantuvieron fut0=mantendré fut1=mantendrás fut2=mantendrá fut3=mantendremos fut4=mantendréis fut5=mantendrán cond0=mantendría cond1=mantendrías cond2=mantendría cond3=mantendríamos cond4=mantendríais cond5=mantendrían sp0=mantenga sp1=mantengas sp2=mantenga sp3=mantengamos sp4=mantengáis sp5=mantengan si0=mantuviera si1=mantuvieras si2=mantuviera si3=mantuviéramos si4=mantuvierais si5=mantuvieran imp1=mantén
obedecer pres0=obedezco sp0=obedezca sp1=obedezcas sp2=obedezca sp3=obedezcamos sp4=obedezcáis sp5=obedezcan
obtener pres0=obtengo pres1=obtienes pres2=obtiene pres5=obtienen indef0=obtuve indef1=obtuviste indef2=obtuvo indef3=obtuvimos indef4=obtuvisteis indef5=obtuvieron fut0=obtendré fut1=obtendrás fut2=obtendrá fut3=obtendremos fut4=obtendréis fut5=obtendrán cond0=obtendría cond1=obtendrías cond2=obtendría cond3=obtendríamos cond4=obtendríais cond5=obtendrían sp0=obtenga sp1=obtengas sp2=obtenga sp3=obtengamos sp4=obtengáis sp5=obtengan si0=obtuviera si1=obtuvieras si2=obtuviera si3=obtuviéramos si4=obtuvierais si5=obtuvieran imp1=obtén
pertenecer pres0=pertenezco sp0=pertenezca sp1=pertenezcas sp2=pertenezca sp3=pertenezcamos sp4=pertenezcáis sp5=pertenezcan
poseer indef1=poseíste indef2=poseyó indef3=poseímos indef4=poseísteis indef5=poseyeron si0=poseyera si1=poseyeras si2=poseyera si3=poseyéramos si4=poseyerais si5=poseyeran part=poseído ger=poseyendo
proponer pres0=propongo indef0=propuse indef1=propusiste indef2=propuso indef3=propusimos indef4=propusisteis indef5=propusieron fut0=propondré fut1=propondrás fut2=propondrá fut3=propondremos fut4=propondréis fut5=propondrán cond0=propondría cond1=propondrías cond2=propondría cond3=propondríamos cond4=propondríais cond5=propondrían sp0=proponga sp1=propongas sp2=proponga sp3=propongamos sp4=propongáis sp5=propongan si0=propusiera si1=propusieras si2=propusiera si3=propusiéramos si4=propusierais si5=propusieran imp1=propón part=propuesto
referir pres0=refiero pres1=refieres pres2=refiere pres5=refieren indef2=refirió indef5=refirieron sp0=refiera sp1=refieras sp2=refiera sp3=refiramos sp4=refiráis sp5=refieran si0=refiriera si1=refirieras si2=refiriera si3=refiriéramos si4=refirierais si5=refirieran imp1=refiere ger=refiriendo
resolver pres0=resuelvo pres1=resuelves pres2=resuelve pres5=resuelven sp0=resuelva sp1=resuelvas sp2=resuelva sp5=resuelvan imp1=resuelve part=resuelto
reunir pres0=reúno pres1=reúnes pres2=reúne pres5=reúnen sp0=reúna sp1=reúnas sp2=reúna sp5=reúnan imp1=reúne
soltar pres0=suelto pres1=sueltas pres2=suelta pres5=sueltan sp0=suelte sp1=sueltes sp2=suelte sp5=suelten imp1=suelta
suponer pres0=supongo indef0=supuse indef1=supusiste indef2=supuso indef3=supusimos indef4=supusisteis indef5=supusieron fut0=supondré fut1=supondrás fut2=supondrá fut3=supondremos fut4=supondréis fut5=supondrán cond0=supondría cond1=supondrías cond2=supondría cond3=supondríamos cond4=supondríais cond5=supondrían sp0=suponga sp1=supongas sp2=suponga sp3=supongamos sp4=supongáis sp5=supongan si0=supusiera si1=supusieras si2=supusiera si3=supusiéramos si4=supusierais si5=supusieran imp1=supón part=supuesto
ampliar pres0=amplío pres1=amplías pres2=amplía pres5=amplían sp0=amplíe sp1=amplíes sp2=amplíe sp5=amplíen imp1=amplía
bendecir pres0=bendigo pres1=bendices pres2=bendice pres5=bendicen indef0=bendije indef1=bendijiste indef2=bendijo indef3=bendijimos indef4=bendijisteis indef5=bendijeron sp0=bendiga sp1=bendigas sp2=bendiga sp3=bendigamos sp4=bendigáis sp5=bendigan si0=bendijera si1=bendijeras si2=bendijera si3=bendijéramos si4=bendijerais si5=bendijeran imp1=bendice ger=bendiciendo
carecer pres0=carezco sp0=carezca sp1=carezcas sp2=carezca sp3=carezcamos sp4=carezcáis sp5=carezcan
componer pres0=compongo indef0=compuse indef1=compusiste indef2=compuso indef3=compusimos indef4=compusisteis indef5=compusieron fut0=compondré fut1=compondrás fut2=compondrá fut3=compondremos fut4=compondréis fut5=compondrán cond0=compondría cond1=compondrías cond2=compondría cond3=compondríamos cond4=compondríais cond5=compondrían sp0=componga sp1=compongas sp2=componga sp3=compongamos sp4=compongáis sp5=compongan si0=compusiera si1=compusieras si2=compusiera si3=compusiéramos si4=compusierais si5=compusieran imp1=compón part=compuesto
confesar pres0=confieso pres1=confiesas pres2=confiesa pres5=confiesan sp0=confiese sp1=confieses sp2=confiese sp5=confiesen imp1=confiesa
criar pres0=crío pres1=crías pres2=cría pres4=criais pres5=crían indef0=crie indef2=crio sp0=críe sp1=críes sp2=críe sp4=crieis sp5=críen imp1=cría
defender pres0=defiendo pres1=defiendes pres2=defiende pres5=defienden sp0=defienda sp1=defiendas sp2=defienda sp5=defiendan imp1=defiende
demostrar pres0=demuestro pres1=demuestras pres2=demuestra pres5=demuestran sp0=demuestre sp1=demuestres sp2=demuestre sp5=demuestren imp1=demuestra
despertar pres0=despierto pres1=despiertas pres2=despierta pres5=despiertan sp0=despierte sp1=despiertes sp2=despierte sp5=despierten imp1=despierta
diferir pres0=difiero pres1=difieres pres2=difiere pres5=difieren indef2=difirió indef5=difirieron sp0=difiera sp1=difieras sp2=difiera sp3=difiramos sp4=difiráis sp5=difieran si0=difiriera si1=difirieras si2=difiriera si3=difiriéramos si4=difirierais si5=difirieran imp1=difiere ger=difiriendo
disminuir pres0=disminuyo pres1=disminuyes pres2=disminuye pres5=disminuyen indef2=disminuyó indef5=disminuyeron sp0=disminuya sp1=disminuyas sp2=disminuya sp3=disminuyamos sp4=disminuyáis sp5=disminuyan si0=disminuyera si1=disminuyeras si2=disminuyera si3=disminuyéramos si4=disminuyerais si5=disminuyeran imp1=disminuye ger=disminuyendo
distraer pres0=distraigo indef0=distraje indef1=distrajiste indef2=distrajo indef3=distrajimos indef4=distrajisteis indef5=distrajeron sp0=distraiga sp1=distraigas sp2=distraiga sp3=distraigamos sp4=distraigáis sp5=distraigan si0=distrajera si1=distrajeras si2=distrajera si3=distrajéramos si4=distrajerais si5=distrajeran part=distraído ger=distrayendo
efectuar pres0=efectúo pres1=efectúas pres2=efectúa pres5=efectúan sp0=efectúe sp1=efectúes sp2=efectúe sp5=efectúen imp1=efectúa
encerrar pres0=encierro pres1=encierras pres2=encierra pres5=encierran sp0=encierre sp1=encierres sp2=encierre sp5=encierren imp1=encierra
enfriar pres0=enfrío pres1=enfrías pres2=enfría pres5=enfrían sp0=enfríe sp1=enfríes sp2=enfríe sp5=enfríen imp1=enfría
enriquecer pres0=enriquezco sp0=enriquezca sp1=enriquezcas sp2=enriquezca sp3=enriquezcamos sp4=enriquezcáis sp5=enriquezcan
entretener pres0=entretengo pres1=entretienes pres2=entretiene pres5=entretienen indef0=entretuve indef1=entretuviste indef2=entretuvo indef3=entretuvimos indef4=entretuvisteis indef5=entretuvieron fut0=entretendré fut1=entretendrás fut2=entretendrá fut3=entretendremos fut4=entretendréis fut5=entretendrán cond0=entretendría cond1=entretendrías cond2=entretendría cond3=entretendríamos cond4=entretendríais cond5=entretendrían sp0=entretenga sp1=entretengas sp2=entretenga sp3=entretengamos sp4=entretengáis sp5=entretengan si0=entretuviera si1=entretuvieras si2=entretuviera si3=entretuviéramos si4=entretuvierais si5=entretuvieran imp1=entretén
envolver pres0=envuelvo pres1=envuelves pres2=envuelve pres5=envuelven sp0=envuelva sp1=envuelvas sp2=envuelva sp5=envuelvan imp1=envuelve part=envuelto
fortalecer pres0=fortalezco sp0=fortalezca sp1=fortalezcas sp2=fortalezca sp3=fortalezcamos sp4=fortalezcáis sp5=fortalezcan
gobernar pres0=gobierno pres1=gobiernas pres2=gobierna pres5=gobiernan sp0=gobierne sp1=gobiernes sp2=gobierne sp5=gobiernen imp1=gobierna
herir pres0=hiero pres1=hieres pres2=hiere pres5=hieren indef2=hirió indef5=hirieron sp0=hiera sp1=hieras sp2=hiera sp3=hiramos sp4=hiráis sp5=hieran si0=hiriera si1=hirieras si2=hiriera si3=hiriéramos si4=hirierais si5=hirieran imp1=hiere ger=hiriendo
manifestar pres0=manifiesto pres1=manifiestas pres2=manifiesta pres5=manifiestan sp0=manifieste sp1=manifiestes sp2=manifieste sp5=manifiesten imp1=manifiesta
oler pres0=huelo pres1=hueles pres2=huele pres5=huelen sp0=huela sp1=huelas sp2=huela sp5=huelan imp1=huele
permanecer pres0=permanezco sp0=permanezca sp1=permanezcas sp2=permanezca sp3=permanezcamos sp4=permanezcáis sp5=permanezcan
prohibir pres0=prohíbo pres1=prohíbes pres2=prohíbe pres5=prohíben sp0=prohíba sp1=prohíbas sp2=prohíba sp5=prohíban imp1=prohíbe
renovar pres0=renuevo pres1=renuevas pres2=renueva pres5=renuevan sp0=renueve sp1=renueves sp2=renueve sp5=renueven imp1=renueva
sembrar pres0=siembro pres1=siembras pres2=siembra pres5=siembran sp0=siembre sp1=siembres sp2=siembre sp5=siembren imp1=siembra
situar pres0=sitúo pres1=sitúas pres2=sitúa pres5=sitúan sp0=sitúe sp1=sitúes sp2=sitúe sp5=sitúen imp1=sitúa
temblar pres0=tiemblo pres1=tiemblas pres2=tiembla pres5=tiemblan sp0=tiemble sp1=tiembles sp2=tiemble sp5=tiemblen imp1=tiembla
tender pres0=tiendo pres1=tiendes pres2=tiende pres5=tienden sp0=tienda sp1=tiendas sp2=tienda sp5=tiendan imp1=tiende
abastecer pres0=abastezco sp0=abastezca sp1=abastezcas sp2=abastezca sp3=abastezcamos sp4=abastezcáis sp5=abastezcan
absolver pres0=absuelvo pres1=absuelves pres2=absuelve pres5=absuelven sp0=absuelva sp1=absuelvas sp2=absuelva sp5=absuelvan imp1=absuelve part=absuelto
acontecer pres0=acontezco sp0=acontezca sp1=acontezcas sp2=acontezca sp3=acontezcamos sp4=acontezcáis sp5=acontezcan
acordar pres0=acuerdo pres1=acuerdas pres2=acuerda pres5=acuerdan sp0=acuerde sp1=acuerdes sp2=acuerde sp5=acuerden imp1=acuerda
amanecer pres0=amanezco sp0=amanezca sp1=amanezcas sp2=amanezca sp3=amanezcamos sp4=amanezcáis sp5=amanezcan
apostar pres0=apuesto pres1=apuestas pres2=apuesta pres5=apuestan sp0=apueste sp1=apuestes sp2=apueste sp5=apuesten imp1=apuesta
apretar pres0=aprieto pres1=aprietas pres2=aprieta pres5=aprietan sp0=apriete sp1=aprietes sp2=apriete sp5=aprieten imp1=aprieta
arrepentir pres0=arrepiento pres1=arrepientes pres2=arrepiente pres5=arrepienten indef2=arrepintió indef5=arrepintieron sp0=arrepienta sp1=arrepientas sp2=arrepienta sp3=arrepintamos sp4=arrepintáis sp5=arrepientan si0=arrepintiera si1=arrepintieras si2=arrepintiera si3=arrepintiéramos si4=arrepintierais si5=arrepintieran imp1=arrepiente ger=arrepintiendo
ascender pres0=asciendo pres1=asciendes pres2=asciende pres5=ascienden sp0=ascienda sp1=asciendas sp2=ascienda sp5=asciendan imp1=asciende
atender pres0=atiendo pres1=atiendes pres2=atiende pres5=atienden sp0=atienda sp1=atiendas sp2=atienda sp5=atiendan imp1=atiende
atribuir pres0=atribuyo pres1=atribuyes pres2=atribuye pres5=atribuyen indef2=atribuyó indef5=atribuyeron sp0=atribuya sp1=atribuyas sp2=atribuya sp3=atribuyamos sp4=atribuyáis sp5=atribuyan si0=atribuyera si1=atribuyeras si2=atribuyera si3=atribuyéramos si4=atribuyerais si5=atribuyeran imp1=atribuye ger=atribuyendo
avergonzar pres0=avergüenzo pres1=avergüenzas pres2=avergüenza pres5=avergüenzan sp0=avergüence sp1=avergüences sp2=avergüence sp5=avergüencen imp1=avergüenza
compadecer pres0=compadezco sp0=compadezca sp1=compadezcas sp2=compadezca sp3=compadezcamos sp4=compadezcáis sp5=compadezcan
concebir pres0=concibo pres1=concibes pres2=concibe pres5=conciben indef2=concibió indef5=concibieron sp0=conciba sp1=concibas sp2=conciba sp3=concibamos sp4=concibáis sp5=conciban si0=concibiera si1=concibieras si2=concibiera si3=concibiéramos si4=concibierais si5=concibieran imp1=concibe ger=concibiendo
consentir pres0=consiento pres1=consientes pres2=consiente pres5=consienten indef2=consintió indef5=consintieron sp0=consienta sp1=consientas sp2=consienta sp3=consintamos sp4=consintáis sp5=consientan si0=consintiera si1=consintieras si2=consintiera si3=consintiéramos si4=consintierais si5=consintieran imp1=consiente ger=consintiendo
distribuir pres0=distribuyo pres1=distribuyes pres2=distribuye pres5=distribuyen indef2=distribuyó indef5=distribuyeron sp0=distribuya sp1=distribuyas sp2=distribuya sp3=distribuyamos sp4=distribuyáis sp5=distribuyan si0=distribuyera si1=distribuyeras si2=distribuyera si3=distribuyéramos si4=distribuyerais si5=distribuyeran imp1=distribuye ger=distribuyendo
esforzar pres0=esfuerzo pres1=esfuerzas pres2=esfuerza pres5=esfuerzan sp0=esfuerce sp1=esfuerces sp2=esfuerce sp5=esfuercen imp1=esfuerza
expedir pres0=expido pres1=expides pres2=expide pres5=expiden indef2=expidió indef5=expidieron sp0=expida sp1=expidas sp2=expida sp3=expidamos sp4=expidáis sp5=expidan si0=expidiera si1=expidieras si2=expidiera si3=expidiéramos si4=expidierais si5=expidieran imp1=expide ger=expidiendo
exponer pres0=expongo indef0=expuse indef1=expusiste indef2=expuso indef3=expusimos indef4=expusisteis indef5=expusieron fut0=expondré fut1=expondrás fut2=expondrá fut3=expondremos fut4=expondréis fut5=expondrán cond0=expondría cond1=expondrías cond2=expondría cond3=expondríamos cond4=expondríais cond5=expondrían sp0=exponga sp1=expongas sp2=exponga sp3=expongamos sp4=expongáis sp5=expongan si0=expusiera si1=expusieras si2=expusiera si3=expusiéramos si4=expusierais si5=expusieran imp1=expón part=expuesto
extraer pres0=extraigo indef0=extraje indef1=extrajiste indef2=extrajo indef3=extrajimos indef4=extrajisteis indef5=extrajeron sp0=extraiga sp1=extraigas sp2=extraiga sp3=extraigamos sp4=extraigáis sp5=extraigan si0=extrajera si1=extrajeras si2=extrajera si3=extrajéramos si4=extrajerais si5=extrajeran part=extraído ger=extrayendo
favorecer pres0=favorezco sp0=favorezca sp1=favorezcas sp2=favorezca sp3=favorezcamos sp4=favorezcáis sp5=favorezcan
fiar pres0=fío pres1=fías pres2=fía pres4=fiais pres5=fían indef0=fie indef2=fio sp0=fíe sp1=fíes sp2=fíe sp4=fieis sp5=fíen imp1=fía
forzar pres0=fuerzo pres1=fuerzas pres2=fuerza pres5=fuerzan sp0=fuerce sp1=fuerces sp2=fuerce sp5=fuercen imp1=fuerza
guiar pres0=guío pres1=guías pres2=guía pres4=guiais pres5=guían indef0=guie indef2=guio sp0=guíe sp1=guíes sp2=guíe sp4=guieis sp5=guíen imp1=guía
imponer pres0=impongo indef0=impuse indef1=impusiste indef2=impuso indef3=impusimos indef4=impusisteis indef5=impusieron fut0=impondré fut1=impondrás fut2=impondrá fut3=impondremos fut4=impondréis fut5=impondrán cond0=impondría cond1=impondrías cond2=impondría cond3=impondríamos cond4=impondríais cond5=impondrían sp0=imponga sp1=impongas sp2=imponga sp3=impongamos sp4=impongáis sp5=impongan si0=impusiera si1=impusieras si2=impusiera si3=impusiéramos si4=impusierais si5=impusieran imp1=impón part=impuesto
intervenir pres0=intervengo pres1=intervienes pres2=interviene pres5=intervienen indef0=intervine indef1=interviniste indef2=intervino indef3=intervinimos indef4=intervinisteis indef5=intervinieron fut0=intervendré fut1=intervendrás fut2=intervendrá fut3=intervendremos fut4=intervendréis fut5=intervendrán cond0=intervendría cond1=intervendrías cond2=intervendría cond3=intervendríamos cond4=intervendríais cond5=intervendrían sp0=intervenga sp1=intervengas sp2=intervenga sp3=intervengamos sp4=intervengáis sp5=intervengan si0=interviniera si1=intervinieras si2=interviniera si3=interviniéramos si4=intervinierais si5=intervinieran imp1=intervén ger=interviniendo
morder pres0=muerdo pres1=muerdes pres2=muerde pres5=muerden sp0=muerda sp1=muerdas sp2=muerda sp5=muerdan imp1=muerde
mover pres0=muevo pres1=mueves pres2=mueve pres5=mueven sp0=mueva sp1=muevas sp2=mueva sp5=muevan imp1=mueve
prevenir pres0=prevengo pres1=previenes pres2=previene pres5=previenen indef0=previne indef1=previniste indef2=previno indef3=previnimos indef4=previnisteis indef5=previnieron fut0=prevendré fut1=prevendrás fut2=prevendrá fut3=prevendremos fut4=prevendréis fut5=prevendrán cond0=prevendría cond1=prevendrías cond2=prevendría cond3=prevendríamos cond4=prevendríais cond5=prevendrían sp0=prevenga sp1=prevengas sp2=prevenga sp3=prevengamos sp4=prevengáis sp5=prevengan si0=previniera si1=previnieras si2=previniera si3=previniéramos si4=previnierais si5=previnieran imp1=prevén ger=previniendo
recomendar pres0=recomiendo pres1=recomiendas pres2=recomienda pres5=recomiendan sp0=recomiende sp1=recomiendes sp2=recomiende sp5=recomienden imp1=recomienda
reconstruir pres0=reconstruyo pres1=reconstruyes pres2=reconstruye pres5=reconstruyen indef2=reconstruyó indef5=reconstruyeron sp0=reconstruya sp1=reconstruyas sp2=reconstruya sp3=reconstruyamos sp4=reconstruyáis sp5=reconstruyan si0=reconstruyera si1=reconstruyeras si2=reconstruyera si3=reconstruyéramos si4=reconstruyerais si5=reconstruyeran imp1=reconstruye ger=reconstruyendo
reproducir pres0=reproduzco indef0=reproduje indef1=reprodujiste indef2=reprodujo indef3=reprodujimos indef4=reprodujisteis indef5=reprodujeron sp0=reproduzca sp1=reproduzcas sp2=reproduzca sp3=reproduzcamos sp4=reproduzcáis sp5=reproduzcan si0=reprodujera si1=reprodujeras si2=reprodujera si3=reprodujéramos si4=reprodujerais si5=reprodujeran
satisfacer pres0=satisfago indef0=satisfice indef1=satisficiste indef2=satisfizo indef3=satisficimos indef4=satisficisteis indef5=satisficieron fut0=satisfaré fut1=satisfarás fut2=satisfará fut3=satisfaremos fut4=satisfaréis fut5=satisfarán cond0=satisfaría cond1=satisfarías cond2=satisfaría cond3=satisfaríamos cond4=satisfaríais cond5=satisfarían sp0=satisfaga sp1=satisfagas sp2=satisfaga sp3=satisfagamos sp4=satisfagáis sp5=satisfagan si0=satisficiera si1=satisficieras si2=satisficiera si3=satisficiéramos si4=satisficierais si5=satisficieran part=satisfecho
sonar pres0=sueno pres1=suenas pres2=suena pres5=suenan sp0=suene sp1=suenes sp2=suene sp5=suenen imp1=suena
transferir pres0=transfiero pres1=transfieres pres2=transfiere pres5=transfieren indef2=transfirió indef5=transfirieron sp0=transfiera sp1=transfieras sp2=transfiera sp3=transfiramos sp4=transfiráis sp5=transfieran si0=transfiriera si1=transfirieras si2=transfiriera si3=transfiriéramos si4=transfirierais si5=transfirieran imp1=transfiere ger=transfiriendo
vaciar pres0=vacío pres1=vacías pres2=vacía pres5=vacían sp0=vacíe sp1=vacíes sp2=vacíe sp5=vacíen imp1=vacía
volar pres0=vuelo pres1=vuelas pres2=vuela pres5=vuelan sp0=vuele sp1=vueles sp2=vuele sp5=vuelen imp1=vuela
aborrecer pres0=aborrezco sp0=aborrezca sp1=aborrezcas sp2=aborrezca sp3=aborrezcamos sp4=aborrezcáis sp5=aborrezcan
abstener pres0=abstengo pres1=abstienes pres2=abstiene pres5=abstienen indef0=abstuve indef1=abstuviste indef2=abstuvo indef3=abstuvimos indef4=abstuvisteis indef5=abstuvieron fut0=abstendré fut1=abstendrás fut2=abstendrá fut3=abstendremos fut4=abstendréis fut5=abstendrán cond0=abstendría cond1=abstendrías cond2=abstendría cond3=abstendríamos cond4=abstendríais cond5=abstendrían sp0=abstenga sp1=abstengas sp2=abstenga sp3=abstengamos sp4=abstengáis sp5=abstengan si0=abstuviera si1=abstuvieras si2=abstuviera si3=abstuviéramos si4=abstuvierais si5=abstuvieran imp1=abstén
acentuar pres0=acentúo pres1=acentúas pres2=acentúa pres5=acentúan sp0=acentúe sp1=acentúes sp2=acentúe sp5=acentúen imp1=acentúa
acertar pres0=acierto pres1=aciertas pres2=acierta pres5=aciertan sp0=acierte sp1=aciertes sp2=acierte sp5=acierten imp1=acierta
adherir pres0=adhiero pres1=adhieres pres2=adhiere pres5=adhieren indef2=adhirió indef5=adhirieron sp0=adhiera sp1=adhieras sp2=adhiera sp3=adhiramos sp4=adhiráis sp5=adhieran si0=adhiriera si1=adhirieras si2=adhiriera si3=adhiriéramos si4=adhirierais si5=adhirieran imp1=adhiere ger=adhiriendo
aislar pres0=aíslo pres1=aíslas pres2=aísla pres5=aíslan sp0=aísle sp1=aísles sp2=aísle sp5=aíslen imp1=aísla
ansiar pres0=ansío pres1=ansías pres2=ansía pres5=ansían sp0=ansíe sp1=ansíes sp2=ansíe sp5=ansíen imp1=ansía
atenuar pres0=atenúo pres1=atenúas pres2=atenúa pres5=atenúan sp0=atenúe sp1=atenúes sp2=atenúe sp5=atenúen imp1=atenúa
cegar pres0=ciego pres1=ciegas pres2=ciega pres5=ciegan sp0=ciegue sp1=ciegues sp2=ciegue sp5=cieguen imp1=ciega
chirriar pres0=chirrío pres1=chirrías pres2=chirría pres5=chirrían sp0=chirríe sp1=chirríes sp2=chirríe sp5=chirríen imp1=chirría
deducir pres0=deduzco indef0=deduje indef1=dedujiste indef2=dedujo indef3=dedujimos indef4=dedujisteis indef5=dedujeron sp0=deduzca sp1=deduzcas sp2=deduzca sp3=deduzcamos sp4=deduzcáis sp5=deduzcan si0=dedujera si1=dedujeras si2=dedujera si3=dedujéramos si4=dedujerais si5=dedujeran
desconfiar pres0=desconfío pres1=desconfías pres2=desconfía pres5=desconfían sp0=desconfíe sp1=desconfíes sp2=desconfíe sp5=desconfíen imp1=desconfía
descontar pres0=descuento pres1=descuentas pres2=descuenta pres5=descuentan sp0=descuente sp1=descuentes sp2=descuente sp5=descuenten imp1=descuenta
deshacer pres0=deshago indef0=deshice indef1=deshiciste indef2=deshizo indef3=deshicimos indef4=deshicisteis indef5=deshicieron fut0=desharé fut1=desharás fut2=deshará fut3=desharemos fut4=desharéis fut5=desharán cond0=desharía cond1=desharías cond2=desharía cond3=desharíamos cond4=desharíais cond5=desharían sp0=deshaga sp1=deshagas sp2=deshaga sp3=deshagamos sp4=deshagáis sp5=deshagan si0=deshiciera si1=deshicieras si2=deshiciera si3=deshiciéramos si4=deshicierais si5=deshicieran imp1=deshaz part=deshecho
desobedecer pres0=desobedezco sp0=desobedezca sp1=desobedezcas sp2=desobedezca sp3=desobedezcamos sp4=desobedezcáis sp5=desobedezcan
diluir pres0=diluyo pres1=diluyes pres2=diluye pres5=diluyen indef2=diluyó indef5=diluyeron sp0=diluya sp1=diluyas sp2=diluya sp3=diluyamos sp4=diluyáis sp5=diluyan si0=diluyera si1=diluyeras si2=diluyera si3=diluyéramos si4=diluyerais si5=diluyeran imp1=diluye ger=diluyendo
enfurecer pres0=enfurezco sp0=enfurezca sp1=enfurezcas sp2=enfurezca sp3=enfurezcamos sp4=enfurezcáis sp5=enfurezcan
equivaler pres0=equivalgo fut0=equivaldré fut1=equivaldrás fut2=equivaldrá fut3=equivaldremos fut4=equivaldréis fut5=equivaldrán cond0=equivaldría cond1=equivaldrías cond2=equivaldría cond3=equivaldríamos cond4=equivaldríais cond5=equivaldrían sp0=equivalga sp1=equivalgas sp2=equivalga sp3=equivalgamos sp4=equivalgáis sp5=equivalgan
florecer pres0=florezco sp0=florezca sp1=florezcas sp2=florezca sp3=florezcamos sp4=florezcáis sp5=florezcan
inducir pres0=induzco indef0=induje indef1=indujiste indef2=indujo indef3=indujimos indef4=indujisteis indef5=indujeron sp0=induzca sp1=induzcas sp2=induzca sp3=induzcamos sp4=induzcáis sp5=induzcan si0=indujera si1=indujeras si2=indujera si3=indujéramos si4=indujerais si5=indujeran
influir pres0=influyo pres1=influyes pres2=influye pres5=influyen indef2=influyó indef5=influyeron sp0=influya sp1=influyas sp2=influya sp3=influyamos sp4=influyáis sp5=influyan si0=influyera si1=influyeras si2=influyera si3=influyéramos si4=influyerais si5=influyeran imp1=influye ger=influyendo
instruir pres0=instruyo pres1=instruyes pres2=instruye pres5=instruyen indef2=instruyó indef5=instruyeron sp0=instruya sp1=instruyas sp2=instruya sp3=instruyamos sp4=instruyáis sp5=instruyan si0=instruyera si1=instruyeras si2=instruyera si3=instruyéramos si4=instruyerais si5=instruyeran imp1=instruye ger=instruyendo
reforzar pres0=refuerzo pres1=refuerzas pres2=refuerza pres5=refuerzan sp0=refuerce sp1=refuerces sp2=refuerce sp5=refuercen imp1=refuerza
rehusar pres0=rehúso pres1=rehúsas pres2=rehúsa pres5=rehúsan sp0=rehúse sp1=rehúses sp2=rehúse sp5=rehúsen imp1=rehúsa
retener pres0=retengo pres1=retienes pres2=retiene pres5=retienen indef0=retuve indef1=retuviste indef2=retuvo indef3=retuvimos indef4=retuvisteis indef5=retuvieron fut0=retendré fut1=retendrás fut2=retendrá fut3=retendremos fut4=retendréis fut5=retendrán cond0=retendría cond1=retendrías cond2=retendría cond3=retendríamos cond4=retendríais cond5=retendrían sp0=retenga sp1=retengas sp2=retenga sp3=retengamos sp4=retengáis sp5=retengan si0=retuviera si1=retuvieras si2=retuviera si3=retuviéramos si4=retuvierais si5=retuvieran imp1=retén
promover pres0=promuevo pres1=promueves pres2=promueve pres5=promueven sp0=promueva sp1=promuevas sp2=promueva sp5=promuevan imp1=promueve
alentar pres0=aliento pres1=alientas pres2=alienta pres5=alientan sp0=aliente sp1=alientes sp2=aliente sp5=alienten imp1=alienta
restablecer pres0=restablezco sp0=restablezca sp1=restablezcas sp2=restablezca sp3=restablezcamos sp4=restablezcáis sp5=restablezcan
proseguir pres0=prosigo pres1=prosigues pres2=prosigue pres5=prosiguen indef2=prosiguió indef5=prosiguieron sp0=prosiga sp1=prosigas sp2=prosiga sp3=prosigamos sp4=prosigáis sp5=prosigan si0=prosiguiera si1=prosiguieras si2=prosiguiera si3=prosiguiéramos si4=prosiguierais si5=prosiguieran imp1=prosigue ger=prosiguiendo
sostener pres0=sostengo pres1=sostienes pres2=sostiene pres5=sostienen indef0=sostuve indef1=sostuviste indef2=sostuvo indef3=sostuvimos indef4=sostuvisteis indef5=sostuvieron fut0=sostendré fut1=sostendrás fut2=sostendrá fut3=sostendremos fut4=sostendréis fut5=sostendrán cond0=sostendría cond1=sostendrías cond2=sostendría cond3=sostendríamos cond4=sostendríais cond5=sostendrían sp0=sostenga sp1=sostengas sp2=sostenga sp3=sostengamos sp4=sostengáis sp5=sostengan si0=sostuviera si1=sostuvieras si2=sostuviera si3=sostuviéramos si4=sostuvierais si5=sostuvieran imp1=sostén
constituir pres0=constituyo pres1=constituyes pres2=constituye pres5=constituyen indef2=constituyó indef5=constituyeron sp0=constituya sp1=constituyas sp2=constituya sp3=constituyamos sp4=constituyáis sp5=constituyan si0=constituyera si1=constituyeras si2=constituyera si3=constituyéramos si4=constituyerais si5=constituyeran imp1=constituye ger=constituyendo
extender pres0=extiendo pres1=extiendes pres2=extiende pres5=extienden sp0=extienda sp1=extiendas sp2=extienda sp5=extiendan imp1=extiende
proveer indef1=proveíste indef2=proveyó indef3=proveímos indef4=proveísteis indef5=proveyeron si0=proveyera si1=proveyeras si2=proveyera si3=proveyéramos si4=proveyerais si5=proveyeran part=proveído ger=proveyendo
prever pres0=preveo pres1=prevés pres2=prevé pres5=prevén sp0=prevea sp1=preveas sp2=prevea sp3=preveamos sp4=preveáis sp5=prevean impf0=preveía impf1=preveías impf2=preveía impf3=preveíamos impf4=preveíais impf5=preveían imp1=prevé part=previsto
requerir pres0=requiero pres1=requieres pres2=requiere pres5=requieren indef2=requirió indef5=requirieron sp0=requiera sp1=requieras sp2=requiera sp3=requiramos sp4=requiráis sp5=requieran si0=requiriera si1=requirieras si2=requiriera si3=requiriéramos si4=requirierais si5=requirieran imp1=requiere ger=requiriendo
predecir pres0=predigo pres1=predices pres2=predice pres5=predicen indef0=predije indef1=predijiste indef2=predijo indef3=predijimos indef4=predijisteis indef5=predijeron sp0=prediga sp1=predigas sp2=prediga sp3=predigamos sp4=predigáis sp5=predigan si0=predijera si1=predijeras si2=predijera si3=predijéramos si4=predijerais si5=predijeran imp1=predice part=predicho ger=prediciendo
rendir pres0=rindo pres1=rindes pres2=rinde pres5=rinden indef2=rindió indef5=rindieron sp0=rinda sp1=rindas sp2=rinda sp3=rindamos sp4=rindáis sp5=rindan si0=rindiera si1=rindieras si2=rindiera si3=rindiéramos si4=rindierais si5=rindieran imp1=rinde ger=rindiendo
interactuar pres0=interactúo pres1=interactúas pres2=interactúa pres5=interactúan sp0=interactúe sp1=interactúes sp2=interactúe sp5=interactúen imp1=interactúa
desplegar pres0=despliego pres1=despliegas pres2=despliega pres5=despliegan sp0=despliegue sp1=despliegues sp2=despliegue sp5=desplieguen imp1=despliega
enmendar pres0=enmiendo pres1=enmiendas pres2=enmienda pres5=enmiendan sp0=enmiende sp1=enmiendes sp2=enmiende sp5=enmienden imp1=enmienda
enterrar pres0=entierro pres1=entierras pres2=entierra pres5=entierran sp0=entierre sp1=entierres sp2=entierre sp5=entierren imp1=entierra
denegar pres0=deniego pres1=deniegas pres2=deniega pres5=deniegan sp0=deniegue sp1=deniegues sp2=deniegue sp5=denieguen imp1=deniega
rodar pres0=ruedo pres1=ruedas pres2=rueda pres5=ruedan sp0=ruede sp1=ruedes sp2=ruede sp5=rueden imp1=rueda
revertir pres0=revierto pres1=reviertes pres2=revierte pres5=revierten indef2=revirtió indef5=revirtieron sp0=revierta sp1=reviertas sp2=revierta sp3=revirtamos sp4=revirtáis sp5=reviertan si0=revirtiera si1=revirtieras si2=revirtiera si3=revirtiéramos si4=revirtierais si5=revirtieran imp1=revierte ger=revirtiendo
remover pres0=remuevo pres1=remueves pres2=remueve pres5=remueven sp0=remueva sp1=remuevas sp2=remueva sp5=remuevan imp1=remueve
concertar pres0=concierto pres1=conciertas pres2=concierta pres5=conciertan sp0=concierte sp1=conciertes sp2=concierte sp5=concierten imp1=concierta
desafiar pres0=desafío pres1=desafías pres2=desafía pres5=desafían sp0=desafíe sp1=desafíes sp2=desafíe sp5=desafíen imp1=desafía
contraer pres0=contraigo indef0=contraje indef1=contrajiste indef2=contrajo indef3=contrajimos indef4=contrajisteis indef5=contrajeron sp0=contraiga sp1=contraigas sp2=contraiga sp3=contraigamos sp4=contraigáis sp5=contraigan si0=contrajera si1=contrajeras si2=contrajera si3=contrajéramos si4=contrajerais si5=contrajeran part=contraído ger=contrayendo
desviar pres0=desvío pres1=desvías pres2=desvía pres5=desvían sp0=desvíe sp1=desvíes sp2=desvíe sp5=desvíen imp1=desvía
paliar pres0=palío pres1=palías pres2=palía pres5=palían sp0=palíe sp1=palíes sp2=palíe sp5=palíen imp1=palía
disolver pres0=disuelvo pres1=disuelves pres2=disuelve pres5=disuelven sp0=disuelva sp1=disuelvas sp2=disuelva sp5=disuelvan imp1=disuelve part=disuelto
discernir pres0=discierno pres1=disciernes pres2=discierne pres5=disciernen sp0=discierna sp1=disciernas sp2=discierna sp5=disciernan imp1=discierne
lucir pres0=luzco sp0=luzca sp1=luzcas sp2=luzca sp3=luzcamos sp4=luzcáis sp5=luzcan
complacer pres0=complazco sp0=complazca sp1=complazcas sp2=complazca sp3=complazcamos sp4=complazcáis sp5=complazcan
desalentar pres0=desaliento pres1=desalientas pres2=desalienta pres5=desalientan sp0=desaliente sp1=desalientes sp2=desaliente sp5=desalienten imp1=desalienta
llover pres0=lluevo pres1=llueves pres2=llueve pres5=llueven sp0=llueva sp1=lluevas sp2=llueva sp5=lluevan imp1=llueve
posponer pres0=pospongo indef0=pospuse indef1=pospusiste indef2=pospuso indef3=pospusimos indef4=pospusisteis indef5=pospusieron fut0=pospondré fut1=pospondrás fut2=pospondrá fut3=pospondremos fut4=pospondréis fut5=pospondrán cond0=pospondría cond1=pospondrías cond2=pospondría cond3=pospondríamos cond4=pospondríais cond5=pospondrían sp0=posponga sp1=pospongas sp2=posponga sp3=pospongamos sp4=pospongáis sp5=pospongan si0=pospusiera si1=pospusieras si2=pospusiera si3=pospusiéramos si4=pospusierais si5=pospusieran imp1=pospón part=pospuesto
prevalecer pres0=prevalezco sp0=prevalezca sp1=prevalezcas sp2=prevalezca sp3=prevalezcamos sp4=prevalezcáis sp5=prevalezcan
comparecer pres0=comparezco sp0=comparezca sp1=comparezcas sp2=comparezca sp3=comparezcamos sp4=comparezcáis sp5=comparezcan
convenir pres0=convengo pres1=convienes pres2=conviene pres5=convienen indef0=convine indef1=conviniste indef2=convino indef3=convinimos indef4=convinisteis indef5=convinieron fut0=convendré fut1=convendrás fut2=convendrá fut3=convendremos fut4=convendréis fut5=convendrán cond0=convendría cond1=convendrías cond2=convendría cond3=convendríamos cond4=convendríais cond5=convendrían sp0=convenga sp1=convengas sp2=convenga sp3=convengamos sp4=convengáis sp5=convengan si0=conviniera si1=convinieras si2=conviniera si3=conviniéramos si4=convinierais si5=convinieran imp1=convén ger=conviniendo
descender pres0=desciendo pres1=desciendes pres2=desciende pres5=descienden sp0=descienda sp1=desciendas sp2=descienda sp5=desciendan imp1=desciende
perpetuar pres0=perpetúo pres1=perpetúas pres2=perpetúa pres5=perpetúan sp0=perpetúe sp1=perpetúes sp2=perpetúe sp5=perpetúen imp1=perpetúa
placer pres0=plazco sp0=plazca sp1=plazcas sp2=plazca sp3=plazcamos sp4=plazcáis sp5=plazcan
esclarecer pres0=esclarezco sp0=esclarezca sp1=esclarezcas sp2=esclarezca sp3=esclarezcamos sp4=esclarezcáis sp5=esclarezcan
interponer pres0=interpongo indef0=interpuse indef1=interpusiste indef2=interpuso indef3=interpusimos indef4=interpusisteis indef5=interpusieron fut0=interpondré fut1=interpondrás fut2=interpondrá fut3=interpondremos fut4=interpondréis fut5=interpondrán cond0=interpondría cond1=interpondrías cond2=interpondría cond3=interpondríamos cond4=interpondríais cond5=interpondrían sp0=interponga sp1=interpongas sp2=interponga sp3=interpongamos sp4=interpongáis sp5=interpongan si0=interpusiera si1=interpusieras si2=interpusiera si3=interpusiéramos si4=interpusierais si5=interpusieran imp1=interpón part=interpuesto
suscribir part=suscrito
envejecer pres0=envejezco sp0=envejezca sp1=envejezcas sp2=envejezca sp3=envejezcamos sp4=envejezcáis sp5=envejezcan
instituir pres0=instituyo pres1=instituyes pres2=instituye pres5=instituyen indef2=instituyó indef5=instituyeron sp0=instituya sp1=instituyas sp2=instituya sp3=instituyamos sp4=instituyáis sp5=instituyan si0=instituyera si1=instituyeras si2=instituyera si3=instituyéramos si4=instituyerais si5=instituyeran imp1=instituye ger=instituyendo
encubrir part=encubierto
quebrar pres0=quiebro pres1=quiebras pres2=quiebra pres5=quiebran sp0=quiebre sp1=quiebres sp2=quiebre sp5=quiebren imp1=quiebra
acrecentar pres0=acreciento pres1=acrecientas pres2=acrecienta pres5=acrecientan sp0=acreciente sp1=acrecientes sp2=acreciente sp5=acrecienten imp1=acrecienta
espiar pres0=espío pres1=espías pres2=espía pres5=espían sp0=espíe sp1=espíes sp2=espíe sp5=espíen imp1=espía
cocer pres0=cuezo pres1=cueces pres2=cuece pres5=cuecen sp0=cueza sp1=cuezas sp2=cueza sp3=cozamos sp4=cozáis sp5=cuezan imp1=cuece
conferir pres0=confiero pres1=confieres pres2=confiere pres5=confieren indef2=confirió indef5=confirieron sp0=confiera sp1=confieras sp2=confiera sp3=confiramos sp4=confiráis sp5=confieran si0=confiriera si1=confirieras si2=confiriera si3=confiriéramos si4=confirierais si5=confirieran imp1=confiere ger=confiriendo
maldecir pres0=maldigo pres1=maldices pres2=maldice pres5=maldicen indef0=maldije indef1=maldijiste indef2=maldijo indef3=maldijimos indef4=maldijisteis indef5=maldijeron sp0=maldiga sp1=maldigas sp2=maldiga sp3=maldigamos sp4=maldigáis sp5=maldigan si0=maldijera si1=maldijeras si2=maldijera si3=maldijéramos si4=maldijerais si5=maldijeran imp1=maldice ger=maldiciendo
padecer pres0=padezco sp0=padezca sp1=padezcas sp2=padezca sp3=padezcamos sp4=padezcáis sp5=padezcan
tentar pres0=tiento pres1=tientas pres2=tienta pres5=tientan sp0=tiente sp1=tientes sp2=tiente sp5=tienten imp1=tienta
nevar pres0=nievo pres1=nievas pres2=nieva pres5=nievan sp0=nieve sp1=nieves sp2=nieve sp5=nieven imp1=nieva
gemir pres0=gimo pres1=gimes pres2=gime pres5=gimen indef2=gimió indef5=gimieron sp0=gima sp1=gimas sp2=gima sp3=gimamos sp4=gimáis sp5=giman si0=gimiera si1=gimieras si2=gimiera si3=gimiéramos si4=gimierais si5=gimieran imp1=gime ger=gimiendo
poblar pres0=pueblo pres1=pueblas pres2=puebla pres5=pueblan sp0=pueble sp1=puebles sp2=pueble sp5=pueblen imp1=puebla
errar pres0=yerro pres1=yerras pres2=yerra pres5=yerran sp0=yerre sp1=yerres sp2=yerre sp5=yerren imp1=yerra
yacer pres0=yazco sp0=yazca sp1=yazcas sp2=yazca sp3=yazcamos sp4=yazcáis sp5=yazcan
roer indef1=roíste indef2=royó indef3=roímos indef4=roísteis indef5=royeron si0=royera si1=royeras si2=royera si3=royéramos si4=royerais si5=royeran part=roído ger=royendo
pudrir part=podrido
engrosar pres0=engrueso pres1=engruesas pres2=engruesa pres5=engruesan sp0=engruese sp1=engrueses sp2=engruese sp5=engruesen imp1=engruesa
serrar pres0=sierro pres1=sierras pres2=sierra pres5=sierran sp0=sierre sp1=sierres sp2=sierre sp5=sierren imp1=sierra
helar pres0=hielo pres1=hielas pres2=hiela pres5=hielan sp0=hiele sp1=hieles sp2=hiele sp5=hielen imp1=hiela
enraizar pres0=enraízo pres1=enraízas pres2=enraíza pres5=enraízan sp0=enraíce sp1=enraíces sp2=enraíce sp5=enraícen imp1=enraíza
plegar pres0=pliego pres1=pliegas pres2=pliega pres5=pliegan sp0=pliegue sp1=pliegues sp2=pliegue sp5=plieguen imp1=pliega
revolver pres0=revuelvo pres1=revuelves pres2=revuelve pres5=revuelven sp0=revuelva sp1=revuelvas sp2=revuelva sp5=revuelvan imp1=revuelve part=revuelto
derretir pres0=derrito pres1=derrites pres2=derrite pres5=derriten indef2=derritió indef5=derritieron sp0=derrita sp1=derritas sp2=derrita sp3=derritamos sp4=derritáis sp5=derritan si0=derritiera si1=derritieras si2=derritiera si3=derritiéramos si4=derritierais si5=derritieran imp1=derrite ger=derritiendo
afluir pres0=afluyo pres1=afluyes pres2=afluye pres5=afluyen indef2=afluyó indef5=afluyeron sp0=afluya sp1=afluyas sp2=afluya sp3=afluyamos sp4=afluyáis sp5=afluyan si0=afluyera si1=afluyeras si2=afluyera si3=afluyéramos si4=afluyerais si5=afluyeran imp1=afluye ger=afluyendo
fluir pres0=fluyo pres1=fluyes pres2=fluye pres4=fluis pres5=fluyen indef0=flui indef2=fluyó indef5=fluyeron sp0=fluya sp1=fluyas sp2=fluya sp3=fluyamos sp4=fluyáis sp5=fluyan si0=fluyera si1=fluyeras si2=fluyera si3=fluyéramos si4=fluyerais si5=fluyeran imp1=fluye ger=fluyendo
seducir pres0=seduzco indef0=seduje indef1=sedujiste indef2=sedujo indef3=sedujimos indef4=sedujisteis indef5=sedujeron sp0=seduzca sp1=seduzcas sp2=seduzca sp3=seduzcamos sp4=seduzcáis sp5=seduzcan si0=sedujera si1=sedujeras si2=sedujera si3=sedujéramos si4=sedujerais si5=sedujeran
verter pres0=vierto pres1=viertes pres2=vierte pres5=vierten sp0=vierta sp1=viertas sp2=vierta sp5=viertan imp1=vierte
regar pres0=riego pres1=riegas pres2=riega pres5=riegan sp0=riegue sp1=riegues sp2=riegue sp5=rieguen imp1=riega
reponer pres0=repongo indef0=repuse indef1=repusiste indef2=repuso indef3=repusimos indef4=repusisteis indef5=repusieron fut0=repondré fut1=repondrás fut2=repondrá fut3=repondremos fut4=repondréis fut5=repondrán cond0=repondría cond1=repondrías cond2=repondría cond3=repondríamos cond4=repondríais cond5=repondrían sp0=reponga sp1=repongas sp2=reponga sp3=repongamos sp4=repongáis sp5=repongan si0=repusiera si1=repusieras si2=repusiera si3=repusiéramos si4=repusierais si5=repusieran imp1=repón part=repuesto
rehacer pres0=rehago indef0=rehíce indef1=rehiciste indef2=rehízo indef3=rehicimos indef4=rehicisteis indef5=rehicieron fut0=reharé fut1=reharás fut2=rehará fut3=reharemos fut4=reharéis fut5=reharán cond0=reharía cond1=reharías cond2=reharía cond3=reharíamos cond4=reharíais cond5=reharían sp0=rehaga sp1=rehagas sp2=rehaga sp3=rehagamos sp4=rehagáis sp5=rehagan si0=rehiciera si1=rehicieras si2=rehiciera si3=rehiciéramos si4=rehicierais si5=rehicieran imp1=rehaz part=rehecho
encomendar pres0=encomiendo pres1=encomiendas pres2=encomienda pres5=encomiendan sp0=encomiende sp1=encomiendes sp2=encomiende sp5=encomienden imp1=encomienda
interferir pres0=interfiero pres1=interfieres pres2=interfiere pres5=interfieren indef2=interfirió indef5=interfirieron sp0=interfiera sp1=interfieras sp2=interfiera sp3=interfiramos sp4=interfiráis sp5=interfieran si0=interfiriera si1=interfirieras si2=interfiriera si3=interfiriéramos si4=interfirierais si5=interfirieran imp1=interfiere ger=interfiriendo
aunar pres0=aúno pres1=aúnas pres2=aúna pres5=aúnan sp0=aúne sp1=aúnes sp2=aúne sp5=aúnen imp1=aúna
ingerir pres0=ingiero pres1=ingieres pres2=ingiere pres5=ingieren indef2=ingirió indef5=ingirieron sp0=ingiera sp1=ingieras sp2=ingiera sp3=ingiramos sp4=ingiráis sp5=ingieran si0=ingiriera si1=ingirieras si2=ingiriera si3=ingiriéramos si4=ingirierais si5=ingirieran imp1=ingiere ger=ingiriendo
regir pres0=rijo pres1=riges pres2=rige pres5=rigen indef2=rigió indef5=rigieron sp0=rija sp1=rijas sp2=rija sp3=rijamos sp4=rijáis sp5=rijan si0=rigiera si1=rigieras si2=rigiera si3=rigiéramos si4=rigierais si5=rigieran imp1=rige ger=rigiendo
trascender pres0=trasciendo pres1=trasciendes pres2=trasciende pres5=trascienden sp0=trascienda sp1=trasciendas sp2=trascienda sp5=trasciendan imp1=trasciende
restituir pres0=restituyo pres1=restituyes pres2=restituye pres5=restituyen indef2=restituyó indef5=restituyeron sp0=restituya sp1=restituyas sp2=restituya sp3=restituyamos sp4=restituyáis sp5=restituyan si0=restituyera si1=restituyeras si2=restituyera si3=restituyéramos si4=restituyerais si5=restituyeran imp1=restituye ger=restituyendo
reventar pres0=reviento pres1=revientas pres2=revienta pres5=revientan sp0=reviente sp1=revientes sp2=reviente sp5=revienten imp1=revienta
obstruir pres0=obstruyo pres1=obstruyes pres2=obstruye pres5=obstruyen indef2=obstruyó indef5=obstruyeron sp0=obstruya sp1=obstruyas sp2=obstruya sp3=obstruyamos sp4=obstruyáis sp5=obstruyan si0=obstruyera si1=obstruyeras si2=obstruyera si3=obstruyéramos si4=obstruyerais si5=obstruyeran imp1=obstruye ger=obstruyendo
entorpecer pres0=entorpezco sp0=entorpezca sp1=entorpezcas sp2=entorpezca sp3=entorpezcamos sp4=entorpezcáis sp5=entorpezcan
recaer pres0=recaigo indef1=recaíste indef2=recayó indef3=recaímos indef4=recaísteis indef5=recayeron sp0=recaiga sp1=recaigas sp2=recaiga sp3=recaigamos sp4=recaigáis sp5=recaigan si0=recayera si1=recayeras si2=recayera si3=recayéramos si4=recayerais si5=recayeran part=recaído ger=recayendo
contradecir pres0=contradigo pres1=contradices pres2=contradice pres5=contradicen indef0=contradije indef1=contradijiste indef2=contradijo indef3=contradijimos indef4=contradijisteis indef5=contradijeron sp0=contradiga sp1=contradigas sp2=contradiga sp3=contradigamos sp4=contradigáis sp5=contradigan si0=contradijera si1=contradijeras si2=contradijera si3=contradijéramos si4=contradijerais si5=contradijeran imp1=contradice part=contradicho ger=contradiciendo
fluctuar pres0=fluctúo pres1=fluctúas pres2=fluctúa pres5=fluctúan sp0=fluctúe sp1=fluctúes sp2=fluctúe sp5=fluctúen imp1=fluctúa
repensar pres0=repienso pres1=repiensas pres2=repiensa pres5=repiensan sp0=repiense sp1=repienses sp2=repiense sp5=repiensen imp1=repiensa
revaluar pres0=revalúo pres1=revalúas pres2=revalúa pres5=revalúan sp0=revalúe sp1=revalúes sp2=revalúe sp5=revalúen imp1=revalúa
soldar pres0=sueldo pres1=sueldas pres2=suelda pres5=sueldan sp0=suelde sp1=sueldes sp2=suelde sp5=suelden imp1=suelda
redescubrir part=redescubierto
endurecer pres0=endurezco sp0=endurezca sp1=endurezcas sp2=endurezca sp3=endurezcamos sp4=endurezcáis sp5=endurezcan
demoler pres0=demuelo pres1=demueles pres2=demuele pres5=demuelen sp0=demuela sp1=demuelas sp2=demuela sp5=demuelan imp1=demuele
conmover pres0=conmuevo pres1=conmueves pres2=conmueve pres5=conmueven sp0=conmueva sp1=conmuevas sp2=conmueva sp5=conmuevan imp1=conmueve
desconocer pres0=desconozco sp0=desconozca sp1=desconozcas sp2=desconozca sp3=desconozcamos sp4=desconozcáis sp5=desconozcan
asentar pres0=asiento pres1=asientas pres2=asienta pres5=asientan sp0=asiente sp1=asientes sp2=asiente sp5=asienten imp1=asienta
moler pres0=muelo pres1=mueles pres2=muele pres5=muelen sp0=muela sp1=muelas sp2=muela sp5=muelan imp1=muele
desenterrar pres0=desentierro pres1=desentierras pres2=desentierra pres5=desentierran sp0=desentierre sp1=desentierres sp2=desentierre sp5=desentierren imp1=desentierra
revestir pres0=revisto pres1=revistes pres2=reviste pres5=revisten indef2=revistió indef5=revistieron sp0=revista sp1=revistas sp2=revista sp3=revistamos sp4=revistáis sp5=revistan si0=revistiera si1=revistieras si2=revistiera si3=revistiéramos si4=revistierais si5=revistieran imp1=reviste ger=revistiendo
oponer pres0=opongo indef0=opuse indef1=opusiste indef2=opuso indef3=opusimos indef4=opusisteis indef5=opusieron fut0=opondré fut1=opondrás fut2=opondrá fut3=opondremos fut4=opondréis fut5=opondrán cond0=opondría cond1=opondrías cond2=opondría cond3=opondríamos cond4=opondríais cond5=opondrían sp0=oponga sp1=opongas sp2=oponga sp3=opongamos sp4=opongáis sp5=opongan si0=opusiera si1=opusieras si2=opusiera si3=opusiéramos si4=opusierais si5=opusieran imp1=opón part=opuesto
reescribir part=reescrito
sobresalir pres0=sobresalgo fut0=sobresaldré fut1=sobresaldrás fut2=sobresaldrá fut3=sobresaldremos fut4=sobresaldréis fut5=sobresaldrán cond0=sobresaldría cond1=sobresaldrías cond2=sobresaldría cond3=sobresaldríamos cond4=sobresaldríais cond5=sobresaldrían sp0=sobresalga sp1=sobresalgas sp2=sobresalga sp3=sobresalgamos sp4=sobresalgáis sp5=sobresalgan imp1=sobresal
volcar pres0=vuelco pres1=vuelcas pres2=vuelca pres5=vuelcan sp0=vuelque sp1=vuelques sp2=vuelque sp5=vuelquen imp1=vuelca
destituir pres0=destituyo pres1=destituyes pres2=destituye pres5=destituyen indef2=destituyó indef5=destituyeron sp0=destituya sp1=destituyas sp2=destituya sp3=destituyamos sp4=destituyáis sp5=destituyan si0=destituyera si1=destituyeras si2=destituyera si3=destituyéramos si4=destituyerais si5=destituyeran imp1=destituye ger=destituyendo
rociar pres0=rocío pres1=rocías pres2=rocía pres5=rocían sp0=rocíe sp1=rocíes sp2=rocíe sp5=rocíen imp1=rocía
inferir pres0=infiero pres1=infieres pres2=infiere pres5=infieren indef2=infirió indef5=infirieron sp0=infiera sp1=infieras sp2=infiera sp3=infiramos sp4=infiráis sp5=infieran si0=infiriera si1=infirieras si2=infiriera si3=infiriéramos si4=infirierais si5=infirieran imp1=infiere ger=infiriendo
fregar pres0=friego pres1=friegas pres2=friega pres5=friegan sp0=friegue sp1=friegues sp2=friegue sp5=frieguen imp1=friega
oscurecer pres0=oscurezco sp0=oscurezca sp1=oscurezcas sp2=oscurezca sp3=oscurezcamos sp4=oscurezcáis sp5=oscurezcan
reconstituir pres0=reconstituyo pres1=reconstituyes pres2=reconstituye pres5=reconstituyen indef2=reconstituyó indef5=reconstituyeron sp0=reconstituya sp1=reconstituyas sp2=reconstituya sp3=reconstituyamos sp4=reconstituyáis sp5=reconstituyan si0=reconstituyera si1=reconstituyeras si2=reconstituyera si3=reconstituyéramos si4=reconstituyerais si5=reconstituyeran imp1=reconstituye ger=reconstituyendo
insinuar pres0=insinúo pres1=insinúas pres2=insinúa pres5=insinúan sp0=insinúe sp1=insinúes sp2=insinúe sp5=insinúen imp1=insinúa
concordar pres0=concuerdo pres1=concuerdas pres2=concuerda pres5=concuerdan sp0=concuerde sp1=concuerdes sp2=concuerde sp5=concuerden imp1=concuerda
aducir pres0=aduzco indef0=aduje indef1=adujiste indef2=adujo indef3=adujimos indef4=adujisteis indef5=adujeron sp0=aduzca sp1=aduzcas sp2=aduzca sp3=aduzcamos sp4=aduzcáis sp5=aduzcan si0=adujera si1=adujeras si2=adujera si3=adujéramos si4=adujerais si5=adujeran
arrendar pres0=arriendo pres1=arriendas pres2=arrienda pres5=arriendan sp0=arriende sp1=arriendes sp2=arriende sp5=arrienden imp1=arrienda
perecer pres0=perezco sp0=perezca sp1=perezcas sp2=perezca sp3=perezcamos sp4=perezcáis sp5=perezcan
descomponer pres0=descompongo indef0=descompuse indef1=descompusiste indef2=descompuso indef3=descompusimos indef4=descompusisteis indef5=descompusieron fut0=descompondré fut1=descompondrás fut2=descompondrá fut3=descompondremos fut4=descompondréis fut5=descompondrán cond0=descompondría cond1=descompondrías cond2=descompondría cond3=descompondríamos cond4=descompondríais cond5=descompondrían sp0=descomponga sp1=descompongas sp2=descomponga sp3=descompongamos sp4=descompongáis sp5=descompongan si0=descompusiera si1=descompusieras si2=descompusiera si3=descompusiéramos si4=descompusierais si5=descompusieran imp1=descompón part=descompuesto
embellecer pres0=embellezco sp0=embellezca sp1=embellezcas sp2=embellezca sp3=embellezcamos sp4=embellezcáis sp5=embellezcan
reaparecer pres0=reaparezco sp0=reaparezca sp1=reaparezcas sp2=reaparezca sp3=reaparezcamos sp4=reaparezcáis sp5=reaparezcan
desterrar pres0=destierro pres1=destierras pres2=destierra pres5=destierran sp0=destierre sp1=destierres sp2=destierre sp5=destierren imp1=destierra
torcer pres0=tuerzo pres1=tuerces pres2=tuerce pres5=tuercen sp0=tuerza sp1=tuerzas sp2=tuerza sp5=tuerzan imp1=tuerce
contravenir pres0=contravengo pres1=contravienes pres2=contraviene pres5=contravienen indef0=contravine indef1=contraviniste indef2=contravino indef3=contravinimos indef4=contravinisteis indef5=contravinieron fut0=contravendré fut1=contravendrás fut2=contravendrá fut3=contravendremos fut4=contravendréis fut5=contravendrán cond0=contravendría cond1=contravendrías cond2=contravendría cond3=contravendríamos cond4=contravendríais cond5=contravendrían sp0=contravenga sp1=contravengas sp2=contravenga sp3=contravengamos sp4=contravengáis sp5=contravengan si0=contraviniera si1=contravinieras si2=contraviniera si3=contraviniéramos si4=contravinierais si5=contravinieran imp1=contravén ger=contraviniendo
resonar pres0=resueno pres1=resuenas pres2=resuena pres5=resuenan sp0=resuene sp1=resuenes sp2=resuene sp5=resuenen imp1=resuena
sobrevolar pres0=sobrevuelo pres1=sobrevuelas pres2=sobrevuela pres5=sobrevuelan sp0=sobrevuele sp1=sobrevueles sp2=sobrevuele sp5=sobrevuelen imp1=sobrevuela
provenir pres0=provengo pres1=provienes pres2=proviene pres5=provienen indef0=provine indef1=proviniste indef2=provino indef3=provinimos indef4=provinisteis indef5=provinieron fut0=provendré fut1=provendrás fut2=provendrá fut3=provendremos fut4=provendréis fut5=provendrán cond0=provendría cond1=provendrías cond2=provendría cond3=provendríamos cond4=provendríais cond5=provendrían sp0=provenga sp1=provengas sp2=provenga sp3=provengamos sp4=provengáis sp5=provengan si0=proviniera si1=provinieras si2=proviniera si3=proviniéramos si4=provinierais si5=provinieran imp1=provén ger=proviniendo
recomponer pres0=recompongo indef0=recompuse indef1=recompusiste indef2=recompuso indef3=recompusimos indef4=recompusisteis indef5=recompusieron fut0=recompondré fut1=recompondrás fut2=recompondrá fut3=recompondremos fut4=recompondréis fut5=recompondrán cond0=recompondría cond1=recompondrías cond2=recompondría cond3=recompondríamos cond4=recompondríais cond5=recompondrían sp0=recomponga sp1=recompongas sp2=recomponga sp3=recompongamos sp4=recompongáis sp5=recompongan si0=recompusiera si1=recompusieras si2=recompusiera si3=recompusiéramos si4=recompusierais si5=recompusieran imp1=recompón part=recompuesto
cimentar pres0=cimiento pres1=cimientas pres2=cimienta pres5=cimientan sp0=cimiente sp1=cimientes sp2=cimiente sp5=cimienten imp1=cimienta
recomenzar pres0=recomienzo pres1=recomienzas pres2=recomienza pres5=recomienzan sp0=recomience sp1=recomiences sp2=recomience sp5=recomiencen imp1=recomienza
desmentir pres0=desmiento pres1=desmientes pres2=desmiente pres5=desmienten indef2=desmintió indef5=desmintieron sp0=desmienta sp1=desmientas sp2=desmienta sp3=desmintamos sp4=desmintáis sp5=desmientan si0=desmintiera si1=desmintieras si2=desmintiera si3=desmintiéramos si4=desmintierais si5=desmintieran imp1=desmiente ger=desmintiendo
recubrir part=recubierto
disentir pres0=disiento pres1=disientes pres2=disiente pres5=disienten indef2=disintió indef5=disintieron sp0=disienta sp1=disientas sp2=disienta sp3=disintamos sp4=disintáis sp5=disientan si0=disintiera si1=disintieras si2=disintiera si3=disintiéramos si4=disintierais si5=disintieran imp1=disiente ger=disintiendo
reenviar pres0=reenvío pres1=reenvías pres2=reenvía pres5=reenvían sp0=reenvíe sp1=reenvíes sp2=reenvíe sp5=reenvíen imp1=reenvía
proscribir part=proscrito
desvirtuar pres0=desvirtúo pres1=desvirtúas pres2=desvirtúa pres5=desvirtúan sp0=desvirtúe sp1=desvirtúes sp2=desvirtúe sp5=desvirtúen imp1=desvirtúa
intuir pres0=intuyo pres1=intuyes pres2=intuye pres5=intuyen indef2=intuyó indef5=intuyeron sp0=intuya sp1=intuyas sp2=intuya sp3=intuyamos sp4=intuyáis sp5=intuyan si0=intuyera si1=intuyeras si2=intuyera si3=intuyéramos si4=intuyerais si5=intuyeran imp1=intuye ger=intuyendo
circunscribir part=circunscrito
rehuir pres0=rehúyo pres1=rehúyes pres2=rehúye pres5=rehúyen indef2=rehuyó indef5=rehuyeron sp0=rehúya sp1=rehúyas sp2=rehúya sp3=rehuyamos sp4=rehuyáis sp5=rehúyan si0=rehuyera si1=rehuyeras si2=rehuyera si3=rehuyéramos si4=rehuyerais si5=rehuyeran imp1=rehúye ger=rehuyendo
retribuir pres0=retribuyo pres1=retribuyes pres2=retribuye pres5=retribuyen indef2=retribuyó indef5=retribuyeron sp0=retribuya sp1=retribuyas sp2=retribuya sp3=retribuyamos sp4=retribuyáis sp5=retribuyan si0=retribuyera si1=retribuyeras si2=retribuyera si3=retribuyéramos si4=retribuyerais si5=retribuyeran imp1=retribuye ger=retribuyendo
humedecer pres0=humedezco sp0=humedezca sp1=humedezcas sp2=humedezca sp3=humedezcamos sp4=humedezcáis sp5=humedezcan
deponer pres0=depongo indef0=depuse indef1=depusiste indef2=depuso indef3=depusimos indef4=depusisteis indef5=depusieron fut0=depondré fut1=depondrás fut2=depondrá fut3=depondremos fut4=depondréis fut5=depondrán cond0=depondría cond1=depondrías cond2=depondría cond3=depondríamos cond4=depondríais cond5=depondrían sp0=deponga sp1=depongas sp2=deponga sp3=depongamos sp4=depongáis sp5=depongan si0=depusiera si1=depusieras si2=depusiera si3=depusiéramos si4=depusierais si5=depusieran imp1=depón part=depuesto
asentir pres0=asiento pres1=asientes pres2=asiente pres5=asienten indef2=asintió indef5=asintieron sp0=asienta sp1=asientas sp2=asienta sp3=asintamos sp4=asintáis sp5=asientan si0=asintiera si1=asintieras si2=asintiera si3=asintiéramos si4=asintierais si5=asintieran imp1=asiente ger=asintiendo
reprobar pres0=repruebo pres1=repruebas pres2=reprueba pres5=reprueban sp0=repruebe sp1=repruebes sp2=repruebe sp5=reprueben imp1=reprueba
retorcer pres0=retuerzo pres1=retuerces pres2=retuerce pres5=retuercen sp0=retuerza sp1=retuerzas sp2=retuerza sp5=retuerzan imp1=retuerce
adormecer pres0=adormezco sp0=adormezca sp1=adormezcas sp2=adormezca sp3=adormezcamos sp4=adormezcáis sp5=adormezcan
reconvertir pres0=reconvierto pres1=reconviertes pres2=reconvierte pres5=reconvierten indef2=reconvirtió indef5=reconvirtieron sp0=reconvierta sp1=reconviertas sp2=reconvierta sp3=reconvirtamos sp4=reconvirtáis sp5=reconviertan si0=reconvirtiera si1=reconvirtieras si2=reconvirtiera si3=reconvirtiéramos si4=reconvirtierais si5=reconvirtieran imp1=reconvierte ger=reconvirtiendo
remendar pres0=remiendo pres1=remiendas pres2=remienda pres5=remiendan sp0=remiende sp1=remiendes sp2=remiende sp5=remienden imp1=remienda
superponer pres0=superpongo indef0=superpuse indef1=superpusiste indef2=superpuso indef3=superpusimos indef4=superpusisteis indef5=superpusieron fut0=superpondré fut1=superpondrás fut2=superpondrá fut3=superpondremos fut4=superpondréis fut5=superpondrán cond0=superpondría cond1=superpondrías cond2=superpondría cond3=superpondríamos cond4=superpondríais cond5=superpondrían sp0=superponga sp1=superpongas sp2=superponga sp3=superpongamos sp4=superpongáis sp5=superpongan si0=superpusiera si1=superpusieras si2=superpusiera si3=superpusiéramos si4=superpusierais si5=superpusieran imp1=superpón part=superpuesto
repoblar pres0=repueblo pres1=repueblas pres2=repuebla pres5=repueblan sp0=repueble sp1=repuebles sp2=repueble sp5=repueblen imp1=repuebla
contraponer pres0=contrapongo indef0=contrapuse indef1=contrapusiste indef2=contrapuso indef3=contrapusimos indef4=contrapusisteis indef5=contrapusieron fut0=contrapondré fut1=contrapondrás fut2=contrapondrá fut3=contrapondremos fut4=contrapondréis fut5=contrapondrán cond0=contrapondría cond1=contrapondrías cond2=contrapondría cond3=contrapondríamos cond4=contrapondríais cond5=contrapondrían sp0=contraponga sp1=contrapongas sp2=contraponga sp3=contrapongamos sp4=contrapongáis sp5=contrapongan si0=contrapusiera si1=contrapusieras si2=contrapusiera si3=contrapusiéramos si4=contrapusierais si5=contrapusieran imp1=contrapón part=contrapuesto
reconducir pres0=reconduzco indef0=reconduje indef1=recondujiste indef2=recondujo indef3=recondujimos indef4=recondujisteis indef5=recondujeron sp0=reconduzca sp1=reconduzcas sp2=reconduzca sp3=reconduzcamos sp4=reconduzcáis sp5=reconduzcan si0=recondujera si1=recondujeras si2=recondujera si3=recondujéramos si4=recondujerais si5=recondujeran
contrariar pres0=contrarío pres1=contrarías pres2=contraría pres5=contrarían sp0=contraríe sp1=contraríes sp2=contraríe sp5=contraríen imp1=contraría
engullir indef2=engulló indef5=engulleron si0=engullera si1=engulleras si2=engullera si3=engulléramos si4=engullerais si5=engulleran ger=engullendo
desfallecer pres0=desfallezco sp0=desfallezca sp1=desfallezcas sp2=desfallezca sp3=desfallezcamos sp4=desfallezcáis sp5=desfallezcan
estremecer pres0=estremezco sp0=estremezca sp1=estremezcas sp2=estremezca sp3=estremezcamos sp4=estremezcáis sp5=estremezcan
desvanecer pres0=desvanezco sp0=desvanezca sp1=desvanezcas sp2=desvanezca sp3=desvanezcamos sp4=desvanezcáis sp5=desvanezcan
confluir pres0=confluyo pres1=confluyes pres2=confluye pres5=confluyen indef2=confluyó indef5=confluyeron sp0=confluya sp1=confluyas sp2=confluya sp3=confluyamos sp4=confluyáis sp5=confluyan si0=confluyera si1=confluyeras si2=confluyera si3=confluyéramos si4=confluyerais si5=confluyeran imp1=confluye ger=confluyendo
desaprobar pres0=desapruebo pres1=desapruebas pres2=desaprueba pres5=desaprueban sp0=desapruebe sp1=desapruebes sp2=desapruebe sp5=desaprueben imp1=desaprueba
distender pres0=distiendo pres1=distiendes pres2=distiende pres5=distienden sp0=distienda sp1=distiendas sp2=distienda sp5=distiendan imp1=distiende
mecer pres0=mezo sp0=meza sp1=mezas sp2=meza sp3=mezamos sp4=mezáis sp5=mezan
tronar pres0=trueno pres1=truenas pres2=truena pres5=truenan sp0=truene sp1=truenes sp2=truene sp5=truenen imp1=truena
reelegir pres0=reelijo pres1=reeliges pres2=reelige pres5=reeligen indef2=reeligió indef5=reeligieron sp0=reelija sp1=reelijas sp2=reelija sp3=reelijamos sp4=reelijáis sp5=reelijan si0=reeligiera si1=reeligieras si2=reeligiera si3=reeligiéramos si4=reeligierais si5=reeligieran imp1=reelige ger=reeligiendo
ensombrecer pres0=ensombrezco sp0=ensombrezca sp1=ensombrezcas sp2=ensombrezca sp3=ensombrezcamos sp4=ensombrezcáis sp5=ensombrezcan
imbuir pres0=imbuyo pres1=imbuyes pres2=imbuye pres5=imbuyen indef2=imbuyó indef5=imbuyeron sp0=imbuya sp1=imbuyas sp2=imbuya sp3=imbuyamos sp4=imbuyáis sp5=imbuyan si0=imbuyera si1=imbuyeras si2=imbuyera si3=imbuyéramos si4=imbuyerais si5=imbuyeran imp1=imbuye ger=imbuyendo
desvestir pres0=desvisto pres1=desvistes pres2=desviste pres5=desvisten indef2=desvistió indef5=desvistieron sp0=desvista sp1=desvistas sp2=desvista sp3=desvistamos sp4=desvistáis sp5=desvistan si0=desvistiera si1=desvistieras si2=desvistiera si3=desvistiéramos si4=desvistierais si5=desvistieran imp1=desviste ger=desvistiendo
adscribir part=adscrito
embestir pres0=embisto pres1=embistes pres2=embiste pres5=embisten indef2=embistió indef5=embistieron sp0=embista sp1=embistas sp2=embista sp3=embistamos sp4=embistáis sp5=embistan si0=embistiera si1=embistieras si2=embistiera si3=embistiéramos si4=embistierais si5=embistieran imp1=embiste ger=embistiendo
recalentar pres0=recaliento pres1=recalientas pres2=recalienta pres5=recalientan sp0=recaliente sp1=recalientes sp2=recaliente sp5=recalienten imp1=recalienta
apacentar pres0=apaciento pres1=apacientas pres2=apacienta pres5=apacientan sp0=apaciente sp1=apacientes sp2=apaciente sp5=apacienten imp1=apacienta
acostar pres0=acuesto pres1=acuestas pres2=acuesta pres5=acuestan sp0=acueste sp1=acuestes sp2=acueste sp5=acuesten imp1=acuesta
apetecer pres0=apetezco sp0=apetezca sp1=apetezcas sp2=apetezca sp3=apetezcamos sp4=apetezcáis sp5=apetezcan
anochecer pres0=anochezco sp0=anochezca sp1=anochezcas sp2=anochezca sp3=anochezcamos sp4=anochezcáis sp5=anochezcan
esquiar pres0=esquío pres1=esquías pres2=esquía pres5=esquían sp0=esquíe sp1=esquíes sp2=esquíe sp5=esquíen imp1=esquía
teñir pres0=tiño pres1=tiñes pres2=tiñe pres5=tiñen indef2=tiñó indef5=tiñeron sp0=tiña sp1=tiñas sp2=tiña sp3=tiñamos sp4=tiñáis sp5=tiñan si0=tiñera si1=tiñeras si2=tiñera si3=tiñéramos si4=tiñerais si5=tiñeran imp1=tiñe ger=tiñendo
merendar pres0=meriendo pres1=meriendas pres2=merienda pres5=meriendan sp0=meriende sp1=meriendes sp2=meriende sp5=merienden imp1=merienda
atardecer pres0=atardezco sp0=atardezca sp1=atardezcas sp2=atardezca sp3=atardezcamos sp4=atardezcáis sp5=atardezcan
soler pres0=suelo pres1=sueles pres2=suele pres5=suelen sp0=suela sp1=suelas sp2=suela sp5=suelan fut0=- fut1=- fut2=- fut3=- fut4=- fut5=- cond0=- cond1=- cond2=- cond3=- cond4=- cond5=- imp1=- imp4=-
`;
const DLE_UNVERIFIED = ["reasignar","reprogramar","redirigir","reinventar","reconectar","reabastecer","argollar","recolocar"];
// END DLE_REFERENCE
const dleReference = new Map(DLE_REFERENCE.trim().split("\n").filter(Boolean).map((line) => {
  const [verb, ...pairs] = line.split(" ");
  return [verb, Object.fromEntries(pairs.map((pair) => pair.split("=")))];
}));
let dleChecked = 0;
// Основы возвратных глаголов (acostarse → acostar) сверяются, даже если самой основы нет в списке.
const dleVerbs = [...new Set(BASE_VERBS.map((verb) => isReflexive(verb) ? baseVerb(verb) : verb))];
for (const verb of dleVerbs) {
  const shown = api.DISPLAY_INFINITIVES[verb] || verb;
  if (DLE_UNVERIFIED.includes(shown)) continue;
  dleChecked++;
  const forms = formsFor(verb);
  const actual = [...forms.presente, ...forms.indefinido, ...forms.futuro, ...forms.condicional, ...forms.subjuntivo_presente, ...forms.subjuntivo_imperfecto, ...forms.imperfecto, forms.imperativo_afirmativo[1], forms.imperativo_afirmativo[4], forms.formas_no_personales[2], forms.formas_no_personales[1]].map((form) => form.normalize("NFC"));
  const regular = dleRegularForms(shown);
  const special = dleReference.get(shown) || {};
  DLE_LABELS.forEach((label, index) => {
    const expected = special[label] ?? regular[index];
    if (!expected.split("/").includes(actual[index])) {
      issues.push({ verb, tense: `dle_${label}`, person: "-", expected, actual: actual[index], severity: "high" });
    }
  });
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
  ver: "ve", dar: "da", estar: "está", saber: "sabe",
  valer: "vale",
};
for (const [verb, expectedTu] of Object.entries(imperativoChecks)) {
  if (!BASE_VERBS.includes(verb)) continue;
  if (checkedVerbs.has(verb)) continue;
  checkedVerbs.add(verb);
  const info = verbInfo(verb);
  check(verb, "imperativo_afirmativo", 1, expectedTu, info.forms.imperativo_afirmativo[1], "high");
}

// ─── In-app data checks (validateData) ──────────────────────────────────────
// Те же проверки, что приложение выполняет при загрузке и выводит в console.warn:
// учебник, переводы, шпаргалки, наклонения и связи между ними.
for (const message of validateData()) {
  issues.push({
    verb: "validateData",
    tense: "app_data",
    person: "-",
    expected: "нет замечаний",
    actual: message,
    severity: "high",
  });
}

// ─── Textbook answers vs conjugation forms (tilde typos) ─────────────────────
// Слово ответа, которое отличается от формы движка спряжений только тильдой
// (estais вместо estáis, reid вместо reíd), почти всегда опечатка в ответе или
// в движке. Омографы — не глагольные слова, совпадающие с формой без учёта тильды
// (de/dé, este/esté), — перечислены ниже; новое слово сюда добавляй только после
// проверки по RAE.
const TILDE_HOMOGRAPHS = new Set([
  "de", "este", "esta", "estas", "cómo", "hacia", "té", "mamás", "ejército",
  "tomás", "césar", "lucio",
  "rió", // написание книги; принимается наряду с rio (RAE 2010), см. note в 124.4
]);
const stripTilde = (word) => word.normalize("NFD").replace(/́/g, "").normalize("NFC");
const knownForms = new Set(Object.values(api.DISPLAY_INFINITIVES));
const formsByStripped = new Map();
for (const verb of BASE_VERBS) {
  for (const value of Object.values(formsFor(verb))) {
    for (const form of [value].flat()) {
      if (typeof form !== "string") continue;
      for (const word of form.toLowerCase().split(/\s+/)) {
        if (!word || word === "-") continue;
        knownForms.add(word);
        const key = stripTilde(word);
        if (!formsByStripped.has(key)) formsByStripped.set(key, new Set());
        formsByStripped.get(key).add(word);
      }
    }
  }
}
let textbookAnswerWords = 0;
for (const lesson of api.staticChecksData.TEXTBOOK_LESSONS) {
  for (const exercise of lesson.exercises) {
    exercise.items.forEach((item, index) => {
      for (const answer of [item.answer].flat()) {
        for (const word of String(answer).toLowerCase().split(/[\s,.;:¿?¡!()«»"]+/)) {
          if (!word) continue;
          textbookAnswerWords++;
          if (knownForms.has(word) || TILDE_HOMOGRAPHS.has(word)) continue;
          const forms = formsByStripped.get(stripTilde(word));
          if (!forms) continue;
          issues.push({
            verb: `textbook ${exercise.id} #${index + 1}`,
            tense: "answer_tilde",
            person: "-",
            expected: `форма движка: ${[...forms].join(" / ")} (или омограф в TILDE_HOMOGRAPHS)`,
            actual: `${word} в ответе «${answer}»`,
            severity: "high",
          });
        }
      }
    });
  }
}

// ─── Static integrity checks ────────────────────────────────────────────────
// Проверки исходника страницы: id и data-атрибуты в разметке, неиспользуемый код
// и текст данных, который выводится в HTML без экранирования. Работают с текстом
// файла, без DOM. Сообщения выводятся по-русски, как и остальные замечания.
const scriptText = fullScriptCode;
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const styleText = styleMatch ? styleMatch[1] : "";
const toKebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// ─── 1. Duplicate and malformed literal ids ─────────────────────────────────
// Id без подстановок ${…}: один и тот же id в двух местах ломает getElementById.
// Исключения — только взаимоисключающие ветки одного шаблона. Таких случаев сейчас
// нет, поэтому список пуст; новую запись нужно обосновать комментарием здесь.
const ID_EXCEPTIONS = new Set();
const idLines = new Map();
let checkedIds = 0;
for (const match of html.matchAll(/(?<=[\s`'"{])id="([^"]*)"/g)) {
  const id = match[1];
  if (id.includes("${")) continue;
  checkedIds++;
  const line = html.slice(0, match.index).split("\n").length;
  if (id === "" || /\s/.test(id)) {
    issues.push({ verb: "static-html", tense: "malformed-id", person: "-", expected: "непустой id без пробелов", actual: `id="${id}" (строка ${line})`, severity: "high" });
    continue;
  }
  if (!idLines.has(id)) idLines.set(id, []);
  idLines.get(id).push(line);
}
for (const [id, lines] of idLines) {
  if (lines.length > 1 && !ID_EXCEPTIONS.has(id)) {
    issues.push({ verb: "static-html", tense: "duplicate-id", person: "-", expected: "один id на страницу", actual: `id="${id}" в строках ${lines.join(", ")}`, severity: "high" });
  }
}

// ─── 2–3. data-* attributes: written but never read, read but never written ─
// Писатели: литеральные data-x в разметке, динамические data-префикс${…} и присваивания dataset.x = …
// Читатели: селекторы [data-x], dataset.x, attr(data-x) в CSS и строки "data-x" в коде.
// Префикс динамического имени (data-favorite-${kind}) считается записанным для всех имён с этим префиксом.
const DATA_ATTR_MARKUP = /(?<=[\s`'"{])data-([a-z][a-z0-9-]*)(?=[=\s>`])/g;
const DATA_ATTR_DYNAMIC = /(?<=[\s`'"{])data-([a-z][a-z0-9-]*-)\$\{/g;
const markupAttrs = new Set([...html.matchAll(DATA_ATTR_MARKUP)].map((m) => m[1]));
const dynamicAttrPrefixes = [...html.matchAll(DATA_ATTR_DYNAMIC)].map((m) => m[1]);
const jsWrittenAttrs = new Set([...scriptText.matchAll(/dataset\.([a-zA-Z]\w*)\s*=(?!=)/g)].map((m) => toKebab(m[1])));
const readAttrs = new Set([
  ...[...scriptText.matchAll(/\[data-([a-z][a-z0-9-]*)/g)].map((m) => m[1]),
  ...[...styleText.matchAll(/\[data-([a-z][a-z0-9-]*)/g)].map((m) => m[1]),
  ...[...styleText.matchAll(/attr\(data-([a-z][a-z0-9-]*)\)/g)].map((m) => m[1]),
  ...[...scriptText.matchAll(/["'`]data-([a-z][a-z0-9-]*)["'`]/g)].map((m) => m[1]),
  ...[...scriptText.matchAll(/dataset\.([a-zA-Z]\w*)/g)].map((m) => toKebab(m[1])),
]);
// disclosureButton({ action: "x" }) пишет атрибут data-${action}: имена берём из значений action в вызовах.
const disclosureActionAttrs = new Set([...scriptText.matchAll(/disclosureButton\(\{[^}]*?\baction:\s*"([a-z][a-z0-9-]*)"/g)].map((m) => m[1]));
const isWrittenAttr = (name) =>
  markupAttrs.has(name) || jsWrittenAttrs.has(name) || disclosureActionAttrs.has(name) || dynamicAttrPrefixes.some((prefix) => name.startsWith(prefix));

for (const name of markupAttrs) {
  if (!readAttrs.has(name)) {
    issues.push({ verb: "static-html", tense: "unread-data-attr", person: "-", expected: "атрибут читается кодом или CSS", actual: `data-${name} записан в разметке, но нигде не читается`, severity: "high" });
  }
}
// Обработчик или селектор, для которого атрибут нигде не записывается, никогда не сработает.
for (const name of readAttrs) {
  if (!isWrittenAttr(name)) {
    issues.push({ verb: "static-script", tense: "dead-data-reader", person: "-", expected: "атрибут записан в разметке или JS", actual: `[data-${name}] читается, но нигде не записывается`, severity: "low" });
  }
}

// ─── 4–5. Unused top-level functions and constants ──────────────────────────
// Ссылка — любое вхождение имени, кроме объявления и свойства после точки (obj.name).
// Строки, целиком состоящие из комментария, не учитываются. Имена, которые
// возвращаются в песочницу валидатора (api), считаются используемыми.
const codeForRefs = scriptText.split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
function countReferences(source, name) {
  let count = 0;
  const pattern = new RegExp(`(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g");
  for (const match of source.matchAll(pattern)) {
    const before = source.slice(Math.max(0, match.index - 3), match.index);
    if (before.endsWith(".") && !before.endsWith("...")) continue;
    count++;
  }
  return count;
}
const exportedNames = new Set(Object.keys(api));
const topFunctions = [...scriptText.matchAll(/^(?:async )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]);
const topConsts = [...scriptText.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1]);
for (const name of topFunctions) {
  if (!exportedNames.has(name) && countReferences(codeForRefs, name) <= 1) {
    issues.push({ verb: "static-script", tense: "unused-function", person: "-", expected: "функция вызывается или передаётся", actual: `function ${name}() нигде не используется`, severity: "low" });
  }
}
for (const name of topConsts) {
  if (!exportedNames.has(name) && countReferences(codeForRefs, name) <= 1) {
    issues.push({ verb: "static-script", tense: "unused-const", person: "-", expected: "константа используется", actual: `const ${name} нигде не используется`, severity: "high" });
  }
}

// ─── 5b. Manual escaping outside the html template ─────────────────────────
// Разметка собирается шаблоном html`…`: он экранирует подстановки сам. Ручной escapeHTML остаётся только
// в определении функции и внутри шаблона (htmlValue); новый вызов означает возврат к старому стилю.
const manualEscapes = (scriptText.match(/escapeHTML\(/g) || []).length - 2;
if (manualEscapes > 0) {
  issues.push({ verb: "static-code", tense: "manual-escape", person: "-", expected: "разметка через html`…` без escapeHTML", actual: `вызовов escapeHTML вне шаблона: ${manualEscapes}`, severity: "high" });
}

// ─── 6. Unescaped text in data ──────────────────────────────────────────────
// Текст данных выводится через html`…` или escapeHTML. Поля table и extra выводятся
// как HTML осознанно (таблицы шпаргалок, блоки наклонений), их не проверяем.
// В остальных полях запрещены "<" (начало тега) и "&" без сущности. Одиночный ">"
// не проверяем: в тексте он безопасен (стрелки вида «->»). Поля title попадают в
// атрибуты (aria-label), поэтому в них запрещены кавычки.
const HTML_DATA_KEYS = new Set(["table", "extra"]);
const ATTRIBUTE_DATA_KEYS = new Set(["title"]);
const staticData = api.staticChecksData;
let checkedStrings = 0;
function visitDataStrings(value, trail, visit) {
  if (typeof value === "string") {
    visit(value, trail);
  } else if (Array.isArray(value)) {
    value.forEach((item) => visitDataStrings(item, trail, visit));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) visitDataStrings(item, [...trail, key], visit);
  }
}
for (const [dataName, data] of Object.entries(staticData)) {
  visitDataStrings(data, [dataName], (text, trail) => {
    checkedStrings++;
    const where = trail.join(".");
    if (!trail.some((key) => HTML_DATA_KEYS.has(key)) && (/</.test(text) || /&(?!(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);)/.test(text))) {
      issues.push({ verb: "static-data", tense: "unescaped-text", person: "-", expected: "в тексте нет «<» и «&» без сущности", actual: `${where}: ${JSON.stringify(text.slice(0, 80))}`, severity: "high" });
    }
    if (trail.some((key) => ATTRIBUTE_DATA_KEYS.has(key)) && text.includes('"')) {
      issues.push({ verb: "static-data", tense: "quote-in-attribute", person: "-", expected: "в значении атрибута нет кавычек", actual: `${where}: ${JSON.stringify(text.slice(0, 80))}`, severity: "high" });
    }
  });
}

// ─── Storage and backup regressions ─────────────────────────────────────────
// Выполняем реальные функции HTML, подменяя только браузерные API ввода-вывода.
const assert = require("node:assert/strict");
const backupCode = fullScriptCode.slice(fullScriptCode.indexOf("const BACKUP_FORMAT ="), fullScriptCode.indexOf('$("#exportProgressButton").addEventListener'));
const storageFactory = new Function("window", "document", "URL", "Blob", "setTimeout", "requestAnimationFrame", "CSS",
  jsCode + "\n" + backupCode + "\nrenderCards = () => {}; renderLearningPlan = () => {}; return { appStorage, state, parseBackup, importProgress, exportProgress, textbookCorrect, resumeCardQuiz, normalizeSavedQuizSession, lessonById, textbookProgressFor, learningLessonStatus, learningModuleForLesson, learningModuleSteps, learningLevelNext, favoriteLessonStatus, startLearningCheck, selectLearningLevel, learningCheckEntry, learningCheckCardMarkup, handlers: DELEGATED_HANDLERS };"
);

function storageFixture(initial = {}, failProbe = false) {
  const data = new Map(Object.entries(initial));
  const controls = { failSet: () => false, failRemove: () => false, reloads: 0, confirms: 0, alerts: [], blob: null, clicks: 0, notice: { hidden: true } };
  const local = {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) {
      if (failProbe && key === "__msg_storage_probe__") throw new Error("QuotaExceededError");
      if (controls.failSet(key, String(value))) throw new Error("QuotaExceededError");
      data.set(key, String(value));
    },
    removeItem(key) {
      if (controls.failRemove(key)) throw new Error("SecurityError");
      data.delete(key);
    },
    key(index) { return [...data.keys()][index] ?? null; },
    get length() { return data.size; }
  };
  const win = {
    localStorage: local,
    confirm() { controls.confirms += 1; return true; },
    alert(message) { controls.alerts.push(message); },
    location: { reload() { controls.reloads += 1; } }
  };
  const doc = {
    querySelector(selector) {
      if (selector === "#storageNotice") return controls.notice;
      if (selector === "#storageExportButton") return { addEventListener() {} };
      throw new Error(`Unexpected selector in storage fixture: ${selector}`);
    },
    createElement() { return { click() { controls.clicks += 1; }, remove() {} }; },
    body: { appendChild() {} }
  };
  const urls = { createObjectURL(blob) { controls.blob = blob; return "blob:test"; }, revokeObjectURL() {} };
  const api = storageFactory(win, doc, urls, Blob, () => {}, () => {}, { escape: String });
  return { api, data, controls };
}

const backupFile = (data, version = 1) => ({ text: async () => JSON.stringify({ format: "spanish-grammar-backup", version, data }) });
const quizQuestion = (verb, answer) => ({ type: "conjugation", verb, tense: "presente", person: 0, question: `${verb} — yo`, answer });
function pausedQuizFixture(cards, cursor, input = "", answered = false) {
  const questions = [quizQuestion("ser", "soy"), quizQuestion("estar", "estoy"), quizQuestion("tener", "tengo")];
  const attempts = questions.slice(0, cursor + Number(answered)).map((question) => ({ question, userAnswer: question.answer, correct: true, status: "correct" }));
  const session = { cardQuiz: questions, cardQuizIndex: cursor, cardQuizInput: input, cardQuizAnswered: answered, cardQuizCorrect: attempts.length, cardQuizTotal: attempts.length, cardQuizAttempts: attempts, cardQuizSnapshot: questions };
  return storageFixture({ "msg:cards": JSON.stringify(cards), "msg:quizSession": JSON.stringify(session) });
}
function checkedLessonFixture(correctCount) {
  const fixture = storageFixture();
  const lesson = fixture.api.lessonById(1);
  const saved = { answers: {}, checked: {}, attempts: {} };
  let position = 0;
  for (const exercise of lesson.exercises) for (const [index, item] of exercise.items.entries()) {
    const key = `${exercise.id}:${index}`;
    const correct = position++ < correctCount;
    saved.answers[key] = correct ? [item.answer].flat()[0] : "incorrect test answer";
    saved.checked[key] = { correct };
  }
  fixture.api.state.textbookProgress.lessons[1] = saved;
  return fixture;
}

function triggerLearningAction(api, type, attribute, target = {}) {
  const entry = api.handlers[type].find(([selector]) => selector.startsWith(".learning-plan ") && selector.includes(`[${attribute}]`));
  assert.ok(entry, `Missing learning-plan handler for ${attribute}`);
  entry[1]({}, target);
}

const STORAGE_CASES = [
  ["paused level check restores identical questions and typed answers after reload", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    const items = structuredClone(api.state.learningCheck.items);
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "borrador sí" });
    triggerLearningAction(api, "click", "data-check-exit");
    const { api: reloaded } = storageFixture(Object.fromEntries(data));
    assert.match(String(reloaded.learningCheckCardMarkup({ id: "a1", label: "A1" })), /Продолжить/);
    triggerLearningAction(reloaded, "click", "data-check-resume");
    assert.deepEqual(reloaded.state.learningCheck.items, items);
    assert.equal(reloaded.state.learningCheck.answers[0], "borrador sí");
    assert.equal(reloaded.state.learningCheck.submitted, false);
  }],
  ["switching levels preserves independent check drafts and choice answers", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    triggerLearningAction(api, "click", "data-check-choice", { dataset: { checkChoice: "0", checkValue: "sí" } });
    api.selectLearningLevel("a2");
    api.startLearningCheck("a2");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "otra respuesta" });
    api.selectLearningLevel("a1");
    const { api: reloaded } = storageFixture(Object.fromEntries(data));
    triggerLearningAction(reloaded, "click", "data-check-resume");
    assert.equal(reloaded.state.learningCheck.answers[0], "sí");
    reloaded.selectLearningLevel("a2");
    triggerLearningAction(reloaded, "click", "data-check-resume");
    assert.equal(reloaded.state.learningCheck.answers[0], "otra respuesta");
  }],
  ["restarting a level check clears only its own answers", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "keep a1" });
    api.selectLearningLevel("a2");
    api.startLearningCheck("a2");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "discard a2" });
    triggerLearningAction(api, "click", "data-check-restart");
    const reloaded = storageFixture(Object.fromEntries(data)).api;
    assert.equal(reloaded.state.learningCheckSessions?.a1.answers[0], "keep a1");
    assert.deepEqual(reloaded.state.learningCheckSessions?.a2.answers, {});
  }],
  ["submitting a check clears its draft while retaining the result", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    assert.equal(data.has("msg:learningCheckSessions"), true);
    api.state.learningCheck.items.forEach((entry, index) => {
      const item = api.learningCheckEntry(entry).item;
      triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: String(index) }, value: [item.answer].flat()[0] });
    });
    triggerLearningAction(api, "click", "data-check-submit");
    const reloaded = storageFixture(Object.fromEntries(data)).api;
    assert.equal(reloaded.state.learningChecks.a1.last, 100);
    assert.equal(reloaded.state.learningCheckSessions?.a1, undefined);
    assert.doesNotMatch(String(reloaded.learningCheckCardMarkup({ id: "a1", label: "A1" })), /data-check-resume/);
  }],
  ["incomplete submission retains the saved draft", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "keep draft" });
    triggerLearningAction(api, "click", "data-check-submit");
    const reloaded = storageFixture(Object.fromEntries(data)).api;
    assert.equal(reloaded.state.learningCheckSessions?.a1.answers[0], "keep draft");
    assert.equal(reloaded.state.learningChecks.a1, undefined);
  }],
  ["malformed saved check references are discarded without remapping answers", () => {
    const sessions = { a1: { level: "a1", items: [{ lessonId: 999, exerciseId: "missing", index: 0 }], answers: { 0: "misassigned" } } };
    const { api, controls } = storageFixture({ "msg:learningCheckSessions": JSON.stringify(sessions) });
    assert.deepEqual(api.state.learningCheckSessions, {});
    assert.doesNotMatch(String(api.learningCheckCardMarkup({ id: "a1", label: "A1" })), /data-check-resume/);
    api.exportProgress();
    return controls.blob.text().then(text => {
      assert.deepEqual(JSON.parse(JSON.parse(text).data["msg:learningCheckSessions"]), {});
      api.parseBackup(text);
      assert.equal(controls.alerts.length, 1);
    });
  }],
  ["saved level check survives backup export and import", async () => {
    const { api, controls } = storageFixture();
    api.startLearningCheck("a1");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "copia sí" });
    const questions = structuredClone(api.state.learningCheck.items);
    api.exportProgress();
    const text = await controls.blob.text();
    const target = storageFixture();
    await target.api.importProgress({ text: async () => text });
    const reloaded = storageFixture(Object.fromEntries(target.data)).api;
    triggerLearningAction(reloaded, "click", "data-check-resume");
    assert.deepEqual(reloaded.state.learningCheck.items, questions);
    assert.equal(reloaded.state.learningCheck.answers[0], "copia sí");
  }],
  ["invalid question in a saved check discards the entire draft without shifting answers", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "1" }, value: "second answer" });
    const sessions = JSON.parse(data.get("msg:learningCheckSessions") || "{}");
    assert.ok(sessions.a1);
    sessions.a1.items[0].index = 999;
    const reloaded = storageFixture({ "msg:learningCheckSessions": JSON.stringify(sessions) }).api;
    assert.deepEqual(reloaded.state.learningCheckSessions, {});
  }],
  ["saved check with changed question content is not resumed", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    const sessions = JSON.parse(data.get("msg:learningCheckSessions") || "{}");
    assert.ok(sessions.a1);
    sessions.a1.items[0].signature = "outdated question";
    const reloaded = storageFixture({ "msg:learningCheckSessions": JSON.stringify(sessions) }).api;
    assert.deepEqual(reloaded.state.learningCheckSessions, {});
  }],
  ["a truncated saved check cannot confirm a level with fewer questions", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    const sessions = JSON.parse(data.get("msg:learningCheckSessions"));
    sessions.a1.items = sessions.a1.items.slice(0, 1);
    const reloaded = storageFixture({ "msg:learningCheckSessions": JSON.stringify(sessions) }).api;
    assert.deepEqual(reloaded.state.learningCheckSessions, {});
  }],
  ["the plan shortcut resumes a saved check instead of replacing its answers", () => {
    const { api, data } = storageFixture();
    api.startLearningCheck("a1");
    const questions = structuredClone(api.state.learningCheck.items);
    triggerLearningAction(api, "input", "data-check-answer", { dataset: { checkAnswer: "0" }, value: "keep shortcut" });
    triggerLearningAction(api, "click", "data-check-exit");
    const reloaded = storageFixture(Object.fromEntries(data)).api;
    triggerLearningAction(reloaded, "click", "data-check-start");
    assert.deepEqual(reloaded.state.learningCheck.items, questions);
    assert.equal(reloaded.state.learningCheck.answers[0], "keep shortcut");
  }],
  ["all wrong completed lesson is reviewable and does not count as mastered", () => {
    const { api } = checkedLessonFixture(0);
    const progress = api.textbookProgressFor(api.lessonById(1));
    assert.equal(progress.completed, true);
    assert.equal(progress.mastered, false);
    assert.equal(progress.needsReview, true);
    assert.equal(api.learningLessonStatus(1), "review");
    assert.equal(api.learningModuleSteps(api.learningModuleForLesson(1)).find(step => step.id === 1).done, false);
    assert.match(api.favoriteLessonStatus(progress), /Нужно повторить/);
    assert.notEqual(api.learningLevelNext("a1").lesson?.id, 1);
  }],
  ["a single wrong answer prevents mastery of a completed lesson", () => {
    const { api } = checkedLessonFixture(34);
    const progress = api.textbookProgressFor(api.lessonById(1));
    assert.equal(progress.total, 35);
    assert.equal(progress.completed, true);
    assert.equal(progress.mastered, false);
    assert.equal(progress.needsReview, true);
  }],
  ["correcting every answer marks the lesson mastered", () => {
    const { api } = checkedLessonFixture(35);
    const progress = api.textbookProgressFor(api.lessonById(1));
    assert.equal(progress.completed, true);
    assert.equal(progress.mastered, true);
    assert.equal(progress.needsReview, false);
    assert.equal(api.learningLessonStatus(1), "mastered");
    assert.equal(api.learningModuleSteps(api.learningModuleForLesson(1)).find(step => step.id === 1).done, true);
    assert.match(api.favoriteLessonStatus(progress), /Освоен/);
  }],
  ["an edited unchecked answer invalidates lesson mastery", () => {
    const { api } = checkedLessonFixture(35);
    delete api.state.textbookProgress.lessons[1].checked["1.1:0"];
    const progress = api.textbookProgressFor(api.lessonById(1));
    assert.equal(progress.completed, false);
    assert.equal(progress.mastered, false);
    assert.equal(api.learningLessonStatus(1), "started");
  }],
  ["resume preserves current question after an earlier favourite is removed", () => {
    const { api, data } = pausedQuizFixture(["estar", "tener"], 1, "estoy");
    api.resumeCardQuiz();
    assert.equal(api.state.cardQuiz[api.state.cardQuizIndex].verb, "estar");
    assert.equal(api.state.cardQuizIndex, 0);
    assert.equal(api.state.cardQuizInput, "estoy");
    assert.equal(api.state.cardQuizTotal, 0);
    assert.equal(api.state.cardQuizCorrect, 0);
    assert.deepEqual(api.state.cardQuizSnapshot.map(question => question.verb), ["estar", "tener"]);
    assert.equal(JSON.parse(data.get("msg:quizSession")).cardQuizIndex, 0);
    api.resumeCardQuiz();
    assert.equal(api.state.cardQuiz[api.state.cardQuizIndex].verb, "estar");
  }],
  ["resume clears an answered current question removed from favourites", () => {
    const { api } = pausedQuizFixture(["ser", "tener"], 1, "estoy", true);
    api.resumeCardQuiz();
    assert.equal(api.state.cardQuiz[api.state.cardQuizIndex].verb, "tener");
    assert.equal(api.state.cardQuizInput, "");
    assert.equal(api.state.cardQuizAnswered, false);
    assert.equal(api.state.cardQuizTotal, 1);
    assert.equal(api.state.cardQuizCorrect, 1);
    assert.deepEqual(api.state.cardQuizAttempts.map(attempt => attempt.question.verb), ["ser"]);
  }],
  ["resume keeps an unchanged answered question and score", () => {
    const { api } = pausedQuizFixture(["ser", "estar", "tener"], 1, "estoy", true);
    api.resumeCardQuiz();
    assert.equal(api.state.cardQuizIndex, 1);
    assert.equal(api.state.cardQuizInput, "estoy");
    assert.equal(api.state.cardQuizAnswered, true);
    assert.equal(api.state.cardQuizCorrect, 2);
  }],
  ["completed quiz stays completed when earlier questions are removed", () => {
    const { api } = pausedQuizFixture(["estar", "tener"], 3);
    api.resumeCardQuiz();
    assert.equal(api.state.cardQuizIndex, api.state.cardQuiz.length);
    assert.equal(api.state.cardQuizTotal, 2);
    assert.equal(api.state.cardQuizCorrect, 2);
  }],
  ["resume clears a session with no remaining favourites", () => {
    const { api, data } = pausedQuizFixture([], 1, "estoy");
    api.resumeCardQuiz();
    assert.equal(api.state.savedQuizSession, null);
    assert.equal(api.state.cardQuiz.length, 0);
    assert.equal(data.has("msg:quizSession"), false);
  }],
  ["invalid saved questions before the cursor do not shift the draft", () => {
    const { api } = storageFixture();
    const session = api.normalizeSavedQuizSession({ cardQuiz: [null, quizQuestion("estar", "estoy"), quizQuestion("tener", "tengo")], cardQuizIndex: 1, cardQuizInput: "estoy", cardQuizAnswered: false });
    assert.equal(session.cardQuizIndex, 0);
    assert.equal(session.cardQuizInput, "estoy");
    assert.equal(session.cardQuiz[session.cardQuizIndex].verb, "estar");
  }],
  ["recovered progress export can be imported without losing other data", async () => {
    const { api, data, controls } = storageFixture({ "msg:textbookProgress": '{"version":2,"lessons":null}', "msg:cards": '["ser"]', "msg:custom": "keep" });
    api.exportProgress();
    const text = await controls.blob.text();
    const backup = JSON.parse(text);
    assert.deepEqual(JSON.parse(backup.data["msg:textbookProgress"]), { version: 2, lessons: {} });
    assert.equal(data.get("msg:textbookProgress"), '{"version":2,"lessons":null}');
    assert.equal(controls.alerts.length, 1);
    api.parseBackup(text);
    const target = storageFixture();
    await target.api.importProgress({ text: async () => text });
    assert.equal(target.controls.reloads, 1);
    const reloaded = storageFixture(Object.fromEntries(target.data));
    assert.deepEqual(reloaded.api.state.cards, ["ser"]);
    assert.equal(reloaded.api.appStorage.get("msg:custom"), "keep");
  }],
  ["export retains valid lessons beside damaged lesson entries", async () => {
    const { api, controls } = storageFixture({ "msg:textbookProgress": '{"version":1,"lessons":{"1":{"answers":{"a:0":"sí"}},"2":null,"3":[]}}' });
    api.exportProgress();
    const backup = JSON.parse(await controls.blob.text());
    const progress = JSON.parse(backup.data["msg:textbookProgress"]);
    assert.deepEqual(Object.keys(progress.lessons), ["1"]);
    assert.equal(progress.lessons["1"].answers["a:0"], "sí");
    api.parseBackup(JSON.stringify(backup));
  }],
  ["export repairs invalid JSON in known data and preserves unknown keys", async () => {
    const { api, controls } = storageFixture({ "msg:cards": "{broken", "msg:custom": "{keep untouched" });
    api.exportProgress();
    const backup = JSON.parse(await controls.blob.text());
    assert.deepEqual(JSON.parse(backup.data["msg:cards"]), []);
    assert.equal(backup.data["msg:custom"], "{keep untouched");
    api.parseBackup(JSON.stringify(backup));
    assert.equal(controls.alerts.length, 1);
  }],
  ["empty exported progress is an importable backup", async () => {
    const { api, controls } = storageFixture();
    api.exportProgress();
    api.parseBackup(await controls.blob.text());
  }],
  ["export round-trip preserves legacy favourites recovered from unreadable cards", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": "{broken", "msg:favorites": '["ser"]' });
    assert.deepEqual(api.state.cards, ["ser"]);
    api.exportProgress();
    const text = await controls.blob.text();
    const target = storageFixture();
    await target.api.importProgress({ text: async () => text });
    assert.equal(target.controls.reloads, 1);
    const reloaded = storageFixture(Object.fromEntries(target.data));
    assert.deepEqual(reloaded.api.state.cards, ["ser"]);
    assert.equal(data.get("msg:cards"), "{broken");
    assert.equal(controls.alerts.length, 1);
  }],
  ["export uses fresh textbook progress from another tab", async () => {
    const { api, data, controls } = storageFixture({ "msg:textbookProgress": '{"version":2,"lessons":{}}' });
    data.set("msg:textbookProgress", '{"version":2,"lessons":{"1":{"answers":{"a:0":"sí"},"checked":{},"attempts":{}}}}');
    api.exportProgress();
    const progress = JSON.parse(JSON.parse(await controls.blob.text()).data["msg:textbookProgress"]);
    assert.equal(progress.lessons["1"].answers["a:0"], "sí");
    assert.equal(controls.alerts.length, 0);
  }],
  ["equivalent valid data with reordered keys produces no recovery warning", async () => {
    const { api, controls } = storageFixture({ "msg:cardStats": '{"ser":{"correct":1,"attempts":1,"mistakes":0,"streak":1,"lastReviewed":null}}' });
    api.exportProgress();
    api.parseBackup(await controls.blob.text());
    assert.equal(controls.alerts.length, 0);
  }],
  ["healthy export includes saves from another tab", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]' });
    data.set("msg:cards", '["ser","estar"]');
    api.exportProgress();
    assert.equal(JSON.parse(await controls.blob.text()).data["msg:cards"], '["ser","estar"]');
  }],
  ["healthy export excludes keys deleted by another tab", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]' });
    data.delete("msg:cards");
    assert.equal(api.appStorage.get("msg:cards"), null);
    api.exportProgress();
    assert.equal(Object.hasOwn(JSON.parse(await controls.blob.text()).data, "msg:cards"), false);
  }],
  ["startup write failure preserves readable saved progress", async () => {
    const { api, controls } = storageFixture({ "msg:cards": '["ser"]' }, true);
    assert.deepEqual(api.state.cards, ["ser"]);
    assert.equal(api.appStorage.persistent, false);
    assert.equal(controls.notice.hidden, false);
    api.exportProgress();
    assert.equal(JSON.parse(await controls.blob.text()).data["msg:cards"], '["ser"]');
  }],
  ["null lessons does not prevent startup", () => {
    const { api } = storageFixture({ "msg:textbookProgress": '{"version":2,"lessons":null}' });
    assert.deepEqual(api.state.textbookProgress, { version: 2, lessons: {} });
  }],
  ["valid lessons survive malformed neighbouring entries", () => {
    const { api } = storageFixture({ "msg:textbookProgress": '{"version":2,"lessons":{"1":{"answers":{"a:0":"sí"}},"2":null,"3":[]}}' });
    assert.deepEqual(Object.keys(api.state.textbookProgress.lessons), ["1"]);
    assert.equal(api.state.textbookProgress.lessons["1"].answers["a:0"], "sí");
  }],
  ["failed save exports the latest session value", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]' });
    controls.failSet = () => true;
    api.appStorage.set("msg:cards", '["ser","estar"]');
    assert.equal(api.appStorage.get("msg:cards"), '["ser","estar"]');
    assert.equal(api.appStorage.persistent, false);
    assert.equal(controls.notice.hidden, false);
    assert.equal(data.get("msg:cards"), '["ser"]');
    api.exportProgress();
    assert.equal(controls.clicks, 1);
    assert.equal(JSON.parse(await controls.blob.text()).data["msg:cards"], '["ser","estar"]');
  }],
  ["failed deletion does not resurrect a stale key", () => {
    const { api, controls } = storageFixture();
    api.appStorage.set("msg:quizSession", '{"questions":[]}');
    controls.failRemove = () => true;
    api.appStorage.remove("msg:quizSession");
    assert.equal(api.appStorage.get("msg:quizSession"), null);
    assert.equal(api.appStorage.keys("msg:").includes("msg:quizSession"), false);
    assert.equal(api.appStorage.persistent, false);
  }],
  ["unsupported backup version leaves existing data intact", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]' });
    await api.importProgress(backupFile({ "msg:cards": '["estar"]' }, 999));
    assert.equal(data.get("msg:cards"), '["ser"]');
    assert.equal(controls.confirms, 0);
    assert.equal(controls.reloads, 0);
    assert.equal(controls.alerts.length, 1);
  }],
  ["mixed malformed backup entries are rejected before replacement", () => {
    const { api } = storageFixture();
    assert.throws(() => api.parseBackup(JSON.stringify({ format: "spanish-grammar-backup", version: 1, data: { "msg:cards": '["ser"]', "msg:theme": 42 } })));
  }],
  ["malformed progress JSON is rejected before replacement", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]' });
    await api.importProgress(backupFile({ "msg:textbookProgress": "{broken" }));
    assert.equal(data.get("msg:cards"), '["ser"]');
    assert.equal(controls.confirms, 0);
    assert.equal(controls.reloads, 0);
  }],
  ["failed first import write preserves original data without reload", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]', "msg:theme": "dark", other: "untouched" });
    controls.failSet = () => true;
    await api.importProgress(backupFile({ "msg:cards": '["estar"]' }));
    assert.equal(data.get("msg:cards"), '["ser"]');
    assert.equal(data.get("msg:theme"), "dark");
    assert.equal(data.has("msg:newKey"), false);
    assert.equal(data.get("other"), "untouched");
    assert.equal(api.appStorage.get("msg:cards"), '["ser"]');
    assert.equal(controls.reloads, 0);
    assert.equal(controls.alerts.length, 1);
  }],
  ["partial import write is rolled back", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]', "msg:theme": "dark" });
    controls.failSet = (key, value) => key === "msg:theme" && value === "light";
    await api.importProgress(backupFile({ "msg:cards": '["estar"]', "msg:newKey": "new", "msg:theme": "light" }));
    assert.equal(data.get("msg:cards"), '["ser"]');
    assert.equal(data.get("msg:theme"), "dark");
    assert.equal(controls.reloads, 0);
  }],
  ["failed deletion during import is rolled back", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]', "msg:theme": "dark" });
    controls.failRemove = key => key === "msg:theme";
    await api.importProgress(backupFile({ "msg:cards": '["estar"]' }));
    assert.equal(data.get("msg:cards"), '["ser"]');
    assert.equal(data.get("msg:theme"), "dark");
    assert.equal(controls.reloads, 0);
  }],
  ["failed rollback keeps previous session exportable", async () => {
    const { api, controls } = storageFixture({ "msg:cards": '["ser"]', "msg:theme": "dark" });
    let writes = 0;
    controls.failSet = () => ++writes > 2;
    controls.failRemove = key => key === "msg:newKey";
    await api.importProgress(backupFile({ "msg:cards": '["estar"]', "msg:newKey": "new", "msg:theme": "light" }));
    assert.equal(api.appStorage.get("msg:cards"), '["ser"]');
    assert.equal(api.appStorage.persistent, false);
    assert.equal(controls.reloads, 0);
    api.exportProgress();
    const backup = JSON.parse(await controls.blob.text());
    assert.equal(backup.data["msg:cards"], '["ser"]');
    assert.equal(backup.data["msg:theme"], "dark");
    assert.equal(Object.hasOwn(backup.data, "msg:newKey"), false);
  }],
  ["successful import replaces managed data and preserves unrelated keys", async () => {
    const { api, data, controls } = storageFixture({ "msg:cards": '["ser"]', "msg:theme": "dark", other: "untouched" });
    await api.importProgress(backupFile({ "msg:cards": '["estar"]' }));
    assert.equal(data.get("msg:cards"), '["estar"]');
    assert.equal(data.has("msg:theme"), false);
    assert.equal(data.get("other"), "untouched");
    assert.equal(controls.reloads, 1);
    assert.equal(controls.alerts.length, 0);
  }],
  ["Unicode normalization still requires accents and ñ", () => {
    const { api } = storageFixture();
    assert.equal(api.textbookCorrect("si\u0301", "sí"), true);
    assert.equal(api.textbookCorrect("man\u0303ana", "mañana"), true);
    assert.equal(api.textbookCorrect("si", "sí"), false);
    assert.equal(api.textbookCorrect("manana", "mañana"), false);
  }]
];

async function report() {
  for (const [label, run] of STORAGE_CASES) {
    try { await run(); }
    catch (error) {
      issues.push({ verb: "storage-backup", tense: label, person: "-", expected: "case passes", actual: error.message, severity: "high" });
    }
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
  console.log(`Quiz cases checked: ${QUIZ_CASES.length}`);
  console.log(`Storage and backup cases checked: ${STORAGE_CASES.length}`);
  console.log(`Tense examples checked: ${tenseExampleCount}`);
  console.log(`Textbook answer words checked for tildes: ${textbookAnswerWords}`);
  console.log(`Derived verbs checked against their base: ${derivedChecked}`);
  console.log(`Verbs checked against the DLE reference: ${dleChecked}`);
  console.log(`Static ids checked: ${checkedIds}`);
  console.log(`Static data attributes checked: ${markupAttrs.size}`);
  console.log(`Static functions checked: ${topFunctions.length}`);
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
}

report().catch((error) => {
  console.error(error);
  process.exit(1);
});
