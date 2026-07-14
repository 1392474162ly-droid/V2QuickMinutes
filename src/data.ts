// Slide reference deck and multi-language dialogue data for QuickMinutes App

export interface Slide {
  id: number;
  pageNum: number;
  title: string;
  summary: string;
  bullets: string[];
  imageSrc?: string;
  pdfUrl?: string;
}

export interface ReferenceDeck {
  id: string;
  name: string;
  type: string;
  slides: Slide[];
  isPDF?: boolean;
}

export interface TranscriptItem {
  id: number;
  speaker: string;
  lang: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
}

export const REFERENCE_DECKS: ReferenceDeck[] = [
  {
    id: "roadmap",
    name: "Q3 Strategy & Launch Deck",
    type: "Presentation Slide Deck",
    slides: [
      {
        id: 1,
        pageNum: 1,
        title: "Q3 Strategic Executive Roadmap Sync",
        summary: "Executive overview of release cadence and core business goals for the upcoming quarter.",
        bullets: ["Launch timing alignment across mobile & web", "Resource allocations and critical milestones", "Budget summary and ROI expectations"]
      },
      {
        id: 2,
        pageNum: 2,
        title: "Market Expansion & User Acquisition",
        summary: "Focusing on APAC and EMEA launch targets with local advertising campaigns.",
        bullets: ["Localized marketing material rolling out in July", "User acquisition target: +150,000 active members", "Direct client outreach via ClientCo channels"]
      },
      {
        id: 3,
        pageNum: 3,
        title: "Core Feature Pillar Overviews",
        summary: "Primary engineering priorities for the Q3 release candidates.",
        bullets: ["Live offline synchronizations", "Multi-language translations & transcript logging", "Visual boardroom space planning tool"]
      },
      {
        id: 4,
        pageNum: 4,
        title: "Product Release Risk Assessment",
        summary: "Engineering backlog constraints and mitigation strategies for compressed timelines.",
        bullets: ["QA test automation coverage at 82%", "Critical buffer week proposed between build and release", "Staging environment dry-run tests"]
      },
      {
        id: 5,
        pageNum: 5,
        title: "Launch Sequence & Rollout Timeline",
        summary: "Granular scheduling for database migration and CDN switchovers.",
        bullets: ["July 15: Pre-release freeze", "July 18-20: Database replication validation", "July 25: Official global mobile app launch"]
      }
    ]
  },
  {
    id: "tech-design",
    name: "System Architecture Specification",
    type: "Technical Diagram Brief",
    slides: [
      {
        id: 11,
        pageNum: 1,
        title: "Serverless Web Architecture Layout",
        summary: "Overall flow of client requests, Nginx load balancer, and containerized runtimes.",
        bullets: ["Nginx reverse proxy routing exclusively to Port 3000", "State persisted on secure Cloud DBs", "Vite client assets bundled statically for CDNs"]
      },
      {
        id: 12,
        pageNum: 2,
        title: "Live Translation Pipeline & Web Speech",
        summary: "Flow diagram for audio chunk recording and translation server routing.",
        bullets: ["Microphone audio parsed via Web Speech API locally", "Pasted text routed to secure server-side proxy route", "Gemini 3.5-Flash processing translation outputs instantly"]
      },
      {
        id: 13,
        pageNum: 3,
        title: "Boardroom Grid Layout Algorithms",
        summary: "Details of grid coordinate calculations for the seat planner.",
        bullets: ["Seats placed with viewport percentage coordinate pairs (X, Y)", "Standard matrix offsets for Seats X * Rows Y layout options", "Dynamic coordinate saving with standard mouse events"]
      }
    ]
  },
  {
    id: "client-proposal",
    name: "Client Contract & Project Scope",
    type: "Business Scope Document",
    slides: [
      {
        id: 21,
        pageNum: 1,
        title: "ClientCo Partnership Deliverables",
        summary: "Formal agreement overview regarding core app design deliverables.",
        bullets: ["Custom workspace design and branding guidelines", "Multi-user whiteboard space templates", "Live minutes formatting exports"]
      },
      {
        id: 22,
        pageNum: 2,
        title: "Budget Milestones & Payment Terms",
        summary: "Financial roadmap and structured sign-off targets.",
        bullets: ["Phase 1: Wireframes sign-off - 30% payout", "Phase 2: Working sandbox prototype - 40% payout", "Phase 3: Production handoff - 30% payout"]
      }
    ]
  }
];

export const LANGUAGE_CODES = [
  { code: "en-US", name: "English", display: "English" },
  { code: "zh-CN", name: "Mandarin", display: "Mandarin (普通话)" }
];

