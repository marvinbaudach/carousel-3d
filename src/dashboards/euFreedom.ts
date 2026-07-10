// EU freedom-restriction dossier: legislative chronologies that the numeric
// deck can't carry (a proposal stalling for years is a timeline, not a series).
// These complement — not duplicate — the existing FREIHEIT cards (cash-limits,
// digital-id, cbdc, surveillance …); they cover the gaps the deck was missing:
// the Chat-Control regulation, the EU asset register, data retention and the
// Digital Services Act. Facts (dates, regulation numbers, court cases) are
// sourced to primary EU documents; the framing is pointed, the data is not.
//
// Dates use a locale-neutral MM·YYYY / YYYY form so they need no translation.

import { statusTimeline } from './charts';
import type { Dashboard } from './types';

export const EU_FREEDOM_CARDS: Dashboard[] = [
  {
    id: 'chatkontrolle',
    title: 'Chatkontrolle · CSA-Verordnung',
    source:
      'EU-Kommission COM(2022) 209 · Verfahren 2022/0155(COD) · EU-Rat / EU-Parlament; Stand Ende 2025. Aufdeckungsanordnungen würden Anbieter zum Scannen privater Nachrichten (auch verschlüsselter) verpflichten.',
    draw: (f) =>
      statusTimeline(f, {
        label: 'Chatkontrolle · Nachrichtenscan',
        status: { text: 'Vorerst gestoppt', kind: 'blocked' },
        milestones: [
          { date: '05·2022', text: 'Kommission schlägt Aufdeckungsanordnungen vor', kind: 'proposed' },
          { date: '11·2023', text: 'EU-Parlament schützt Verschlüsselung', kind: 'blocked' },
          { date: '06·2024', text: 'Rat zieht Abstimmung kurzfristig zurück', kind: 'blocked' },
          { date: '12·2024', text: 'Ungarns Ratsvorsitz scheitert erneut', kind: 'blocked' },
          { date: '10·2025', text: 'Sperrminorität kippt die Scan-Pflicht', kind: 'blocked' },
          { date: '10·2025', text: 'Dänemark macht das Scannen „freiwillig"', kind: 'proposed' },
        ],
        source: 'EU-Kommission · EU-Rat · Verfahren 2022/0155(COD)',
      }),
  },
  {
    id: 'asset-register',
    title: 'EU-Vermögensregister',
    source:
      'EU-Kommission (GD FISMA, Machbarkeitsstudie 2021) · Geldwäsche-Paket VO (EU) 2024/1624 · Geldwäschebehörde AMLA VO (EU) 2024/1620 (Sitz Frankfurt). Ein zentrales Register würde Eigentum an Immobilien, Firmen, Krypto und Gold verknüpfen.',
    draw: (f) =>
      statusTimeline(f, {
        label: 'Vermögensregister · EU',
        status: { text: 'In Vorbereitung', kind: 'proposed' },
        milestones: [
          { date: '2021', text: 'Kommission gibt Machbarkeitsstudie in Auftrag', kind: 'proposed' },
          { date: '2022', text: 'Studie: zentrales Register für alle Vermögen', kind: 'proposed' },
          { date: '05·2024', text: 'Geldwäsche-Paket beschlossen (VO 2024/1624)', kind: 'adopted' },
          { date: '2024', text: 'Geldwäschebehörde AMLA in Frankfurt gegründet', kind: 'adopted' },
          { date: '2025', text: 'AMLA nimmt Arbeit auf', kind: 'inforce' },
          { date: '2027', text: 'Behördenzugriff auf verknüpfte Daten geplant', kind: 'proposed' },
        ],
        source: 'EU-Kommission · VO (EU) 2024/1624 · AMLA VO (EU) 2024/1620',
      }),
  },
  {
    id: 'data-retention',
    title: 'Vorratsdatenspeicherung',
    source:
      'RL 2006/24/EG · EuGH-Urteile C-293/12 (Digital Rights Ireland), C-203/15 (Tele2), C-511/18 (La Quadrature du Net) · EU-Hochrangige Gruppe „Zugang zu Daten für die Strafverfolgung" 2024.',
    draw: (f) =>
      statusTimeline(f, {
        label: 'Vorratsdaten · 20 Jahre Streit',
        status: { text: 'Neuauflage geplant', kind: 'proposed' },
        milestones: [
          { date: '2006', text: 'EU-Richtlinie zur Vorratsdatenspeicherung', kind: 'inforce' },
          { date: '2014', text: 'EuGH kippt die Richtlinie', kind: 'court' },
          { date: '2016', text: 'EuGH: anlasslose Speicherung unzulässig', kind: 'court' },
          { date: '2020', text: 'EuGH bekräftigt das Verbot', kind: 'court' },
          { date: '2024', text: 'EU-Expertengruppe empfiehlt Wiedereinführung', kind: 'proposed' },
        ],
        source: 'RL 2006/24/EG · EuGH · EU-Gruppe „Zugang zu Daten" 2024',
      }),
  },
  {
    id: 'dsa',
    title: 'Digital Services Act',
    source:
      'VO (EU) 2022/2065 (Digital Services Act) · EU-Kommission, förmliche Verfahren gegen X, TikTok, Meta und AliExpress wegen Moderations- und Transparenzpflichten.',
    draw: (f) =>
      statusTimeline(f, {
        label: 'DSA · Plattform-Aufsicht',
        status: { text: 'In Kraft', kind: 'inforce' },
        milestones: [
          { date: '11·2022', text: 'DSA tritt in Kraft (VO 2022/2065)', kind: 'inforce' },
          { date: '04·2023', text: 'Kommission benennt sehr große Plattformen', kind: 'adopted' },
          { date: '12·2023', text: 'Erstes Verfahren — gegen X', kind: 'inforce' },
          { date: '02·2024', text: 'DSA gilt vollständig · Verfahren gegen TikTok', kind: 'inforce' },
          { date: '2024', text: 'Weitere Verfahren: Meta, AliExpress', kind: 'inforce' },
        ],
        source: 'VO (EU) 2022/2065 · EU-Kommission, förmliche Verfahren',
      }),
  },
];
