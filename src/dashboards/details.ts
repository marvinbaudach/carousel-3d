// Detail-view background per card id (mobile info sheet, gallery lightbox):
// a short German `kontext` for every card, plus pro/kontra/hinweise for the
// study-backed ones. Kept out of the card definitions (like TAGS_BY_ID) so
// the POOL stays lean; translated via t() at render time. Content rule:
// nothing beyond what the cited sources actually report — the kontra and
// hinweise lists carry the sources' own limits, not our speculation.

import type { CardDetail } from './types';

export const DETAILS_BY_ID: Record<string, CardDetail> = {
  'metr-horizon': {
    kontext:
      'Wie lange kann ein KI-Agent ohne menschliches Eingreifen arbeiten? METRs Zeithorizont ist die derzeit beste Einzelmetrik für autonome KI-Leistung — von 3 Sekunden (GPT-2, 2019) auf ~12 Stunden (Opus 4.6, 2026).',
    pro: [
      'Verdopplung alle ~129 Tage seit 2023 — über sieben Jahre und 26 Modelle hinweg stabil exponentiell.',
      'Gemessen an echten Software- und Recherche-Aufgaben mit definiertem Erfolg, nicht an Multiple-Choice-Fragen.',
      'Der beste gemessene Agent schafft Aufgaben, für die Menschen einen halben Arbeitstag brauchen.',
    ],
    kontra: [
      'Nur Software-/Recherche-Aufgaben — über physische Arbeit oder offene Kreativität sagt die Kurve nichts.',
      '50 % Erfolgsquote heißt: Die Hälfte der Läufe scheitert. Bei 80 %-Schwelle schrumpft der Horizont auf ~70 Minuten.',
      'Die Konfidenzintervalle reißen oben stark auf (Opus 4.6: 5¼–60 Std) — die Spitze ist unscharf gemessen.',
    ],
    hinweise: [
      'METR selbst: Messungen über 16 Std sind mit der aktuellen Task-Suite „unzuverlässig" — der Benchmark ist nahe der Sättigung, längere Aufgaben werden ergänzt.',
      'Der Trend-Fit schließt Werte über 16 Std aus; die Mythos-Preview (~17 Std, 04/2026) ist deshalb nicht eingezeichnet.',
    ],
  },
  'ai-dev-rct': {
    kontext:
      'Die bislang einzige randomisierte Studie zur KI-Produktivität erfahrener Entwickler — mit dem berühmten Befund: Die Devs fühlten sich schneller, waren aber messbar langsamer.',
    pro: [
      'Echtes RCT-Design mit realen Issues in den eigenen Repos — methodisch stärker als jede Umfrage oder Benchmark-Hochrechnung.',
      'Der Wahrnehmungsfehler ist robust: Selbst nach der Studie schätzten sich die Devs noch +20 % schneller.',
      'Das Follow-up Ende 2025 deutet mit neueren Tools in Richtung Besserung (+18 % Alt-Kohorte) — Richtung positiv, Belastbarkeit gering.',
    ],
    kontra: [
      '16 Entwickler (2025) sind eine kleine Stichprobe hochspezialisierter Maintainer in reifen Repos — nicht auf alle Entwickler übertragbar.',
      'Beide Follow-up-Konfidenzintervalle kreuzen die Null: Ein echter Beschleunigungseffekt ist nicht belegt.',
      'Gemessen wurden Anfang-2025-Tools (Cursor mit Claude 3.5/3.7) — über heutige Agenten sagt die -19 % wenig.',
    ],
    hinweise: [
      'METR stuft das Follow-up wegen Selektionseffekten als „nur sehr schwache Evidenz" ein (Devs lehnten KI-freie Slots ab, 30–50 % wählten ihre Aufgaben selbst) und baut das Studiendesign deshalb um.',
    ],
  },
  'ai-one-factor': {
    kontext:
      'Epoch AI hat die Ranglisten von 17 Frontier-Benchmarks korreliert: Fähigkeiten steigen im Gleichschritt — wer Mathe kann, kann meist auch Coding und Reasoning. Coding ist nur der Anfang; andere Domänen ziehen nach.',
    pro: [
      'Median-Rangkorrelation 0,73 über alle Benchmark-Paare — ein gemeinsamer Fähigkeitsfaktor, keine isolierten Party-Tricks.',
      'Auch domänenübergreifend noch 0,68: Fortschritt in einer Domäne kündigt Fortschritt in den anderen an.',
    ],
    kontra: [
      'Korrelation erklärt keinen Mechanismus: Gemeinsame Trainingsdaten und -methoden können den Gleichlauf erzeugen.',
      'Die 0,90 zum Fähigkeits-Index ECI ist konstruktionsbedingt hoch — der Index wird aus eben diesen Benchmarks gebaut.',
      'Erfasst ist nur, was ein Benchmark misst: interaktives Lernen und physische Arbeit bleiben außen vor.',
    ],
    hinweise: [
      'Epoch weist aus, dass die drei Kennzahlen aus unterschiedlich gefilterten Benchmark-Subsets stammen (17 bzw. 15 Benchmarks mit ≥5 gemeinsamen Modellen).',
    ],
  },
  kurzweil: {
    kontext:
      'Ray Kurzweil sagt seit 1999 AGI für 2029 und die Singularität für 2045 voraus. Seine Bilanz ist gemischt — und hängt stark davon ab, wer nachzählt.',
    pro: [
      'Die Richtungstreffer sind real: Schach-KI, allgegenwärtige tragbare Computer und maschinelle Übersetzung kamen — teils aufs Jahr genau.',
      'Sein Kernargument, exponentiell wachsende Rechenleistung, hat bisher gehalten; METRs 129-Tage-Verdopplung passt in dieses Muster.',
    ],
    kontra: [
      'Unabhängige Bewerter kommen statt seiner 86 % nur auf ~42 % Trefferquote (Prognosen für 2009) bzw. ~24 % (für 2019).',
      'Termintreue ist die Schwäche: Vieles kommt, aber Jahre später als angesagt — Echtzeit-Übersetzung +5 Jahre, Selbstfahrer +11 Jahre.',
      'Das Ziel „Longevity Escape Velocity" rutschte 2024–2026 still von 2029 auf ~2032.',
    ],
    hinweise: [
      'Die 86 % stammen aus Kurzweils eigener Auswertung (2010), die „im Kern richtig" großzügig als Treffer zählt; die unabhängigen LessWrong-Panels bewerteten den Wortlaut.',
    ],
  },
};