export const SIMULATED_DIALOGUES: Record<string, { speaker: string, original: string, translation: string }[]> = {
  "en-US": [
    { speaker: "Priya", original: "Welcome everyone, let's establish the key objectives for our roadmap session.", translation: "Welcome everyone, let's establish the key objectives for our roadmap session." },
    { speaker: "Marcus", original: "I have reviewed the resource schedule, and we are slightly short-handed on the QA team.", translation: "I have reviewed the resource schedule, and we are slightly short-handed on the QA team." },
    { speaker: "Dana", original: "We must ensure client-facing delivery dates remain reliable, even with buffers.", translation: "We must ensure client-facing delivery dates remain reliable, even with buffers." },
    { speaker: "Priya", original: "Agreed. Let's plan a one-week buffer space for stability.", translation: "Agreed. Let's plan a one-week buffer space for stability." }
  ],
  "zh-CN": [
    { speaker: "Priya", original: "各位好，今天我们主要讨论第三季度的项目里程碑和人员安排。", translation: "Hello everyone, today we will mainly discuss the Q3 project milestones and staffing allocations." },
    { speaker: "Marcus", original: "测试团队目前表示，如果按原计划在七月十八号上线，时间会非常紧张。", translation: "The testing team states that if we launch on July 18 as originally planned, the schedule will be extremely tight." },
    { speaker: "Dana", original: "客户方面非常看重按时交付，但稳定性和产品质量是第一位的。", translation: "The client values timely delivery very highly, but stability and product quality are the top priorities." },
    { speaker: "Priya", original: "既然如此，我们决定把移动端的正式发布日期推迟到七月二十五号。", translation: "Under these circumstances, we have decided to postpone the official mobile launch date to July 25." }
  ],
  "fr-FR": [
    { speaker: "Priya", original: "Bonjour à tous, commençons par passer en revue l'ordre du jour de la réunion.", translation: "Hello everyone, let's start by reviewing the meeting agenda." },
    { speaker: "Marcus", original: "L'équipe d'assurance qualité a besoin de plus de temps pour valider les correctifs.", translation: "The QA team needs more time to validate the bug fixes." },
    { speaker: "Dana", original: "Les clients apprécieront la transparence si nous annonçons un léger décalage.", translation: "Clients will appreciate transparency if we announce a slight delay." },
    { speaker: "Priya", original: "C'est convenu, nous allons sécuriser le calendrier avec une semaine supplémentaire.", translation: "Agreed, we will secure the schedule with an additional week." }
  ],
  "es-ES": [
    { speaker: "Priya", original: "Bienvenidos todos. Comencemos con la revisión de las fechas de lanzamiento.", translation: "Welcome everyone. Let's start with the review of the launch dates." },
    { speaker: "Marcus", original: "El equipo de control de calidad reporta que el período de prueba actual es demasiado corto.", translation: "The QA team reports that the current testing window is too short." },
    { speaker: "Dana", original: "Es mejor entregar tarde pero sin errores críticos en el sistema.", translation: "It's better to deliver late but without critical system errors." },
    { speaker: "Priya", original: "Decisión tomada: moveremos el lanzamiento al veinticinco de julio.", translation: "Decision made: we will move the launch to July 25." }
  ],
  "id-ID": [
    { speaker: "Priya", original: "Halo semuanya, mari kita bahas target peluncuran aplikasi mobile minggu ini.", translation: "Hello everyone, let's discuss our mobile application launch targets this week." },
    { speaker: "Marcus", original: "Tim penguji merasa bahwa jadwal yang ada sekarang terlalu berisiko.", translation: "The testing team feels that the current schedule is too risky." },
    { speaker: "Dana", original: "Kami akan berkoordinasi dengan klien tentang perubahan tanggal ini agar mereka siap.", translation: "We will coordinate with the client about this date change so they are prepared." },
    { speaker: "Priya", original: "Bagus, kita sepakati untuk memundurkan peluncuran demi kualitas terbaik.", translation: "Good, we agree to postpone the launch for the sake of the best quality." }
  ],
  "ta-IN": [
    { speaker: "Priya", original: "அனைவருக்கும் வணக்கம், இந்த காலாண்டின் முக்கிய குறிக்கோள்களை முடிவு செய்வோம்.", translation: "Hello everyone, let's decide the core goals for this quarter." },
    { speaker: "Marcus", original: "சோதனை குழுவினர் காலக்கெடு மிகவும் குறைவாக இருப்பதாக கவலைப்படுகிறார்கள்.", translation: "The testing team is worried that the deadline is too short." },
    { speaker: "Dana", original: "வாடிக்கையாளர் திருப்திக்கு தரமான வெளியீடு மிகவும் அவசியமானது.", translation: "A quality release is highly necessary for customer satisfaction." },
    { speaker: "Priya", original: "எனவே வெளியீட்டு தேதியை ஜூலை இருபத்தைந்துக்கு ஒத்திவைக்க முடிவு செய்கிறோம்.", translation: "Therefore, we decide to postpone the release date to July 25." }
  ],
  "ms-MY": [
    { speaker: "Priya", original: "Selamat pagi semua, mari kita semak rancangan pelancaran aplikasi kita.", translation: "Good morning everyone, let's review our application launch plan." },
    { speaker: "Marcus", original: "Pasukan jaminan kualiti memerlukan sekurang-kurangnya lima hari lagi.", translation: "The quality assurance team needs at least five more days." },
    { speaker: "Dana", original: "Saya setuju, ia akan mengurangkan risiko ralat sistem semasa pelancaran.", translation: "I agree, it will reduce the risk of system errors during launch." },
    { speaker: "Priya", original: "Tarikh akhir baharu akan dikemas kini dalam dokumen pelan induk.", translation: "The new deadline will be updated in the master plan document." }
  ],
  "zh-HK": [
    { speaker: "Priya", original: "大家早晨，今日想同大家傾下新版本嘅測試安排同上線時間表。", translation: "Good morning everyone, today I want to talk to you about the testing arrangements and launch schedule for the new version." },
    { speaker: "Marcus", original: "QA那邊反映，如果夾硬喺十八號推，好多重要功能都未驗證好。", translation: "QA reported that if we force the launch on the 18th, many important features won't be fully validated yet." },
    { speaker: "Dana", original: "客觀黎講，遲一個星期發佈，換取系統穩定，絕對係明智之舉。", translation: "Objectively speaking, delaying launch by one week to secure system stability is definitely a wise move." },
    { speaker: "Priya", original: "決定咗喇：我哋將上線日期延遲到七月二十五號，等大家有足夠時間準備。", translation: "It's decided: we will delay the launch date to July 25 to give everyone enough time to prepare." }
  ]
};
