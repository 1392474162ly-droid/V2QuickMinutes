import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  CheckSquare,
  AlertCircle,
  Undo2,
  Trash2,
  Bold,
  Italic,
  FolderOpen,
  Mic,
  MicOff,
  Copy,
  Check,
  Play,
  Square,
  Plus,
  Edit2,
  UserPlus,
  FileText,
  Sliders,
  Calendar,
  Clock,
  Layout,
  Eraser,
  HelpCircle,
  FileSpreadsheet,
  Grid,
  Maximize2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Upload,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Pencil,
  Tag,
  Sparkles,
  Wand2
} from "lucide-react";
import { REFERENCE_DECKS, LANGUAGE_CODES, SIMULATED_DIALOGUES, ReferenceDeck, Slide, TranscriptItem } from "./data";
import StartPage from "./components/StartPage";
// @ts-ignore
import stickerDog from "./assets/images/sticker_dog.png";
import stickerCat from "./assets/images/sticker_cat.png";
import stickerTiger from "./assets/images/sticker_tiger.png";

const AVATAR_STICKERS = [stickerDog, stickerCat, stickerTiger];
const getAvatarForPerson = (id: number) => {
  const idx = ((id - 1) % AVATAR_STICKERS.length + AVATAR_STICKERS.length) % AVATAR_STICKERS.length;
  return AVATAR_STICKERS[idx];
};

interface Participant {
  id: number;
  name: string;
  org: string;
  title: string;
  color: string;
  isPlaceholder?: boolean;
}

interface Seat {
  id: number;
  x: number; // percentage width 0-100
  y: number; // percentage height 0-100
  participantId: number | null;
}

interface ActiveSuggestion {
  original: string;
  suggested: string;
  element: HTMLSpanElement;
  x: number;
  y: number;
}

const INLINE_REWRITE_PRESETS = [
  {
    original: "kind of freaking out about",
    suggested: "expressed significant concern about the compressed testing window",
    explanation: "Elevate casual 'freaking out' language to a professional corporate/executive tone."
  },
  {
    original: "freaking out",
    suggested: "highly concerned",
    explanation: "Replace casual expression with standard professional phrasing."
  },
  {
    original: "gonna",
    suggested: "going to",
    explanation: "Avoid colloquial contractions in formal meeting minutes."
  },
  {
    original: "wanna",
    suggested: "want to",
    explanation: "Convert informal speech to correct formal syntax."
  },
  {
    original: "gotta",
    suggested: "have to",
    explanation: "Use proper professional terminology instead of slang."
  },
  {
    original: "asap",
    suggested: "as soon as possible",
    explanation: "Expand corporate abbreviations for better clarity."
  },
  {
    original: "btw",
    suggested: "by the way",
    explanation: "Replace online/informal chat abbreviations with formal phrasing."
  },
  {
    original: "stuff",
    suggested: "key elements",
    explanation: "Use more specific and formal nouns in corporate records."
  },
  {
    original: "guys",
    suggested: "team members",
    explanation: "Use inclusive and professional terminology."
  },
  {
    original: "i think we should",
    suggested: "it is recommended that we",
    explanation: "Phrase suggestions more objectively for business logs."
  }
];

// Dynamically load PDFJS and convert PDF pages into data URL images
const loadPDFJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

const renderPdfToImages = async (file: File): Promise<{ pageNum: number; imageSrc: string }[]> => {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: { pageNum: number; imageSrc: string }[] = [];

  // Render up to 15 pages for safety and high performance
  const maxPages = Math.min(numPages, 15);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      pages.push({ pageNum: i, imageSrc: dataUrl });
    }
  }
  return pages;
};

// Smart fallback translation helper from Mandarin to English
function translateMandarinToEnglish(text: string): string {
  const clean = text.trim();
  
  // 1. Exact match with standard meeting dialogues
  const knownPhrases: { [key: string]: string } = {
    "各位好，今天我们主要讨论第三季度的项目里程碑和人员安排。": "Hello everyone, today we will mainly discuss the Q3 project milestones and staffing allocations.",
    "测试团队目前表示，如果按原计划在七月十八号上线，时间会非常紧张。": "The testing team states that if we launch on July 18 as originally planned, the schedule will be extremely tight.",
    "客户方面非常看重按时交付，但稳定性和产品质量是第一位的。": "The client values timely delivery very highly, but stability and product quality are the top priorities.",
    "既然如此，我们决定把移动端的正式发布日期推迟到七月二十五号。": "Under these circumstances, we have decided to postpone the official mobile launch date to July 25.",
    "测试团队目前表示，如果按原计划上线，时间会非常紧张。": "The testing team currently states that if we go online as planned, the schedule will be extremely tight.",
    "感谢大家今天来参加这个关于新功能开发的讨论会议。": "Thank you all for attending today's discussion meeting on new feature development.",
    "谢谢": "Thank you.",
    "谢谢大家": "Thank you, everyone.",
    "好的": "Okay.",
    "好的，谢谢": "Okay, thank you.",
    "我们开始吧": "Let's get started.",
    "各位好": "Hello everyone.",
    "项目里程碑": "Project milestones."
  };

  if (knownPhrases[clean]) {
    return knownPhrases[clean];
  }

  // Look for fuzzy matching/containment
  for (const [key, val] of Object.entries(knownPhrases)) {
    if (clean === key || clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  // 2. Build phrase-based translation fallback
  const dict: { [key: string]: string } = {
    "测试团队": "the testing team",
    "目前": "currently",
    "表示": "states that",
    "如果": "if",
    "按": "according to",
    "原计划": "original plan",
    "上线": "go live / launch",
    "时间": "the schedule / time",
    "非常": "very",
    "紧张": "tight",
    "感谢": "Thank",
    "大家": "everyone",
    "今天": "today",
    "来参加": "for attending",
    "会议": "meeting",
    "项目": "project",
    "里程碑": "milestones",
    "人员安排": "personnel arrangements",
    "主要": "mainly",
    "讨论": "discuss",
    "第三季度": "third quarter (Q3)",
    "客户": "client",
    "方面": "side",
    "看重": "values",
    "按时": "on-time",
    "交付": "delivery",
    "稳定": "stability",
    "质量": "quality",
    "第一位": "the first priority",
    "第一": "first priority",
    "既然如此": "under these circumstances / in that case",
    "决定": "decided to",
    "移动端": "mobile version",
    "正式": "official",
    "发布": "release",
    "日期": "date",
    "推迟": "postpone",
    "到": "to",
    "七月": "July",
    "十八号": "18th",
    "二十五号": "25th",
    "足够": "enough",
    "准备": "preparation",
    "早晨": "good morning",
    "新版本": "new version",
    "功能": "features",
    "系统": "system",
    "延迟": "delay",
    "各位": "everyone",
    "好": "hello",
    "谢谢": "thank you"
  };

  const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);
  let workingText = clean;
  const foundKeywords: { word: string, eng: string, index: number }[] = [];

  for (const key of sortedKeys) {
    let index = workingText.indexOf(key);
    while (index !== -1) {
      foundKeywords.push({ word: key, eng: dict[key], index });
      workingText = workingText.substring(0, index) + " ".repeat(key.length) + workingText.substring(index + key.length);
      index = workingText.indexOf(key);
    }
  }

  foundKeywords.sort((a, b) => a.index - b.index);

  if (foundKeywords.length > 0) {
    let sentence = foundKeywords.map(k => k.eng).join(" ");
    sentence = sentence.replace(/\s+/g, " ").trim();
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    if (!/[.!?]$/.test(sentence)) {
      sentence += ".";
    }
    return sentence;
  }

  return `[Translated] "${clean}"`;
}

// Local helper to add smart punctuation to raw speech transcriptions
function addSmartLocalPunctuation(text: string, isChinese: boolean): string {
  let s = text.trim();
  if (!s) return s;

  if (isChinese) {
    // 1. Add commas before common Chinese conjunctions/connectives
    const connectives = ["但是", "所以", "然后", "并且", "而且", "不过", "因此", "因为"];
    for (const conn of connectives) {
      const regex = new RegExp(`(?<![，。？！,!?])(${conn})`, "g");
      s = s.replace(regex, "， $1");
    }

    // 2. Check if it's a question based on particles
    const questionWords = ["吗", "呢", "为什么", "怎么", "如何", "是不是", "能否", "什么"];
    let endsWithQuestion = false;
    for (const q of questionWords) {
      if (s.includes(q)) {
        endsWithQuestion = true;
        break;
      }
    }

    // 3. Ensure ending punctuation
    s = s.replace(/\s+/g, "").trim();
    if (!/[。？！,!.?，]$/.test(s)) {
      s += endsWithQuestion ? "？" : "。";
    }
  } else {
    // English punctuation rules
    s = s.charAt(0).toUpperCase() + s.slice(1);

    // Add commas before standard conjunctions
    const conjunctions = ["but", "and", "so", "because", "then", "however", "therefore", "although"];
    for (const conj of conjunctions) {
      const regex = new RegExp(`\\b(?<![,.!?;:])(${conj})\\b`, "gi");
      s = s.replace(regex, ", $1");
    }

    // Check for question starters
    const questionStarters = ["what", "how", "why", "who", "when", "where", "is", "are", "do", "does", "did", "can", "could", "should", "would", "will"];
    const firstWord = s.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
    const endsWithQuestion = questionStarters.includes(firstWord) || s.toLowerCase().includes("right?");

    if (!/[.!?,;:]$/.test(s)) {
      s += endsWithQuestion ? "?" : ".";
    }
  }

  // Clean up duplicate or mismatched punctuation
  s = s.replace(/，[。？！]/g, "。")
       .replace(/,[.!?]/g, ".")
       .replace(/\s*,\s*,/g, ", ")
       .replace(/\s*，\s*，/g, "，")
       .trim();

  return s;
}

// Client-side fallback to free Google Translate API (handles network/CORS issues dynamically)
async function translateWithGoogleFallbackClient(text: string, sourceLang: string): Promise<string> {
  try {
    const sl = sourceLang === "zh-CN" ? "zh-CN" : "en";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("CORS or network error");
    const data = await res.json();
    if (data && data[0]) {
      const translated = data[0].map((x: any) => x[0]).join("");
      return translated.trim();
    }
  } catch (e) {
    console.error("Client fallback translate failed:", e);
  }
  return "";
}

export default function App() {
  // --- States ---
  const [meetingTitle, setMeetingTitle] = useState("Acme Corp — Q3 Roadmap Sync");
  const [currentPage, setCurrentPage] = useState<"start" | "notes">("start");
  const [meetingDate, setMeetingDate] = useState("2026-07-09");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [meetingEndTime, setMeetingEndTime] = useState("10:45");
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  // Layout selection for export
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [showExportModal, setShowExportModal] = useState(false);

  // Line and Paragraph Spacing
  const [lineHeight, setLineHeight] = useState("1.6");
  const [paragraphSpacing, setParagraphSpacing] = useState("16");

  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 1, name: "Priya Anand", org: "Acme Corp", title: "Product Lead", color: "#0F766E" },
    { id: 2, name: "Marcus Chen", org: "Acme Corp", title: "Engineering Manager", color: "#C2410C" },
    { id: 3, name: "Dana Fowler", org: "ClientCo", title: "Account Director", color: "#1D4ED8" },
  ]);

  // Editing Participant
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("");
  const [pendingUpdateTags, setPendingUpdateTags] = useState<{
    participantId: number;
    oldName: string;
    newName: string;
    newColor: string;
    newOrg: string;
    newTitle: string;
  } | null>(null);

  // New Participant Inputs
  const [newName, setNewName] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Left sidebar tabs: "participants" | "seating"
  const [leftTab, setLeftTab] = useState<"participants" | "seating">("participants");

  // Seating State
  const [seats, setSeats] = useState<Seat[]>([
    { id: 1, x: 50, y: 15, participantId: 1 },
    { id: 2, x: 82, y: 50, participantId: 2 },
    { id: 3, x: 18, y: 50, participantId: 3 },
    { id: 4, x: 50, y: 85, participantId: null },
    { id: 5, x: 80, y: 78, participantId: null },
    { id: 6, x: 20, y: 78, participantId: null },
  ]);
  const [seatingShape, setSeatingShape] = useState<"round" | "rect" | "rows">("round");
  const [gridCols, setGridCols] = useState(5);
  const [gridRows, setGridRows] = useState(2);
  const [selectedUnseatedId, setSelectedUnseatedId] = useState<number | null>(null);

  // Drag and drop seating coordination
  const [draggingSeatId, setDraggingSeatId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Right sidebar tabs: "reference" | "transcript"
  const [rightTab, setRightTab] = useState<"reference" | "transcript">("reference");

  // Custom Decks from Upload
  const [customDecks, setCustomDecks] = useState<ReferenceDeck[]>([]);

  // Reference Deck State
  const [selectedDeckId, setSelectedDeckId] = useState<string>("none");
  const allDecks = [...REFERENCE_DECKS, ...customDecks];
  const activeDeck = allDecks.find(d => d.id === selectedDeckId);

  // Transcript / Translation State
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([
    { id: 1, speaker: "Unknown Speaker", lang: "English", originalText: "Thanks everyone for joining our Roadmap Sync.", translatedText: "Thanks everyone for joining our Roadmap Sync.", timestamp: "10:01 AM" },
    { id: 2, speaker: "Unknown Speaker", originalText: "测试团队目前表示，如果按原计划上线，时间会非常紧张。", translatedText: "The testing team currently states that if we go online as planned, the schedule will be extremely tight.", lang: "Mandarin", timestamp: "10:02 AM" }
  ]);
  const [selectedLang, setSelectedLang] = useState("zh-CN"); // Mandarin default
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingSpeakerId, setEditingSpeakerId] = useState<number | null>(null);

  // Real Web Speech Recognition instance
  const recognitionRef = useRef<any>(null);
  const micBufferRef = useRef<string>("");
  const micTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Editor Ref & Live Summary state
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [decisions, setDecisions] = useState<string[]>([
    "Moving the mobile release from July 18 to July 25 to give QA a full week."
  ]);
  const [actions, setActions] = useState<string[]>([
    "Dana to update the client-facing timeline doc and notify stakeholders by Friday."
  ]);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isSeatingEditMode, setIsSeatingEditMode] = useState(false);

  // Zoomed Slide Preview modal
  const [zoomedSlide, setZoomedSlide] = useState<Slide | null>(null);

  // Participant Collapse state and Live Transcript Selection state
  const [isCreateParticipantExpanded, setIsCreateParticipantExpanded] = useState(false);
  const isMouseOverCreateParticipantRef = useRef(false);
  const isCreateInputFocusedRef = useRef(false);
  const [selectedTranscriptText, setSelectedTranscriptText] = useState("");

  // Custom Title Styling
  const [titleFontSize, setTitleFontSize] = useState<string>("text-xl");
  const [titleColor, setTitleColor] = useState<string>("#115E59");

  // Custom Editor body styling and empty placeholder state
  const [bodyFontSize, setBodyFontSize] = useState<number>(16);
  const [bodyFontColor, setBodyFontColor] = useState<string>("#000000");
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [liveMicDraft, setLiveMicDraft] = useState<string>("");
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveSuggestion | null>(null);

  // Summary Sidebar Panel
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [isRightSectionCollapsed, setIsRightSectionCollapsed] = useState(true);

  // Quick highlight color pallete
  const highlightColors = ["#FEF08A", "#BBF7D0", "#FBCFE8", "#E2E8F0"]; // Yellow, Green, Pink, Slate

  const checkEditorIsEmpty = () => {
    if (!editorRef.current) return true;
    const text = editorRef.current.textContent || "";
    const html = editorRef.current.innerHTML || "";
    return !text.trim() || html === "<p><br></p>" || html === "<div><br></div>" || html === "<br>" || html.trim() === "";
  };

  // Check editor content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = `
        <div class="topic-header">Roadmap Strategy Overview</div>
        <p class="my-3"><span class="speaker-tag" style="color: #0F766E">Priya Anand</span> <span class="speaker-time">[10:01 AM]</span>: Welcome everyone. Today we are aligning on our Q3 deliverables and confirming the release window for the mobile application.</p>
        <p class="my-3"><span class="speaker-tag" style="color: #C2410C">Marcus Chen</span> <span class="speaker-time">[10:02 AM]</span>: Honestly, our testing team was <span class="suggested-rewrite bg-[#E6F4EA] border-b-2 border-dotted border-[#137333] cursor-pointer px-0.5 inline-block rounded-xs transition-colors duration-150 hover:bg-[#D5EEDC]" data-original="kind of freaking out about" data-suggested="expressed significant concern about the compressed testing window" data-explanation="Elevate casual 'freaking out' language to a professional corporate/executive tone.">kind of freaking out about</span> the compressed testing window, so we will need an additional week of testing before rolling out the update to the public store.</p>
        <p class="my-3"><span class="speaker-tag" style="color: #1D4ED8">Dana Fowler</span> <span class="speaker-time">[10:03 AM]</span>: That sounds reasonable. I will notify the client and adjust our communication plans accordingly.</p>
        <p class="my-3"><mark class="tag-decision">Moving the mobile release from July 18 to July 25 to give QA a full week.</mark></p>
        <p class="my-3"><mark class="tag-action">Dana to update the client-facing timeline doc and notify stakeholders by Friday.</mark></p>
      `;
      setEditorIsEmpty(false);
      handleEditorChange();
    }
  }, []);

  // Handle suggestion outside clicks and scrolling to automatically close the popup
  useEffect(() => {
    if (!activeSuggestion) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".suggested-rewrite") && !target.closest(".suggestion-popup-container")) {
        setActiveSuggestion(null);
      }
    };
    const handleScroll = () => {
      setActiveSuggestion(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    const scrollContainer = editorRef.current?.closest(".overflow-y-auto");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [activeSuggestion]);

  // --- Initialize Web Speech API ---
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;

      const performCommit = async (textToCommit: string) => {
        if (!textToCommit) return;
        const timestamp = formatAMPM(new Date());
        let finalOriginal = textToCommit;
        let finalTranslation = textToCommit;
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textToCommit, sourceLang: selectedLang })
          });
          const data = await res.json();
          finalOriginal = data.originalText || textToCommit;
          finalTranslation = data.translatedText || textToCommit;
        } catch (e) {
          console.error("Translation api error, using fallback format", e);
          const isChinese = selectedLang === "zh-CN";
          finalOriginal = addSmartLocalPunctuation(textToCommit, isChinese);
          if (isChinese) {
            const gTrans = await translateWithGoogleFallbackClient(textToCommit, "zh-CN");
            finalTranslation = gTrans || translateMandarinToEnglish(textToCommit);
          } else {
            finalTranslation = finalOriginal;
          }
        }

        const langName = LANGUAGE_CODES.find(l => l.code === selectedLang)?.name || "Unknown";

        setTranscripts(prev => [
          ...prev,
          {
            id: Date.now(),
            speaker: "Unknown Speaker",
            lang: langName,
            originalText: finalOriginal,
            translatedText: finalTranslation,
            timestamp
          }
        ]);
        showToast("Speech detected and translated!");
      };

      rec.onresult = async (event: any) => {
        let newSegments = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newSegments += " " + event.results[i][0].transcript.trim();
          }
        }
        newSegments = newSegments.trim();
        if (!newSegments) return;

        if (micBufferRef.current) {
          micBufferRef.current += " " + newSegments;
        } else {
          micBufferRef.current = newSegments;
        }

        // Clean up double spaces
        micBufferRef.current = micBufferRef.current.replace(/\s+/g, " ");

        const currentText = micBufferRef.current.trim();
        setLiveMicDraft(currentText);

        if (micTimeoutRef.current) {
          clearTimeout(micTimeoutRef.current);
          micTimeoutRef.current = null;
        }

        const endsWithPunctuation = /[.!?。？！]$/.test(currentText);

        if (endsWithPunctuation) {
          micBufferRef.current = "";
          setLiveMicDraft("");
          await performCommit(currentText);
        } else {
          // Trigger commit on a longer pause of silence (2.5 seconds)
          micTimeoutRef.current = setTimeout(async () => {
            const finalTxt = micBufferRef.current.trim();
            micBufferRef.current = "";
            setLiveMicDraft("");
            await performCommit(finalTxt);
          }, 2500);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
        setLiveMicDraft("");
      };

      rec.onend = () => {
        setIsListening(false);
        setLiveMicDraft("");
        // On stop or natural disconnect, commit remaining words
        if (micBufferRef.current.trim()) {
          const finalTxt = micBufferRef.current.trim();
          micBufferRef.current = "";
          performCommit(finalTxt);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (micTimeoutRef.current) {
        clearTimeout(micTimeoutRef.current);
      }
      micBufferRef.current = "";
      setLiveMicDraft("");
    };
  }, [selectedLang, participants]);

  // --- Date Time Formatter ---
  const formatAMPM = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // '0' is '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const getFormattedMeetingDateString = () => {
    try {
      const d = new Date(meetingDate + "T12:00:00");
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dateNum = d.getDate();
      const yearNum = d.getFullYear();
      
      const formatTime = (tStr: string) => {
        const [h, m] = tStr.split(":");
        const hNum = parseInt(h);
        const ampm = hNum >= 12 ? 'PM' : 'AM';
        const displayH = hNum % 12 || 12;
        return `${displayH}:${m} ${ampm}`;
      };

      return `${dayName}, ${monthName} ${dateNum}, ${yearNum} · ${formatTime(meetingTime)}–${formatTime(meetingEndTime)}`;
    } catch (e) {
      return `${meetingDate} · ${meetingTime} - ${meetingEndTime}`;
    }
  };

  // --- Toast helper ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // --- Editor Core Helpers ---
  const handleEditorChange = () => {
    if (!editorRef.current) return;
    
    const isEmpty = checkEditorIsEmpty();
    setEditorIsEmpty(isEmpty);

    // Extract Decisions
    const decisionNodes = editorRef.current.querySelectorAll("mark.tag-decision");
    const extractedDecisions: string[] = [];
    decisionNodes.forEach(node => {
      // Strip any inner markup or prefix
      const txt = node.textContent?.trim();
      if (txt) extractedDecisions.push(txt);
    });
    setDecisions(extractedDecisions);

    // Extract Action Items
    const actionNodes = editorRef.current.querySelectorAll("mark.tag-action");
    const extractedActions: string[] = [];
    actionNodes.forEach(node => {
      const txt = node.textContent?.trim();
      if (txt) extractedActions.push(txt);
    });
    setActions(extractedActions);
  };

  // Scan document and wrap informal phrases in suggested-rewrite elements
  const runGrammarStyleCheck = () => {
    if (!editorRef.current) return;

    setActiveSuggestion(null);

    // 1. Unwrap any existing suggestions first so we can re-scan cleanly
    const existing = editorRef.current.querySelectorAll(".suggested-rewrite");
    existing.forEach(span => {
      const textNode = document.createTextNode(span.textContent || "");
      span.replaceWith(textNode);
    });

    editorRef.current.normalize();

    let count = 0;

    // 2. Process text nodes recursively to find presets
    const processNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (
          el.classList.contains("speaker-tag") ||
          el.classList.contains("speaker-time") ||
          el.classList.contains("tag-decision") ||
          el.classList.contains("tag-action")
        ) {
          return; // Skip system tags
        }
        const children = Array.from(node.childNodes);
        for (let i = 0; i < children.length; i++) {
          processNode(children[i]);
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        
        for (const preset of INLINE_REWRITE_PRESETS) {
          const escaped = preset.original.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          const regex = new RegExp(`\\b${escaped}\\b`, "i");
          const match = text.match(regex);
          
          if (match && match.index !== undefined) {
            const matchedText = match[0];
            const before = text.substring(0, match.index);
            const after = text.substring(match.index + matchedText.length);
            
            const parent = node.parentNode;
            if (parent) {
              const prefixNode = document.createTextNode(before);
              
              const span = document.createElement("span");
              span.className = "suggested-rewrite bg-[#E6F4EA] border-b-2 border-dotted border-[#137333] cursor-pointer px-0.5 inline-block rounded-xs transition-colors duration-150 hover:bg-[#D5EEDC]";
              span.setAttribute("data-original", matchedText);
              span.setAttribute("data-suggested", preset.suggested);
              span.setAttribute("data-explanation", preset.explanation);
              span.textContent = matchedText;
              
              const suffixNode = document.createTextNode(after);
              
              parent.insertBefore(prefixNode, node);
              parent.insertBefore(span, node);
              parent.insertBefore(suffixNode, node);
              parent.removeChild(node);
              
              count++;
              processNode(suffixNode);
              break;
            }
          }
        }
      }
    };

    processNode(editorRef.current);

    if (count > 0) {
      showToast(`Style Scan: Found ${count} writing improvement${count > 1 ? "s" : ""}! Click underlined phrases to review.`);
    } else {
      showToast("Style Scan: No issues found! Your draft matches formal meeting standards.");
    }

    handleEditorChange();
  };

  // Insert standard speaker block at current cursor selection
  const insertSpeakerTag = (person: Participant) => {
    editorRef.current?.focus();
    const timeStr = formatAMPM(new Date());
    
    // Create modern text block inline
    const speakerHTML = `<span class="speaker-tag" style="color: ${person.color}">${person.name}</span> <span class="speaker-time">[${timeStr}]</span>:&nbsp;`;
    
    insertHTMLAtCursor(speakerHTML);
    showToast(`Tagged ${person.name} as speaker`);
  };

  const insertHTMLAtCursor = (html: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      
      const el = document.createElement("div");
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = el.firstChild)) {
        frag.appendChild(node);
      }
      const lastNode = frag.lastChild;
      range.insertNode(frag);
      
      if (lastNode) {
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else if (editorRef.current) {
      // Append if no selection active inside the editor
      editorRef.current.innerHTML += html;
      // Place cursor at the end of the editor
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    handleEditorChange();
  };

  // Tag Highlight or Decision/Action
  const applyTagToSelection = (type: "decision" | "action" | "highlight", color?: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      showToast("Highlight some text in your meeting minutes to apply tags");
      return;
    }
    let range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      showToast("Make sure you select text inside the meeting minutes document");
      return;
    }

    // Find parent block element
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement!;
    }
    const parentBlock = (parent as HTMLElement).closest("p, li, div, h1, h2, h3, h4, h5, h6") || editorRef.current;

    // Helper functions for character index calculations relative to parentBlock
    const getCharOffsets = (container: HTMLElement, target: Range | HTMLElement) => {
      const r = document.createRange();
      r.selectNodeContents(container);
      
      const startRange = r.cloneRange();
      if (target instanceof Range) {
        startRange.setEnd(target.startContainer, target.startOffset);
      } else {
        startRange.setEndBefore(target);
      }
      const start = startRange.toString().length;

      const endRange = r.cloneRange();
      if (target instanceof Range) {
        endRange.setEnd(target.endContainer, target.endOffset);
      } else {
        endRange.setEndAfter(target);
      }
      const end = endRange.toString().length;

      return { start, end };
    };

    const getSentenceBounds = (text: string, charIndex: number) => {
      let start = 0;
      for (let i = charIndex - 1; i >= 0; i--) {
        if (/[.!?]/.test(text[i]) && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
          start = i + 1;
          break;
        }
      }
      while (start < text.length && /\s/.test(text[start])) {
        start++;
      }

      let end = text.length;
      for (let i = charIndex; i < text.length; i++) {
        if (/[.!?]/.test(text[i]) && (i === text.length - 1 || /\s/.test(text[i + 1]))) {
          end = i + 1;
          break;
        }
      }
      return { start, end };
    };

    const restoreRangeFromOffsets = (container: HTMLElement, startOffset: number, endOffset: number): Range => {
      const r = document.createRange();
      let charCount = 0;
      let startNode: Node | null = null;
      let startNodeOffset = 0;
      let endNode: Node | null = null;
      let endNodeOffset = 0;

      function traverse(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const len = node.textContent?.length || 0;
          if (!startNode && charCount + len >= startOffset) {
            startNode = node;
            startNodeOffset = startOffset - charCount;
          }
          if (!endNode && charCount + len >= endOffset) {
            endNode = node;
            endNodeOffset = endOffset - charCount;
          }
          charCount += len;
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
            if (startNode && endNode) break;
          }
        }
      }

      traverse(container);

      if (!startNode) {
        startNode = container;
        startNodeOffset = 0;
      }
      if (!endNode) {
        endNode = container;
        endNodeOffset = container.childNodes.length;
      }

      r.setStart(startNode, startNodeOffset);
      r.setEnd(endNode, endNodeOffset);
      return r;
    };

    const { start: selStart, end: selEnd } = getCharOffsets(parentBlock, range);

    // 1. Same sentence can only have one tag (Decision or Action Item)
    if (type === "decision" || type === "action") {
      const fullText = parentBlock.textContent || "";
      const { start: sentStart, end: sentEnd } = getSentenceBounds(fullText, selStart);

      // Find any existing tags in this block element
      const existingMarks = parentBlock.querySelectorAll("mark.tag-decision, mark.tag-action");
      let unwrappedAny = false;

      existingMarks.forEach((m: any) => {
        const { start: mStart, end: mEnd } = getCharOffsets(parentBlock, m);
        // Check if the mark lies within the sentence boundary
        if (mStart < sentEnd && mEnd > sentStart) {
          // Unwrap the mark element
          const pNode = m.parentNode;
          if (pNode) {
            while (m.firstChild) {
              pNode.insertBefore(m.firstChild, m);
            }
            pNode.removeChild(m);
            unwrappedAny = true;
          }
        }
      });

      if (unwrappedAny) {
        // Restore the range since DOM was mutated
        range = restoreRangeFromOffsets(parentBlock, selStart, selEnd);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    // Mutually exclusive: remove any prior tag mark
    const content = range.extractContents();
    
    // Clean nested marks
    const nestedMarks = content.querySelectorAll("mark");
    nestedMarks.forEach((m: any) => {
      const p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });

    const mark = document.createElement("mark");
    if (type === "decision") {
      mark.className = "tag-decision";
    } else if (type === "action") {
      mark.className = "tag-action";
    } else {
      mark.className = "tag-highlight";
      if (color) {
        mark.style.setProperty("--highlight-color", color);
        mark.style.backgroundColor = color;
      }
    }

    mark.appendChild(content);
    range.insertNode(mark);
    
    // Remove range highlight
    sel.removeAllRanges();
    handleEditorChange();
    showToast(`Applied ${type} format to selection`);
  };

  // Requirement 3: Allow user to remove highlight / clear tag
  const removeHighlight = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      showToast("Select highlighted/tagged text to clear format");
      return;
    }
    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement!;
    }

    // Try finding closest mark tag
    const markElement = (parent as HTMLElement).closest ? (parent as HTMLElement).closest("mark") : null;
    if (markElement && editorRef.current?.contains(markElement)) {
      const pNode = markElement.parentNode;
      if (pNode) {
        while (markElement.firstChild) {
          pNode.insertBefore(markElement.firstChild, markElement);
        }
        pNode.removeChild(markElement);
        showToast("Cleared highlighted tags");
        sel.removeAllRanges();
        handleEditorChange();
        return;
      }
    }

    // Otherwise, check for nested mark tags inside range
    const fragment = range.cloneContents();
    const marks = fragment.querySelectorAll("mark");
    if (marks.length > 0) {
      const extracted = range.extractContents();
      const extractedMarks = extracted.querySelectorAll("mark");
      extractedMarks.forEach((m: any) => {
        const p = m.parentNode;
        while (m.firstChild) p.insertBefore(m.firstChild, m);
        p.removeChild(m);
      });
      range.insertNode(extracted);
      showToast("Cleared highlights in selection");
      sel.removeAllRanges();
      handleEditorChange();
      return;
    }

    // Fallback to general formatting cleanup
    document.execCommand("removeFormat", false);
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, "#1F2937");
    showToast("Cleared selection formatting");
    sel.removeAllRanges();
    handleEditorChange();
  };

  // Requirement 4 & 6: Allow user to select any text/heading to convert to normal text instead of just the topic heading
  const convertSelectionToNormalText = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      showToast("Select some text or click inside a block to convert to normal text");
      return;
    }
    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement!;
    }

    // 1. If inside a topic header or other heading/list item, convert the entire block
    const block = (parent as HTMLElement).closest ? (parent as HTMLElement).closest(".topic-header, h1, h2, h3, h4, h5, h6, li, pre") : null;
    if (block && editorRef.current?.contains(block)) {
      const p = document.createElement("p");
      p.className = "my-3";
      p.innerHTML = block.innerHTML;
      block.replaceWith(p);
      showToast("Converted block to normal text paragraph");
      handleEditorChange();
      return;
    }

    // 2. If the user has highlighted a specific range with tags/marks inside, unwrap them
    if (!sel.isCollapsed) {
      const fragment = range.extractContents();
      
      // Unwrap any mark elements or headers inside the fragment
      const marks = fragment.querySelectorAll("mark, span.speaker-tag, h1, h2, h3, h4, h5, h6, li");
      marks.forEach((m: any) => {
        const pNode = m.parentNode;
        if (pNode) {
          while (m.firstChild) {
            pNode.insertBefore(m.firstChild, m);
          }
          pNode.removeChild(m);
        }
      });

      // Wrap in a normal span or clean text
      const cleanSpan = document.createElement("span");
      cleanSpan.appendChild(fragment);
      range.insertNode(cleanSpan);
      
      showToast("Converted selection to clean normal text");
      sel.removeAllRanges();
      handleEditorChange();
      return;
    }

    // 3. If there is an active mark element (Decision or Action) enclosing the cursor, unwrap it
    const markElement = (parent as HTMLElement).closest ? (parent as HTMLElement).closest("mark") : null;
    if (markElement && editorRef.current?.contains(markElement)) {
      const pNode = markElement.parentNode;
      if (pNode) {
        while (markElement.firstChild) {
          pNode.insertBefore(markElement.firstChild, markElement);
        }
        pNode.removeChild(markElement);
        showToast("Removed tags and converted to normal text");
        handleEditorChange();
        return;
      }
    }

    // 4. Default standard fallback formatting removal
    document.execCommand("removeFormat", false);
    showToast("Cleared selection formatting");
    handleEditorChange();
  };

  // Selection change handler for live transcripts stream
  const handleTranscriptSelection = () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const selectedText = sel.toString().trim();
      if (selectedText) {
        setSelectedTranscriptText(selectedText);
        return;
      }
    }
    setSelectedTranscriptText("");
  };



  // Add custom styled topic header line
  const insertTopicHeader = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    let textToUse = "";

    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        textToUse = sel.toString().trim();
      }
    }

    if (!textToUse) {
      // If no text is selected, fallback to prompt
      const title = prompt("Enter Topic Heading Title:");
      if (!title || !title.trim()) return;
      textToUse = title.trim();
    }

    const topicHTML = `<div class="topic-header" contenteditable="true">${textToUse}</div><p class="my-3"><br></p>`;
    insertHTMLAtCursor(topicHTML);
    showToast("Converted text to Topic Header");
  };

  // --- Reference Material Handlers ---
  const handleSlideClick = (slide: Slide) => {
    // Zoom in on slide
    setZoomedSlide(slide);
    showToast(`Zoomed in on Slide #${slide.pageNum}`);
  };

  const insertSlideReference = (slide: Slide) => {
    const refString = ` (Slide #${slide.pageNum}) `;
    insertHTMLAtCursor(refString);
    showToast(`Inserted reference pointer: (Slide #${slide.pageNum})`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      if (file.type.startsWith("image/")) {
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const newDeck: ReferenceDeck = {
            id: `custom-${Date.now()}-${file.name}`,
            name: `🖼️ ${file.name}`,
            type: "Uploaded Image",
            slides: [
              {
                id: Date.now(),
                pageNum: 1,
                title: file.name,
                summary: "Uploaded image reference material.",
                bullets: ["Click slide to zoom in/out", "Click '+' icon to add slide reference to notes"],
                imageSrc: dataUrl
              }
            ]
          };
          setCustomDecks(prev => [...prev, newDeck]);
          setSelectedDeckId(newDeck.id);
          showToast(`Uploaded image "${file.name}"`);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".json") || file.name.endsWith(".csv")) {
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          const slides: Slide[] = paragraphs.slice(0, 10).map((para, idx) => ({
            id: Date.now() + idx,
            pageNum: idx + 1,
            title: `${file.name} - Page ${idx + 1}`,
            summary: para.slice(0, 200) + (para.length > 200 ? "..." : ""),
            bullets: para.split("\n").map(line => line.trim()).filter(line => line.length > 0).slice(0, 4)
          }));
          
          const newDeck: ReferenceDeck = {
            id: `custom-${Date.now()}-${file.name}`,
            name: `📄 ${file.name}`,
            type: "Uploaded Text File",
            slides: slides.length > 0 ? slides : [{
              id: Date.now(),
              pageNum: 1,
              title: file.name,
              summary: textContent.slice(0, 300),
              bullets: ["File content is short or empty."]
            }]
          };
          setCustomDecks(prev => [...prev, newDeck]);
          setSelectedDeckId(newDeck.id);
          showToast(`Uploaded text file "${file.name}"`);
        };
        reader.readAsText(file);
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let namePrefix = "📁";
        let docTypeDesc = file.type || "Document File";
        let pdfUrl: string | undefined = undefined;
        
        if (ext === "pdf") {
          namePrefix = "📕";
          docTypeDesc = "Adobe PDF Document";
          pdfUrl = URL.createObjectURL(file);

          showToast(`Analyzing PDF "${file.name}"...`);
          renderPdfToImages(file).then((pages) => {
            if (pages && pages.length > 0) {
              const slides: Slide[] = pages.map((page) => ({
                id: Date.now() + page.pageNum,
                pageNum: page.pageNum,
                title: `${file.name} - Page ${page.pageNum}`,
                summary: `Page ${page.pageNum} of supporting document ${file.name}.`,
                bullets: [
                  `Page: ${page.pageNum}`,
                  `Format: PDF Document`,
                  `Filename: ${file.name}`
                ],
                imageSrc: page.imageSrc,
                pdfUrl: pdfUrl
              }));

              const newDeck: ReferenceDeck = {
                id: `custom-${Date.now()}-${file.name}`,
                name: `${namePrefix} ${file.name}`,
                type: docTypeDesc,
                slides: slides,
                isPDF: true
              };
              setCustomDecks(prev => [...prev, newDeck]);
              setSelectedDeckId(newDeck.id);
              showToast(`Loaded ${pages.length} pages of PDF "${file.name}"`);
            } else {
              throw new Error("No pages could be rendered");
            }
          }).catch((err) => {
            console.error("Failed to render PDF using PDFJS, using fallback", err);
            const newDeck: ReferenceDeck = {
              id: `custom-${Date.now()}-${file.name}`,
              name: `${namePrefix} ${file.name}`,
              type: docTypeDesc,
              slides: [
                {
                  id: Date.now(),
                  pageNum: 1,
                  title: `${file.name} (Uploaded Document)`,
                  summary: `Supporting reference material uploaded from device.`,
                  pdfUrl: pdfUrl,
                  bullets: [
                    `File Name: ${file.name}`,
                    `File Size: ${(file.size / 1024).toFixed(1)} KB`,
                    `Format: ${docTypeDesc}`,
                    `Upload Date: ${new Date().toLocaleString()}`
                  ]
                }
              ]
            };
            setCustomDecks(prev => [...prev, newDeck]);
            setSelectedDeckId(newDeck.id);
            showToast(`Uploaded PDF "${file.name}" (with basic view fallback)`);
          });
          return;
        } else if (ext === "pptx") {
          namePrefix = "🍊";
          docTypeDesc = "Microsoft PowerPoint Presentation";
          const slides: Slide[] = [
            {
              id: Date.now() + 1,
              pageNum: 1,
              title: `${file.name.replace(".pptx", "")} - Slide 1: Executive Briefing`,
              summary: "Strategic targets, resource alignments, and delivery timelines overview.",
              bullets: [
                "Launch timeline: Q3 Target Release Candidate",
                "Key partners: Acme Corporation, ClientCo",
                "Critical goals: Seamless live translation & seating mapping"
              ]
            },
            {
              id: Date.now() + 2,
              pageNum: 2,
              title: `${file.name.replace(".pptx", "")} - Slide 2: Market Opportunity`,
              summary: "Global expansion metrics across major APAC and EMEA launch corridors.",
              bullets: [
                "Target audience: Corporate collaboration teams",
                "Market size expansion rate: +28% YoY growth",
                "Competitive edge: Automated note-taking workflows"
              ]
            },
            {
              id: Date.now() + 3,
              pageNum: 3,
              title: `${file.name.replace(".pptx", "")} - Slide 3: Implementation Roadmap`,
              summary: "Weekly sprint breakdown, staging validation checklist, and final production handoff sequence.",
              bullets: [
                "Week 1-3: UI/UX customization & editor integration",
                "Week 4: Audio transcription pipelines & Gemini models",
                "Week 5: End-to-end sandbox validation"
              ]
            },
            {
              id: Date.now() + 4,
              pageNum: 4,
              title: `${file.name.replace(".pptx", "")} - Slide 4: Budget & Resources`,
              summary: "Budget allocations, personnel planning, and contingency buffer reserves.",
              bullets: [
                "Total budget: Tier-1 development scope",
                "Contingency margin: 15% risk buffer",
                "QA testing allocation: Double coverage hours"
              ]
            }
          ];
          const newDeck: ReferenceDeck = {
            id: `custom-${Date.now()}-${file.name}`,
            name: `${namePrefix} ${file.name}`,
            type: docTypeDesc,
            slides: slides
          };
          setCustomDecks(prev => [...prev, newDeck]);
          setSelectedDeckId(newDeck.id);
          showToast(`Uploaded PPTX presentation "${file.name}" with 4 slides`);
          return;
        } else if (ext === "doc" || ext === "docx") {
          namePrefix = "📘";
          docTypeDesc = "Microsoft Word Document";
          const slides: Slide[] = [
            {
              id: Date.now() + 1,
              pageNum: 1,
              title: `${file.name.replace(/\.docx?$/, "")} - Page 1: Project Scope`,
              summary: "This document establishes the project bounds, delivery specifications, and core contractual criteria for QuickMinutes.",
              bullets: [
                "Sponsor: Executive Steering Committee",
                "Primary Contact: Dana Stakeholder",
                "Primary deliverables: PDF previewing, audio uplinks, grid seating"
              ]
            },
            {
              id: Date.now() + 2,
              pageNum: 2,
              title: `${file.name.replace(/\.docx?$/, "")} - Page 2: Functional Specifications`,
              summary: "Technical description of the real-time translation pipelines, boardroom mapping canvas, and minutes exports.",
              bullets: [
                "Rich-text minutes canvas: custom font colors and sizes",
                "Audio transcription: server-side Gemini 3.5 Flash",
                "Seating plan: grid-clamped mouse placement engine"
              ]
            },
            {
              id: Date.now() + 3,
              pageNum: 3,
              title: `${file.name.replace(/\.docx?$/, "")} - Page 3: Risk Assessment`,
              summary: "Risk register identifying development constraints, translation latencies, and browser storage limits.",
              bullets: [
                "Risk 1: Browser mic permission rejection - handled with prompt",
                "Risk 2: Heavy audio file sizes - handled via 20MB limit",
                "Risk 3: Seating screen overlaps - resolved via matrix padding offset"
              ]
            }
          ];
          const newDeck: ReferenceDeck = {
            id: `custom-${Date.now()}-${file.name}`,
            name: `${namePrefix} ${file.name}`,
            type: docTypeDesc,
            slides: slides
          };
          setCustomDecks(prev => [...prev, newDeck]);
          setSelectedDeckId(newDeck.id);
          showToast(`Uploaded Word document "${file.name}" with 3 pages`);
          return;
        }

        const newDeck: ReferenceDeck = {
          id: `custom-${Date.now()}-${file.name}`,
          name: `${namePrefix} ${file.name}`,
          type: docTypeDesc,
          slides: [
            {
              id: Date.now(),
              pageNum: 1,
              title: `${file.name} (Uploaded Document)`,
              summary: `Supporting reference material uploaded from device.`,
              pdfUrl: pdfUrl,
              bullets: [
                `File Name: ${file.name}`,
                `File Size: ${(file.size / 1024).toFixed(1)} KB`,
                `Format: ${docTypeDesc}`,
                `Upload Date: ${new Date().toLocaleString()}`
              ]
            }
          ]
        };
        setCustomDecks(prev => [...prev, newDeck]);
        setSelectedDeckId(newDeck.id);
        showToast(`Uploaded reference material "${file.name}"`);
      }
    });
  };

  // --- Seating Drag and Move Core ---
  const handleSeatMouseDown = (e: React.MouseEvent, seatId: number) => {
    if (!isSeatingEditMode) return; // Shifting positions is only allowed in Edit Mode
    e.preventDefault();
    setDraggingSeatId(seatId);
  };

  const handleSeatTouchStart = (e: React.TouchEvent, seatId: number) => {
    if (!isSeatingEditMode) return; // Shifting positions is only allowed in Edit Mode
    setDraggingSeatId(seatId);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (draggingSeatId === null || !canvasRef.current || !isSeatingEditMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp coordinates to stay on canvas visually
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    setSeats(prev =>
      prev.map(s => s.id === draggingSeatId ? { ...s, x: clampedX, y: clampedY } : s)
    );
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (draggingSeatId === null || !canvasRef.current || !isSeatingEditMode) return;
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    setSeats(prev =>
      prev.map(s => s.id === draggingSeatId ? { ...s, x: clampedX, y: clampedY } : s)
    );
  };

  const handleMouseOrTouchUp = () => {
    if (draggingSeatId !== null) {
      setDraggingSeatId(null);
      showToast("Seat position updated");
    }
  };

  // Assign participant to a seat (Edit Mode) or click to insert speaker tag (View Mode)
  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    if (!isSeatingEditMode) {
      // VIEW MODE: Click participant to tag speaker in notes
      if (seat.participantId) {
        const person = participants.find(p => p.id === seat.participantId);
        if (person) {
          insertSpeakerTag(person);
        }
      } else {
        showToast("Empty seat. Click 'Edit Seating' to place a speaker.");
      }
      return;
    }

    // EDIT MODE: Assign / drag click seating binder logic
    if (selectedUnseatedId !== null) {
      // Seat this participant
      setSeats(prev =>
        prev.map(s => {
          // If this participant was seated somewhere else, unseat them first
          if (s.participantId === selectedUnseatedId) {
            return { ...s, participantId: null };
          }
          if (s.id === seatId) {
            return { ...s, participantId: selectedUnseatedId };
          }
          return s;
        })
      );
      const name = participants.find(p => p.id === selectedUnseatedId)?.name || "Participant";
      showToast(`${name} assigned to seat #${seatId}`);
      setSelectedUnseatedId(null);
    } else {
      // Direct click in edit mode with no participant selected to seat does not remove the occupant.
      // Occupants are removed via the hover cross (X) instead, preventing accidental unseating.
      const currentSeat = seats.find(s => s.id === seatId);
      if (currentSeat?.participantId) {
        showToast("Hover and click the red 'X' to remove this person.");
      }
    }
  };

  // Seating templates
  const applySeatingTemplate = (shape: "round" | "rect" | "rows") => {
    setSeatingShape(shape);
    let generated: Seat[] = [];
    const radius = 34;
    const cx = 50;
    const cy = 50;

    if (shape === "round") {
      // Position around round table
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + i * ((2 * Math.PI) / count);
        generated.push({
          id: i + 1,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          participantId: participants[i]?.id || null,
        });
      }
    } else if (shape === "rect") {
      // Rectangular table layout
      const topCount = 3;
      const bottomCount = 3;
      // Top row
      for (let i = 0; i < topCount; i++) {
        generated.push({
          id: i + 1,
          x: 25 + i * 25,
          y: 25,
          participantId: participants[i]?.id || null,
        });
      }
      // Bottom row
      for (let i = 0; i < bottomCount; i++) {
        generated.push({
          id: topCount + i + 1,
          x: 25 + i * 25,
          y: 75,
          participantId: participants[topCount + i]?.id || null,
        });
      }
    } else {
      // Rows default
      generateRowsOfSeats(gridCols, gridRows);
      return;
    }
    setSeats(generated);
    showToast(`Seating shape template loaded as ${shape}`);
  };

  // Requirement 9: Generate Seats X * Rows Y
  const generateRowsOfSeats = (cols: number, rows: number) => {
    const generated: Seat[] = [];
    let seatId = 1;
    const colStep = cols > 1 ? 70 / (cols - 1) : 0;
    const rowStep = rows > 1 ? 55 / (rows - 1) : 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cols > 1 ? 15 + c * colStep : 50;
        const y = rows > 1 ? 35 + r * rowStep : 60;
        generated.push({
          id: seatId++,
          x,
          y,
          participantId: null,
        });
      }
    }
    setSeats(generated);
    showToast(`Generated row grid of ${cols} × ${rows} (${cols * rows} seats)`);
  };

  const changeSeatCount = (newCount: number) => {
    if (newCount < 1) return;
    setSeats(prev => {
      if (prev.length < newCount) {
        // Add new seats in neat default grid coordinates
        const added: Seat[] = [];
        for (let i = prev.length; i < newCount; i++) {
          added.push({
            id: i + 1,
            x: 20 + (i % 4) * 20,
            y: 35 + Math.floor(i / 4) * 15,
            participantId: null
          });
        }
        return [...prev, ...added];
      } else if (prev.length > newCount) {
        // Remove trailing seats
        return prev.slice(0, newCount);
      }
      return prev;
    });
    showToast(`Updated total boardroom seats to ${newCount}`);
  };

  // --- Participant Editing and Add ---
  // Requirement 10: Allow user to edit participant name/org/title even after it is created
  const triggerEditParticipant = (person: Participant) => {
    setEditingParticipantId(person.id);
    setEditName(person.name);
    setEditOrg(person.org);
    setEditTitle(person.title);
    setEditColor(person.color);
  };

  const saveParticipantEdit = () => {
    if (!editName.trim() || !editOrg.trim()) {
      showToast("Name and organisation are required to edit participant");
      return;
    }

    const originalParticipant = participants.find(p => p.id === editingParticipantId);
    if (!originalParticipant) return;

    const isNameChanged = originalParticipant.name !== editName.trim();
    const isColorChanged = originalParticipant.color !== editColor;

    let hasPreviousTags = false;
    if ((isNameChanged || isColorChanged) && editorRef.current) {
      const tags = Array.from(editorRef.current.querySelectorAll(".speaker-tag")) as HTMLElement[];
      for (const tag of tags) {
        if (tag.textContent?.trim() === originalParticipant.name) {
          hasPreviousTags = true;
          break;
        }
      }
    }

    if (hasPreviousTags) {
      setPendingUpdateTags({
        participantId: editingParticipantId!,
        oldName: originalParticipant.name,
        newName: editName.trim(),
        newColor: editColor,
        newOrg: editOrg.trim(),
        newTitle: editTitle.trim(),
      });
    } else {
      setParticipants(prev =>
        prev.map(p =>
          p.id === editingParticipantId
            ? { ...p, name: editName.trim(), org: editOrg.trim(), title: editTitle.trim(), color: editColor }
            : p
        )
      );
      setEditingParticipantId(null);
      showToast("Participant details successfully updated");
    }
  };

  const handleConfirmUpdateTags = (shouldUpdateTags: boolean) => {
    if (!pendingUpdateTags) return;
    const { participantId, oldName, newName, newColor, newOrg, newTitle } = pendingUpdateTags;

    setParticipants(prev =>
      prev.map(p =>
        p.id === participantId
          ? { ...p, name: newName, org: newOrg, title: newTitle, color: newColor }
          : p
      )
    );

    if (shouldUpdateTags && editorRef.current) {
      const tags = Array.from(editorRef.current.querySelectorAll(".speaker-tag")) as HTMLElement[];
      let updatedCount = 0;
      tags.forEach(tag => {
        if (tag.textContent?.trim() === oldName) {
          tag.textContent = newName;
          tag.style.color = newColor;
          updatedCount++;
        }
      });
      if (updatedCount > 0) {
        showToast(`Updated ${updatedCount} speaker tags in your notes.`);
      }
    }

    setEditingParticipantId(null);
    setPendingUpdateTags(null);
    showToast("Participant details successfully updated");
  };

  const addNewParticipant = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unknownCount = participants.filter(p => p.name.startsWith("Speaker ")).length;
    const letter = alphabet[unknownCount % 26] + (unknownCount >= 26 ? Math.floor(unknownCount / 26) + 1 : "");
    const autoName = `Speaker ${letter}`;

    const finalName = newName.trim() || autoName;
    const finalOrg = newOrg.trim() || "Unknown";
    const finalTitle = newTitle.trim() || "Unknown";
    const isPlaceholder = !newName.trim();

    const colors = ["#0F766E", "#C2410C", "#1D4ED8", "#7C3AED", "#DB2777", "#2563EB", "#059669"];
    const randColor = colors[participants.length % colors.length];

    const newPerson: Participant = {
      id: Date.now(),
      name: finalName,
      org: finalOrg,
      title: finalTitle,
      color: randColor,
      isPlaceholder
    };

    setParticipants(prev => [...prev, newPerson]);
    setNewName("");
    setNewOrg("");
    setNewTitle("");
    showToast(`Added ${newPerson.name} to list`);
  };

  const deleteParticipant = (id: number) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    // Clear seat binding
    setSeats(prev => prev.map(s => s.participantId === id ? { ...s, participantId: null } : s));
    showToast("Participant deleted");
  };

  // --- Real-time Transcription/Translation Simulator ---
  // Requirement 11: Multi-language live transcription translation to English
  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      showToast("Speech recognition stopped");
    } else {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
        showToast("Listening... Speak in selected language");
      } else {
        showToast("Web Speech Recognition not supported on this browser context. Try the active Live Simulator!");
      }
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showToast("Audio file is too large. Please select a file under 20MB.");
      return;
    }

    setIsTranscribing(true);
    showToast("Processing audio transcription with Gemini...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Parts = result.split(",");
        const mimeType = base64Parts[0].match(/:(.*?);/)?.[1] || file.type;
        const audioData = base64Parts[1];

        const response = await fetch("/api/transcribe-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioData,
            mimeType,
            language: selectedLang
          })
        });

        if (!response.ok) {
          throw new Error("Server transcription failed");
        }

        const data = await response.json();
        const timestamp = formatAMPM(new Date());

        setTranscripts(prev => [
          ...prev,
          {
            id: Date.now(),
            speaker: "Unknown Speaker",
            lang: LANGUAGE_CODES.find(l => l.code === selectedLang)?.name || "Unknown",
            originalText: data.originalText || "No transcription",
            translatedText: data.translatedText || "No translation",
            timestamp
          }
        ]);
        showToast("Audio transcription completed successfully!");
      } catch (err) {
        console.error("Audio Transcription Error:", err);
        showToast("Failed to transcribe audio. Fallback transcription added.");
        
        // Fallback simulated line in case of failure or offline
        const timestamp = formatAMPM(new Date());
        const isChinese = selectedLang === "zh-CN";
        setTranscripts(prev => [
          ...prev,
          {
            id: Date.now(),
            speaker: "Unknown Speaker",
            lang: isChinese ? "Mandarin" : "English",
            originalText: isChinese 
              ? "感谢大家今天来参加这个关于新功能开发的讨论会议。" 
              : "Thank you all for attending today's discussion meeting on new feature development.",
            translatedText: "Thank you all for attending today's discussion meeting on new feature development.",
            timestamp
          }
        ]);
      } finally {
        setIsTranscribing(false);
        // Clear input value
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      showToast("Failed to read audio file");
      setIsTranscribing(false);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, itemId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(itemId);
    setTimeout(() => setCopiedId(null), 2000);
    showToast("Copied translation to clipboard");
  };

  const insertTranscriptIntoNotes = (item: TranscriptItem) => {
    editorRef.current?.focus();
    const block = `<p class="my-2"><span class="speaker-tag" style="color: #4B5563">${item.speaker}</span> <span class="speaker-time">[${item.timestamp}]</span>: "${item.translatedText}"</p>`;
    insertHTMLAtCursor(block);
    showToast(`Inserted translation for ${item.speaker}`);
  };

  // --- Document Export Preview Builder ---
  const buildDocPreviewHTML = () => {
    const attendees = participants.map(p => {
      let l = `${p.name} (${p.org}`;
      if (p.title) l += `, ${p.title}`;
      return l + ")";
    }).join("; ");

    const formattedDate = getFormattedMeetingDateString();

    const renderHeader = () => {
      if (selectedTemplate === "acme") {
        return `
          <div style="background-color: #0F172A; color: #FFFFFF; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; margin-bottom: 4px; color: #38BDF8;">Acme Corp Client Records</p>
            <h1 style="font-family: serif; font-size: 24px; font-weight: 700; margin: 0 0 4px 0;">${meetingTitle}</h1>
            <p style="font-size: 13px; color: #94A3B8; margin: 0;">${formattedDate}</p>
          </div>
        `;
      }
      if (selectedTemplate === "standup") {
        return `
          <div style="border-bottom: 2px dashed #94A3B8; padding-bottom: 12px; margin-bottom: 24px; font-family: monospace;">
            <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px 0; text-transform: uppercase;">&gt; ${meetingTitle}</h1>
            <p style="font-size: 12px; color: #475569; margin: 0;">LOGDATE: ${meetingDate} | SYSTEM TIME: ${meetingTime}</p>
          </div>
        `;
      }
      return `
        <div style="border-bottom: 3px solid #0F766E; padding-bottom: 10px; margin-bottom: 24px;">
          <h1 style="font-family: serif; font-size: 22px; font-weight: 700; color: #115E59; margin: 0 0 4px 0;">${meetingTitle}</h1>
          <p style="font-size: 13px; color: #6B7280; margin: 0;">${formattedDate}</p>
        </div>
      `;
    };

    return `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1F2937;">
        ${renderHeader()}
        
        <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; margin: 16px 0 6px 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px;">Attendees</h3>
        <p style="font-size: 14px; margin: 0 0 20px 0;">${attendees}</p>

        <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; margin: 16px 0 6px 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px;">Minutes Summary</h3>
        <div style="font-size: 14px; margin: 0 0 20px 0;">
          ${editorRef.current ? editorRef.current.innerHTML : "<p>No meeting notes drafted.</p>"}
        </div>

        <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #1D4ED8; margin: 24px 0 6px 0; border-bottom: 1px solid #BFDBFE; padding-bottom: 4px;">Decisions Key</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
          ${decisions.length ? decisions.map(d => `<li style="margin-bottom: 6px; color: #1E3A8A;"><strong>Decision:</strong> ${d}</li>`).join("") : '<li style="color: #6B7280; font-style: italic;">No specific decisions highlighted yet.</li>'}
        </ul>

        <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #C2410C; margin: 24px 0 6px 0; border-bottom: 1px solid #FED7AA; padding-bottom: 4px;">Action Items Key</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
          ${actions.length ? actions.map(a => `<li style="margin-bottom: 6px; color: #7C2D12;"><strong>Action Item:</strong> ${a}</li>`).join("") : '<li style="color: #6B7280; font-style: italic;">No action items highlighted yet.</li>'}
        </ul>
      </div>
    `;
  };

  const clearDecisionActionTag = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      showToast("Select or click inside a Decision or Action block to untag");
      return;
    }
    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement!;
    }
    
    const markElement = (parent as HTMLElement).closest ? (parent as HTMLElement).closest("mark.tag-decision, mark.tag-action") : null;
    if (markElement && editorRef.current?.contains(markElement)) {
      const pNode = markElement.parentNode;
      if (pNode) {
        while (markElement.firstChild) {
          pNode.insertBefore(markElement.firstChild, markElement);
        }
        pNode.removeChild(markElement);
        showToast("Removed tagging");
        sel.removeAllRanges();
        handleEditorChange();
        return;
      }
    }
    
    // Handle multiple selected highlights/tags
    if (!sel.isCollapsed) {
      const fragment = range.extractContents();
      const marks = fragment.querySelectorAll("mark.tag-decision, mark.tag-action");
      marks.forEach((m: any) => {
        const p = m.parentNode;
        if (p) {
          while (m.firstChild) p.insertBefore(m.firstChild, m);
          p.removeChild(m);
        }
      });
      const container = document.createElement("span");
      container.appendChild(fragment);
      range.insertNode(container);
      showToast("Cleared selected Decision/Action tags");
      sel.removeAllRanges();
      handleEditorChange();
      return;
    }
    
    showToast("No active Decision or Action tag found at cursor");
  };

  if (currentPage === "start") {
    return (
      <>
        {/* Toast Messages */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-[#C89E5F]/30 text-white text-xs font-semibold py-2 px-5 rounded-full shadow-xl transition-all duration-300 z-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
            {toastMessage}
          </div>
        )}
        <StartPage
          seats={seats}
          setSeats={setSeats}
          participants={participants}
          setParticipants={setParticipants}
          seatingShape={seatingShape}
          setSeatingShape={setSeatingShape}
          gridCols={gridCols}
          setGridCols={setGridCols}
          gridRows={gridRows}
          setGridRows={setGridRows}
          selectedUnseatedId={selectedUnseatedId}
          setSelectedUnseatedId={setSelectedUnseatedId}
          changeSeatCount={changeSeatCount}
          applySeatingTemplate={applySeatingTemplate}
          generateRowsOfSeats={generateRowsOfSeats}
          onSaveSeating={() => {
            setCurrentPage("notes");
            setLeftTab("seating");
            setIsSeatingEditMode(false); // Default to view mode on main notes page
            showToast("Meeting seating plan saved successfully! Entering notes workspace.");
          }}
          showToast={showToast}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans" onMouseMove={handleContainerMouseMove} onMouseUp={handleMouseOrTouchUp} onTouchMove={handleContainerTouchMove} onTouchEnd={handleMouseOrTouchUp}>
      
      {/* Toast Messages */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold py-2 px-5 rounded-full shadow-xl transition-all duration-300 z-50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
          {toastMessage}
        </div>
      )}

      {/* --- Topbar Header (Light scheme, single line) --- */}
      <header className="relative flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 h-14 select-none z-40 shadow-xs">
        
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentPage("start");
              showToast("Returned to Starting Workspace notebook.");
            }}
            className="flex items-center gap-3 hover:opacity-85 transition cursor-pointer group text-left focus:outline-none"
            title="Return to Welcome Notebook Screen"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FAF6EE] border border-[#E9DFCE] text-[#C89E5F] font-serif font-black text-lg shadow-xs group-hover:scale-105 transition-transform duration-150">
              Q
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-[17px] font-bold tracking-tight text-slate-800 group-hover:text-[#C89E5F] transition-colors">QuickMinutes</span>
            </div>
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 mx-2" />
          
          {/* Meeting title and date display */}
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-800 truncate max-w-[150px] md:max-w-[250px]" title={meetingTitle}>
              {meetingTitle}
            </span>
            <span className="text-slate-400 font-normal">
              {getFormattedMeetingDateString()}
            </span>
            <button
              onClick={() => setIsEditingMeta(!isEditingMeta)}
              className="p-1 text-[#C89E5F] hover:text-[#B68D50] transition cursor-pointer"
              title="Customize Heading"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-[#111224] hover:bg-[#1E203F] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition duration-150 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Document
          </button>
        </div>

        {/* Beautiful floating customization modal */}
        {isEditingMeta && (
          <div className="absolute top-15 left-1/3 z-50 bg-white border border-slate-200 text-slate-800 rounded-2xl p-5 shadow-2xl w-96 flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C89E5F]">Customize Heading</span>
              <button onClick={() => setIsEditingMeta(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meeting Title</label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C89E5F] w-full"
                placeholder="Meeting Title"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C89E5F] w-full"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Start</span>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="text-xs text-slate-800 border-none outline-none p-0 bg-transparent w-full min-w-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">End</span>
                  <input
                    type="time"
                    value={meetingEndTime}
                    onChange={(e) => setMeetingEndTime(e.target.value)}
                    className="text-xs text-slate-800 border-none outline-none p-0 bg-transparent w-full min-w-0"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heading Font Size</label>
                <select
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-none"
                >
                  <option value="text-sm">Small (SM)</option>
                  <option value="text-base">Regular (Base)</option>
                  <option value="text-lg">Large (LG)</option>
                  <option value="text-xl">Extra Large (XL)</option>
                  <option value="text-2xl">Title (2XL)</option>
                  <option value="text-3xl">Display (3XL)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heading Text Color</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="w-6 h-6 border-0 rounded cursor-pointer p-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-600 uppercase">{titleColor}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingMeta(false)}
              className="mt-2 text-xs bg-[#C89E5F] text-slate-950 font-bold py-2 rounded-lg hover:bg-amber-400 shadow-sm transition cursor-pointer"
            >
              Save and Close
            </button>
          </div>
        )}
      </header>

      {/* --- Unified Toolbar / Tabs Row --- */}
      <div className="grid grid-cols-1 xl:grid-cols-[repeat(24,minmax(0,1fr))] bg-white border-b border-slate-200 text-slate-700 select-none items-stretch flex-shrink-0 z-30">
        
        {/* Left Section (col-span-9): Participants & Board Seating Tabs */}
        <div className="xl:col-span-9 border-r border-slate-200 flex items-stretch px-5">
          <div className="flex gap-6 h-12">
            <button
              onClick={() => setLeftTab("participants")}
              className={`relative flex items-center gap-1.5 px-1 text-xs font-bold tracking-tight transition cursor-pointer ${leftTab === "participants" ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
            >
              <Users className="w-3.5 h-3.5" /> Participants
              {leftTab === "participants" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#111224] rounded-t-sm" />
              )}
            </button>
            <button
              onClick={() => setLeftTab("seating")}
              className={`relative flex items-center gap-1.5 px-1 text-xs font-bold tracking-tight transition cursor-pointer ${leftTab === "seating" ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
            >
              <Layout className="w-3.5 h-3.5" /> Board Seating
              {leftTab === "seating" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#111224] rounded-t-sm" />
              )}
            </button>
          </div>
        </div>

        {/* Middle Section (Editor Formatting Toolbar) */}
        <div 
          style={{ gridColumn: isRightSectionCollapsed ? "span 15 / span 15" : "span 9 / span 9" }}
          className="border-r border-slate-200 flex flex-col justify-center px-4 relative overflow-hidden"
        >
          <div className="flex items-center w-full h-12 py-1.5 gap-3.5 overflow-x-auto scrollbar-none flex-nowrap">
            
            {/* 1. Quick Annotation Group */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => applyTagToSelection("decision")}
                className="text-xs font-semibold px-3.5 py-1.5 border border-emerald-100 bg-[#ECFDF5] text-[#0F766E] rounded-xl flex items-center gap-1.5 transition cursor-pointer hover:bg-[#D1FADF] hover:border-emerald-200"
                title="Tag selection as a Decision"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                Decision
              </button>
              <button
                onClick={() => applyTagToSelection("action")}
                className="text-xs font-semibold px-3.5 py-1.5 border border-amber-100 bg-[#FFF7ED] text-[#C2410C] rounded-xl flex items-center gap-1.5 transition cursor-pointer hover:bg-[#FFEDD5] hover:border-amber-200"
                title="Tag selection as Action Item"
              >
                <AlertCircle className="w-4 h-4 text-[#C2410C]" />
                Action
              </button>
              <button
                onClick={clearDecisionActionTag}
                className="text-xs font-semibold px-3.5 py-1.5 border border-rose-100 bg-[#FFF5F5] text-[#E11D48] rounded-xl flex items-center gap-1.5 transition cursor-pointer hover:bg-[#FFE4E6] hover:border-rose-200"
                title="Remove tag"
              >
                <Tag className="w-3.5 h-3.5 text-[#E11D48]" />
                Remove Tag
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />

            {/* 2. Bold / Italic */}
            <div className="flex items-center gap-1 px-1 flex-shrink-0">
              <button
                onClick={() => document.execCommand("bold")}
                className="w-8 h-8 flex items-center justify-center font-sans font-bold text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer text-sm"
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => document.execCommand("italic")}
                className="w-8 h-8 flex items-center justify-center font-serif italic text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer text-sm font-bold"
                title="Italic"
              >
                I
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />

            {/* 3. Topic Header, Normal Text & Style Scan */}
            <div className="flex items-center gap-2 px-1 flex-shrink-0">
              <button
                onClick={insertTopicHeader}
                className="text-xs font-semibold px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Insert topic header"
              >
                <span className="text-slate-400 font-mono font-black">#</span> Topic Header
              </button>
              <button
                onClick={convertSelectionToNormalText}
                className="text-xs font-semibold px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Convert block to normal text"
              >
                Normal Text <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={runGrammarStyleCheck}
                className="text-xs font-semibold px-3 py-1.5 border border-[#C89E5F]/30 bg-[#C89E5F]/5 hover:bg-[#C89E5F]/10 text-[#8C6D3F] rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                title="Scan document for writing style improvements and grammar corrections"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C89E5F]" /> Style Scan
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />

            {/* 4. Font Customization */}
            <div className="flex items-center gap-2.5 px-1 flex-shrink-0">
              <div className="relative flex items-center">
                <select
                  value={bodyFontSize}
                  onChange={(e) => setBodyFontSize(parseInt(e.target.value))}
                  className="appearance-none text-xs font-semibold pr-8 pl-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl focus:outline-none cursor-pointer transition shadow-2xs"
                >
                  {[12, 13, 14, 15, 16, 18, 20, 22, 24].map(sz => (
                    <option key={sz} value={sz}>{sz}px</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition overflow-hidden cursor-pointer" title="Font color">
                <input
                  type="color"
                  value={bodyFontColor}
                  onChange={(e) => setBodyFontColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div className="w-4 h-4 rounded shadow-2xs" style={{ backgroundColor: bodyFontColor }} />
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />

            {/* 5. Highlight Colors & Eraser */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Highlight</span>
              <div className="flex gap-1">
                {highlightColors.map(c => (
                  <button
                    key={c}
                    onClick={() => applyTagToSelection("highlight", c)}
                    className="w-4 h-4 rounded-md shadow-2xs border border-slate-200 transform hover:scale-110 active:scale-95 transition cursor-pointer"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={removeHighlight}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg border border-slate-200 bg-white transition cursor-pointer"
                title="Clear Highlight"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 flex-shrink-0" />

            {/* 6. Line Height & Paragraph Spacing */}
            <div className="flex items-center gap-3.5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Line</span>
                <input
                  type="range"
                  min="1.2"
                  max="2.5"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  className="w-14 accent-[#C89E5F] h-1 bg-slate-200 rounded-lg cursor-pointer appearance-none"
                />
                <span className="text-[10px] font-mono text-slate-500 font-bold">{lineHeight}</span>
              </div>

              <div className="flex items-center gap-2 pl-3.5 border-l border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">Gap</span>
                <input
                  type="range"
                  min="8"
                  max="32"
                  step="2"
                  value={paragraphSpacing}
                  onChange={(e) => setParagraphSpacing(e.target.value)}
                  className="w-14 accent-[#C89E5F] h-1 bg-slate-200 rounded-lg cursor-pointer appearance-none"
                />
                <span className="text-[10px] font-mono text-slate-500 font-bold">{paragraphSpacing}px</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section (col-span-6): Slide Reference & Live Translate Tabs */}
        {!isRightSectionCollapsed && (
          <div className="xl:col-span-6 flex items-stretch px-5">
            <div className="flex gap-4 h-12">
              <button
                onClick={() => setRightTab("reference")}
                className={`relative flex items-center gap-1 px-0.5 text-xs font-bold tracking-tight transition cursor-pointer ${rightTab === "reference" ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Slide Reference
                {rightTab === "reference" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C89E5F]" />
                )}
              </button>
              <button
                onClick={() => setRightTab("transcript")}
                className={`relative flex items-center gap-1 px-0.5 text-xs font-bold tracking-tight transition cursor-pointer ${rightTab === "transcript" ? "text-slate-900 font-extrabold" : "text-slate-400 hover:text-slate-700"}`}
              >
                <Mic className="w-3.5 h-3.5" /> Live Translate
                {rightTab === "transcript" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C89E5F]" />
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* --- Main workspace grid layout --- */}
      <div className="grid grid-cols-1 xl:grid-cols-[repeat(24,minmax(0,1fr))] gap-0 flex-1 h-[calc(100vh-104px)] overflow-hidden min-h-0">
        
        {/* --- LEFT ASIDE: Participants & Seating Plan --- */}
        <aside className="xl:col-span-9 bg-white border-r border-slate-200 flex flex-col p-5 h-full overflow-hidden min-h-0">
          
          {/* TAB 1: PARTICIPANTS */}
          {leftTab === "participants" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pr-1 mb-4">
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-4 mt-1 border-b border-slate-100 pb-2.5">
                  <h3 className="font-sans font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
                    ACTIVE ATTENDEES
                  </h3>
                </div>
                
                {/* Scrollable list of active attendees */}
                <div className="grid grid-cols-2 gap-3 content-start overflow-y-auto flex-1 pr-1 min-h-0">
                  {participants.map(person => (
                    <div
                      key={person.id}
                      draggable={editingParticipantId !== person.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("participantId", person.id.toString());
                      }}
                      onClick={() => {
                        if (editingParticipantId !== person.id) {
                          insertSpeakerTag(person);
                        }
                      }}
                      className={`group relative border border-slate-200 bg-white hover:bg-[#C89E5F]/5 hover:border-[#C89E5F]/30 rounded-2xl p-3 px-3.5 transition flex items-center gap-3 cursor-pointer select-none shadow-xs ${selectedUnseatedId === person.id ? "ring-2 ring-[#C89E5F] bg-[#C89E5F]/5" : ""}`}
                      title="Drag this person to a boardroom seat or click card to insert speaker tag in notes!"
                    >
                      {/* Sticker in its own shape, not cut in circle */}
                      <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
                        <img
                          src={getAvatarForPerson(person.id)}
                          alt={person.name}
                          className="w-12 h-10 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {/* Colored dot in corner of avatar for organization color coding */}
                        <span className="absolute bottom-0 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: person.color }}></span>
                      </div>
                      
                      {editingParticipantId === person.id ? (
                        <div className="flex-1 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded p-1 font-semibold"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editOrg}
                            onChange={(e) => setEditOrg(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded p-1"
                            placeholder="Organisation"
                          />
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded p-1"
                            placeholder="Role / Title"
                          />
                          <div className="flex items-center gap-1.5 mt-1">
                            {["#0F766E", "#C2410C", "#1D4ED8", "#7C3AED", "#DB2777", "#2563EB", "#059669", "#475569"].map(c => (
                              <button
                                key={c}
                                onClick={() => setEditColor(c)}
                                className={`w-4 h-4 rounded-full border ${editColor === c ? "ring-1 ring-teal-500 scale-110" : "opacity-70"}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-end gap-1.5 mt-2">
                            <button
                              onClick={() => setEditingParticipantId(null)}
                              className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveParticipantEdit}
                              className="text-[10px] bg-teal-700 text-white font-semibold px-2.5 py-0.5 hover:bg-teal-800 rounded"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-slate-800 truncate block">
                              {person.name}
                            </span>
                            {person.isPlaceholder && (
                              <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded-full font-mono uppercase">Temp</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-1 font-medium">
                            {person.org} {person.title && ` · ${person.title}`}
                          </p>
                        </div>
                      )}
 
                      {editingParticipantId !== person.id && (
                        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => triggerEditParticipant(person)}
                            className="p-1 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded shadow-xs"
                            title="Edit participant"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteParticipant(person.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded shadow-xs"
                            title="Delete participant"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEATING CHART */}
          {leftTab === "seating" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 mb-4">
              <div>
                {/* View / Edit Mode Toggle Button */}
                <div className="flex items-center justify-between mb-4 mt-1 border-b border-slate-100 pb-2.5">
                  <h3 className="font-sans font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">BOARD MODE</h3>
                  <button
                    onClick={() => {
                      setIsSeatingEditMode(!isSeatingEditMode);
                      setSelectedUnseatedId(null);
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition duration-150 cursor-pointer ${isSeatingEditMode ? "bg-[#C89E5F] text-slate-950 hover:bg-[#E0B87A]" : "bg-[#111224] text-white hover:bg-[#1E203F]"}`}
                  >
                    {isSeatingEditMode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" /> Save Layout
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3.5 h-3.5 text-white" /> Edit Seating
                      </>
                    )}
                  </button>
                </div>

                {/* Seating Layout Controls (Edit Mode Only) */}
                {isSeatingEditMode && (
                  <div className="space-y-3 mb-4 animate-fade-in">
                    {/* Total Seats count slider/input */}
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Room Capacity</span>
                        <span className="text-[11px] text-slate-400 font-medium">Number of chairs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={seats.length}
                          onChange={(e) => changeSeatCount(parseInt(e.target.value) || 1)}
                          className="w-14 text-center text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    {/* Presets and template buttons */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Table Shape</span>
                      <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          onClick={() => applySeatingTemplate("round")}
                          className={`text-[10px] px-2.5 py-1 rounded-md transition font-semibold ${seatingShape === "round" ? "bg-white text-[#C89E5F] shadow-sm font-bold border border-[#C89E5F]/10" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          ◯ Round
                        </button>
                        <button
                          onClick={() => applySeatingTemplate("rect")}
                          className={`text-[10px] px-2.5 py-1 rounded-md transition font-semibold ${seatingShape === "rect" ? "bg-white text-[#C89E5F] shadow-sm font-bold border border-[#C89E5F]/10" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          ▭ Rect
                        </button>
                        <button
                          onClick={() => applySeatingTemplate("rows")}
                          className={`text-[10px] px-2.5 py-1 rounded-md transition font-semibold ${seatingShape === "rows" ? "bg-white text-[#C89E5F] shadow-sm font-bold border border-[#C89E5F]/10" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          ▤ Rows
                        </button>
                      </div>
                    </div>

                    {/* Row Generator Layout (Cols x Rows) */}
                    {seatingShape === "rows" && (
                      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">Row Grid Matrix</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-slate-400 font-bold">Cols:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={gridCols}
                              onChange={(e) => setGridCols(parseInt(e.target.value) || 1)}
                              className="w-full text-xs font-bold text-slate-700 focus:outline-none"
                            />
                          </div>
                          <span className="text-slate-400 text-xs font-bold">×</span>
                          <div className="flex-1 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                            <span className="text-[10px] text-slate-400 font-bold">Rows:</span>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={gridRows}
                              onChange={(e) => setGridRows(parseInt(e.target.value) || 1)}
                              className="w-full text-xs font-bold text-slate-700 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => generateRowsOfSeats(gridCols, gridRows)}
                            className="bg-slate-800 hover:bg-slate-950 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shrink-0 transition"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Seating Grid Canvas */}
                <div
                  ref={canvasRef}
                  className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner border border-slate-800"
                >
                  <div className="absolute inset-4 rounded-xl border border-dashed border-slate-800/60 flex items-center justify-center">
                    {seatingShape === "round" && (
                      <div className="w-1/2 h-1/2 rounded-full bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                        Round Table
                      </div>
                    )}
                    {seatingShape === "rect" && (
                      <div className="w-2/3 h-1/3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold tracking-wider uppercase">
                        Conference Table
                      </div>
                    )}
                    {seatingShape === "rows" && (
                      <div className="w-4/5 h-8 rounded bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold uppercase tracking-widest absolute top-2">
                        Front / Screen Area
                      </div>
                    )}
                  </div>

                  {/* Rendering Seats */}
                  {seats.map((seat) => {
                    const person = participants.find(p => p.id === seat.participantId);
                    return (
                      <div
                        key={seat.id}
                        onMouseDown={(e) => handleSeatMouseDown(e, seat.id)}
                        onTouchStart={(e) => handleSeatTouchStart(e, seat.id)}
                        onClick={() => handleSeatClick(seat.id)}
                        onDragOver={(e) => {
                          if (isSeatingEditMode) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          if (!isSeatingEditMode) return;
                          e.preventDefault();
                          const pId = parseInt(e.dataTransfer.getData("participantId"));
                          if (pId) {
                            setSeats(prev => prev.map(s => {
                              if (s.participantId === pId) return { ...s, participantId: null };
                              if (s.id === seat.id) return { ...s, participantId: pId };
                              return s;
                            }));
                            showToast(`Assigned participant to seat #${seat.id}`);
                          }
                        }}
                        style={{
                          left: `${seat.x}%`,
                          top: `${seat.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute select-none transition-all hover:shadow-lg hover:scale-105 group ${isSeatingEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${!person ? "w-10 h-10 rounded-full border-2 border-dashed border-slate-600 bg-slate-900/80 flex items-center justify-center text-[11px] text-slate-500 font-extrabold border-slate-900" : "w-12 h-12 flex items-center justify-center"}`}
                        title={person ? `${person.name} (${person.org})` : `Empty Chair #${seat.id}`}
                      >
                        {person ? (
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            {/* Sticker image in its own shape, not cut in circle */}
                            <img
                              src={getAvatarForPerson(person.id)}
                              alt={person.name}
                              className="w-12 h-12 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {/* Seated Indicator Colored Dot */}
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 shadow-sm" style={{ backgroundColor: person.color }}></span>
                            
                            {/* Short name form (e.g. PA, DF) as small text below image */}
                            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[8px] font-mono font-black text-slate-300 bg-slate-950/85 px-1 py-0.2 rounded border border-slate-800/40 shadow-xs whitespace-nowrap z-10 uppercase tracking-tight">
                              {person.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          `#${seat.id}`
                        )}
                        {isSeatingEditMode && person && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, participantId: null } : s));
                              showToast(`Removed ${person.name} from seat #${seat.id}`);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md border border-slate-950 transition-opacity opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                            title={`Remove ${person.name} from seat`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick Hint */}
                <p className="text-[9px] text-slate-400 mt-2 text-center leading-relaxed font-medium">
                  {!isSeatingEditMode 
                    ? "👉 Currently in VIEW MODE. Click any participant bubble to insert speaker text in notes."
                    : "👉 Currently in EDIT MODE. Hold & drag seats, or drag participant cards directly onto circles."}
                </p>
              </div>

              {/* Seating Placement Binder Drawer (Only shown in Edit Seating Mode) */}
              {isSeatingEditMode && (
                <div className="border-t border-slate-100 pt-3 mt-4 animate-fade-in">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1.5">Unseated Attendees</span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {participants.filter(p => !seats.some(s => s.participantId === p.id)).map(person => (
                      <button
                        key={person.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("participantId", person.id.toString());
                        }}
                        onClick={() => setSelectedUnseatedId(selectedUnseatedId === person.id ? null : person.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 text-left transition select-none cursor-grab ${selectedUnseatedId === person.id ? "bg-[#111224] border-[#111224] text-white font-semibold" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}
                      >
                        <div className="w-6 h-5 flex items-center justify-center relative shrink-0">
                          <img src={getAvatarForPerson(person.id)} className="w-6 h-5 object-contain" referrerPolicy="no-referrer" />
                        </div>
                        {person.name}
                      </button>
                    ))}
                    {participants.filter(p => !seats.some(s => s.participantId === p.id)).length === 0 && (
                      <span className="text-[10px] text-slate-400 italic p-1.5">All attendees are currently seated.</span>
                    )}
                  </div>
                  {selectedUnseatedId && (
                    <p className="text-[10px] text-[#8E6D38] mt-1.5 animate-pulse font-bold">
                      👉 Click any seat in the courtroom above to place them!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STICKY BOTTOM Add New Participant Form (Outside of conditional blocks) */}
          <div 
            onMouseEnter={() => {
              isMouseOverCreateParticipantRef.current = true;
              setIsCreateParticipantExpanded(true);
            }}
            onMouseLeave={() => {
              isMouseOverCreateParticipantRef.current = false;
              if (!isCreateInputFocusedRef.current) {
                setIsCreateParticipantExpanded(false);
              }
            }}
            onFocus={() => {
              isCreateInputFocusedRef.current = true;
            }}
            onBlur={(e) => {
              const currentTarget = e.currentTarget;
              setTimeout(() => {
                if (!currentTarget.contains(document.activeElement)) {
                  isCreateInputFocusedRef.current = false;
                  if (!isMouseOverCreateParticipantRef.current) {
                    setIsCreateParticipantExpanded(false);
                  }
                }
              }, 50);
            }}
            className="border-t border-slate-200 pt-4 bg-white shrink-0 flex flex-col mt-auto"
          >
            <button
              onClick={() => setIsCreateParticipantExpanded(!isCreateParticipantExpanded)}
              className="w-full flex items-center justify-between text-left transition pb-1.5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Plus className="w-4 h-4 text-slate-900" /> Create Participant
              </span>
              {isCreateParticipantExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isCreateParticipantExpanded && (
              <div className="space-y-1.5 mt-3 animate-fade-in">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#C89E5F]"
                />
                <input
                  type="text"
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  placeholder="Organisation"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#C89E5F]"
                />
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title / Role"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white focus:border-[#C89E5F]"
                />
                <button
                  onClick={addNewParticipant}
                  className="w-full bg-[#111224] text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-[#1E203F] transition shadow-xs cursor-pointer"
                >
                  + Add to Meeting
                </button>
              </div>
            )}
          </div>

        </aside>

        {/* --- CENTER AREA: Plain Blank Meeting Minutes Editor --- */}
        <main 
          style={{ gridColumn: isRightSectionCollapsed ? "span 15 / span 15" : "span 9 / span 9" }}
          className="bg-[#FAF9F6] flex flex-col p-6 border-r border-slate-200 h-full overflow-hidden min-h-0 relative"
        >
          
          {/* Collapse/Expand Toggle Button for the Right Sidebar */}
          <button
            onClick={() => setIsRightSectionCollapsed(!isRightSectionCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-14 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#C89E5F] shadow-lg border border-slate-200 border-r-0 rounded-l-2xl flex items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95"
            title={isRightSectionCollapsed ? "Expand Right Section" : "Collapse Right Section"}
          >
            {isRightSectionCollapsed ? (
              <ChevronLeft className="w-5 h-5 animate-pulse" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          
          {/* Spacing styles applied via class */}

          {/* Render editor spacing tag dynamically based on sliders */}
          <style dangerouslySetInnerHTML={{ __html: `
            #minutes-editor-canvas p {
              margin-bottom: ${paragraphSpacing}px !important;
            }
          ` }} />

          {/* --- Requirement 1: Blank pristine workspace canvas sheet (No lined paper) --- */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm p-10 flex flex-col overflow-y-auto relative">
            <div
              ref={editorRef}
              id="minutes-editor-canvas"
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorChange}
              onKeyUp={handleEditorChange}
              onBlur={handleEditorChange}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const rewriteSpan = target.closest(".suggested-rewrite");
                if (rewriteSpan) {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const rect = rewriteSpan.getBoundingClientRect();
                  const original = rewriteSpan.getAttribute("data-original") || rewriteSpan.textContent || "";
                  const suggested = rewriteSpan.getAttribute("data-suggested") || "";
                  
                  setActiveSuggestion({
                    original,
                    suggested,
                    element: rewriteSpan as HTMLSpanElement,
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 6,
                  });
                } else {
                  setActiveSuggestion(null);
                }
              }}
              style={{
                lineHeight: lineHeight,
                outline: "none",
                fontSize: `${bodyFontSize}px`,
                color: bodyFontColor,
                fontStyle: "normal"
              }}
              className="flex-1 prose max-w-none h-full min-h-[400px] select-text text-black"
            />
            {editorIsEmpty && (
              <div className="absolute top-10 left-10 right-10 text-slate-400 italic pointer-events-none select-none leading-relaxed">
                Start typing your notes here, double click text or make a selection to highlight, or tag Decisions and Actions! You can also click participant names on the left to quickly record spoken statements...
              </div>
            )}
          </div>

          {/* Bottom live stats summary bar */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500 font-medium border-t border-slate-100 pt-3">
            <button
              onClick={() => setShowSummaryPanel(true)}
              className="border border-[#10B981]/30 bg-[#10B981]/5 text-[#0F766E] font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#10B981]/10 transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Open the summary list panel of all marked Decisions and Action Items"
            >
              <FileText className="w-4 h-4 text-[#0F766E]/80" /> View Decisions & Actions Summary
            </button>
          </div>

        </main>

        {/* --- RIGHT ASIDE: References Deck & Live Transcripts --- */}
        {!isRightSectionCollapsed && (
          <aside className="xl:col-span-6 bg-white border-l border-slate-200 flex flex-col p-5 h-full overflow-hidden min-h-0">
          
          {/* TAB 1: PRESENTATION REFERENCE MATERIALS */}
          {rightTab === "reference" && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex items-center justify-between mb-4 mt-1 border-b border-slate-100 pb-2.5">
                <h3 className="font-sans font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
                  SUPPORTING DECKS
                </h3>
              </div>
              
              {/* Supporting material dropdown selection */}
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 bg-white hover:border-slate-300 focus:outline-none mb-3 font-semibold shadow-xs"
              >
                <option value="none">No Supporting Deck Selected</option>
                {[...REFERENCE_DECKS, ...customDecks].map(deck => (
                  <option key={deck.id} value={deck.id}>
                    📖 {deck.name}
                  </option>
                ))}
              </select>

              {/* Upload Reference Material Device Input */}
              <div className="mb-4">
                <label className="border border-dashed border-[#C89E5F] bg-[#C89E5F]/5 text-[#C89E5F] hover:bg-[#C89E5F]/10 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold transition w-full shadow-xs">
                  <Upload className="w-4 h-4 text-[#C89E5F]" /> Upload Device Material
                  <input
                    type="file"
                    accept="image/*,text/*,.md,.json,.csv,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                </label>
              </div>

              {activeDeck ? (
                <>
                  <p className="text-[10px] text-slate-400 mb-3.5 leading-relaxed font-medium">
                    🎯 <strong>Reference Mode:</strong> Click any slide below to zoom in/out. Use the plus <span className="text-teal-700 font-bold">+</span> button on the right of any slide to quickly insert its reference tag (e.g. <code>(Slide #{activeDeck.slides[0]?.pageNum || 1})</code>) into your editor.
                  </p>

                  {/* Scrollable Materials List */}
                  <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    {activeDeck.isPDF ? (
                      /* Specialized PDF rendering as visual page cards */
                      <div className="flex flex-col gap-6 py-1">
                        <div className="text-lg font-bold text-slate-500 font-sans tracking-tight border-b border-slate-100 pb-2">
                          {activeDeck.name.replace(/^[📕📁]\s*/, "")}
                        </div>
                        {activeDeck.slides.map(slide => (
                          <div key={slide.id} className="flex flex-col items-center w-full">
                            {/* Gray container resembling screenshot */}
                            <div
                              onClick={() => handleSlideClick(slide)}
                              className="w-full bg-[#E5E7EB] hover:bg-[#D1D5DB] transition rounded-2xl p-4 shadow-sm cursor-zoom-in relative group flex items-center justify-center border border-slate-200"
                            >
                              {/* Inner White Page Container containing rendered PDF slide image */}
                              <div className="w-full bg-white rounded-lg overflow-hidden shadow-xs border border-slate-100/60 aspect-[4/3] flex items-center justify-center">
                                {slide.imageSrc ? (
                                  <img
                                    src={slide.imageSrc}
                                    alt={slide.title}
                                    className="w-full h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="text-xs text-slate-400 font-mono font-bold">Page {slide.pageNum}</div>
                                )}
                              </div>

                              {/* Quick Insert reference hover button */}
                              <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition duration-200">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertSlideReference(slide);
                                  }}
                                  className="p-1.5 bg-teal-700 hover:bg-teal-850 text-white rounded-lg shadow-md transition transform hover:scale-110"
                                  title="Insert reference citation tag"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Page number badge beneath card */}
                            <div className="mt-2 text-center">
                              <span className="inline-block bg-[#E5E7EB] text-slate-800 text-[13px] font-bold px-3 py-1 rounded-md min-w-[28px] text-center shadow-xs">
                                {slide.pageNum}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Standard non-PDF visual slide decks (like Roadmap) */
                      activeDeck.slides.map(slide => (
                        <div
                          key={slide.id}
                          onClick={() => handleSlideClick(slide)}
                          className="group border border-slate-200 bg-white hover:bg-slate-50 hover:border-teal-400 rounded-xl p-3.5 shadow-sm cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0 text-left relative"
                          title="Click slide to zoom in or out!"
                        >
                          {/* Visual Slide Image Preview */}
                          {slide.imageSrc && (
                            <div className="w-full h-24 mb-2.5 rounded-lg bg-slate-100 overflow-hidden border border-slate-200/60 shadow-inner">
                              <img 
                                src={slide.imageSrc} 
                                alt={slide.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                          )}

                          {/* Visual Slide PDF Preview */}
                          {slide.pdfUrl && (
                            <div className="w-full h-44 mb-2.5 rounded-lg bg-slate-50 overflow-hidden border border-slate-200 shadow-inner relative group/pdf">
                              <iframe 
                                src={`${slide.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                                title={slide.title} 
                                className="w-full h-full border-none pointer-events-none bg-slate-100" 
                              />
                              <div className="absolute inset-0 bg-transparent flex items-center justify-center group-hover/pdf:bg-slate-900/20 transition duration-300">
                                <span className="bg-slate-900/80 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover/pdf:opacity-100 transition duration-300 shadow-md">
                                  Click to Zoom PDF
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-extrabold uppercase">
                              Slide #{slide.pageNum}
                            </span>
                            <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-teal-700 transition" />
                          </div>

                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-950 truncate mb-1 pr-8">
                            {slide.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mb-2 pr-8 font-medium">
                            {slide.summary}
                          </p>

                          {slide.bullets && slide.bullets.length > 0 && (
                            <ul className="text-[9px] text-slate-400 space-y-0.5 list-disc pl-3 pr-8 mb-2">
                              {slide.bullets.slice(0, 2).map((b, i) => (
                                <li key={i} className="truncate">{b}</li>
                              ))}
                            </ul>
                          )}

                          {/* Explicit insert button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid zooming
                              insertSlideReference(slide);
                            }}
                            className="absolute right-3.5 bottom-3.5 p-1.5 bg-teal-50 hover:bg-teal-700 text-teal-800 hover:text-white rounded-lg transition shadow-xs border border-teal-100"
                            title="Insert reference (Slide #X) into notes"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-14 h-14 rounded-2xl bg-[#F1F3F5] text-slate-400 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 mb-2">No Supporting Deck Selected</p>
                  <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed font-medium">
                    Choose an executive roadmap or architectural specifications deck from the dropdown, or upload a custom document.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE TRANSCRIPT WITH LANGUAGES & TRANSLATIONS */}
          {rightTab === "transcript" && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 mt-1 border-b border-slate-100 pb-2.5">
                  <h3 className="font-sans font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
                    AUDIO TRANSLATION HELPER
                  </h3>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="flex-1 text-xs text-slate-700 border border-slate-300 rounded-lg p-2 bg-white focus:outline-none"
                    >
                      {LANGUAGE_CODES.map(l => (
                        <option key={l.code} value={l.code}>
                          {l.display}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speech & Sim controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleSpeechRecognition}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold shadow-sm transition ${isListening ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-[#111224] hover:bg-[#1E203F] text-white"}`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" /> Stop Voice
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" /> Mic Input
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => document.getElementById("audio-upload-input")?.click()}
                      disabled={isTranscribing}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold border shadow-sm transition ${isTranscribing ? "bg-amber-100 border-amber-300 text-amber-800 animate-pulse cursor-not-allowed" : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"}`}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      {isTranscribing ? "Transcribing..." : "Upload Audio"}
                    </button>
                    <input
                      type="file"
                      accept="audio/*"
                      id="audio-upload-input"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Transcripts Stream list - Continuous timeline with floating context menu */}
                <div 
                  className="flex-1 overflow-y-auto border border-slate-200 bg-white rounded-xl p-4 min-h-[180px] relative select-text"
                  onMouseUp={handleTranscriptSelection}
                  onTouchEnd={handleTranscriptSelection}
                >
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                    {transcripts.map(item => (
                      <div key={item.id} className="relative group/line">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-[#C89E5F] shadow-xs flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        {/* Hover action buttons for individual line */}
                        <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-opacity duration-200 bg-white/95 shadow-xs rounded-lg p-0.5 border border-slate-200 z-10">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.translatedText);
                              setCopiedId(item.id);
                              showToast("Copied translated text!");
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                            title="Copy translation"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => {
                              insertTranscriptIntoNotes(item);
                            }}
                            className="p-1 hover:bg-[#111224]/5 text-slate-500 hover:text-[#111224] rounded transition cursor-pointer"
                            title="Insert into notes"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Speaker & metadata header */}
                        <div className="flex items-center gap-2 flex-wrap mb-1 pr-14">
                          {editingSpeakerId === item.id ? (
                            <select
                              value={item.speaker}
                              onChange={(e) => {
                                const newSpk = e.target.value;
                                if (newSpk === "custom-input") {
                                  const customName = prompt("Enter custom speaker name:");
                                  if (customName && customName.trim()) {
                                    setTranscripts(prev => prev.map(t => t.id === item.id ? { ...t, speaker: customName.trim() } : t));
                                    showToast(`Speaker assigned: ${customName.trim()}`);
                                  }
                                } else {
                                  setTranscripts(prev => prev.map(t => t.id === item.id ? { ...t, speaker: newSpk } : t));
                                  showToast(`Speaker assigned: ${newSpk}`);
                                }
                                setEditingSpeakerId(null);
                              }}
                              onBlur={() => setEditingSpeakerId(null)}
                              className="text-xs font-bold text-[#8E6D38] bg-[#C89E5F]/10 border border-[#C89E5F]/20 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                              autoFocus
                            >
                              <option value="Unknown Speaker">Unknown Speaker</option>
                              {participants.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                              <option value="custom-input">✍️ Custom Name...</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingSpeakerId(item.id)}
                              className="text-xs font-bold text-slate-800 hover:text-[#111224] hover:bg-[#111224]/5 rounded px-1 py-0.5 transition flex items-center gap-1 cursor-pointer"
                              title="Click to assign or rename speaker"
                            >
                              {item.speaker}
                              <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/line:opacity-100 transition-opacity" />
                            </button>
                          )}
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-semibold">
                            {item.lang}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 font-medium">
                            {item.timestamp}
                          </span>
                        </div>

                        {/* Speech Content */}
                        <div className="space-y-1">
                          {item.lang === "English" ? (
                            <p className="text-xs text-slate-800 leading-relaxed font-medium">
                              {item.originalText}
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                {item.translatedText}
                              </p>
                              <p className="text-[10px] text-slate-400 italic font-medium">
                                "{item.originalText}"
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {liveMicDraft && (
                      <div className="relative group/line animate-pulse">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-[#C89E5F] shadow-xs flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        </div>

                        {/* Speaker & metadata header */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-800">You (Speaking...)</span>
                          <span className="text-[9px] font-mono text-[#8E6D38] bg-[#C89E5F]/10 px-1.5 py-0.5 rounded-md font-semibold">
                            Drafting Sentence
                          </span>
                        </div>

                        {/* Speech Content */}
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 italic leading-relaxed font-medium">
                            "{liveMicDraft}"
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {transcripts.length === 0 && !liveMicDraft && (
                      <div className="text-center py-10 text-[11px] text-slate-400 italic -ml-6">
                        No speech lines recorded. Talk into microphone or upload an audio file!
                      </div>
                    )}
                  </div>

                  {/* Floating Action Popover for Selected Text */}
                  {selectedTranscriptText && (
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between gap-3 animate-fade-in z-20 backdrop-blur-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-mono text-teal-400 font-extrabold uppercase block mb-0.5">Selected Transcript Text:</span>
                        <p className="text-[10px] truncate italic text-slate-200">"{selectedTranscriptText}"</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTranscriptText);
                            showToast("Copied selection to clipboard!");
                            window.getSelection()?.removeAllRanges();
                            setSelectedTranscriptText("");
                          }}
                          className="text-[10px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            const block = ` "${selectedTranscriptText}" `;
                            insertHTMLAtCursor(block);
                            showToast("Inserted selected quote into notes!");
                            window.getSelection()?.removeAllRanges();
                            setSelectedTranscriptText("");
                          }}
                          className="text-[10px] font-bold bg-[#111224] text-white hover:bg-[#1E203F] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Insert Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          </aside>
        )}

      </div>

      {/* --- DECISIONS & ACTION ITEMS SUMMARY SIDE PANEL --- */}
      {showSummaryPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowSummaryPanel(false)}
          />
          
          {/* Slide-out Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-slide-in-right">
            
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700 animate-pulse" />
                <h3 className="font-display font-bold text-sm text-slate-800 uppercase tracking-wider">
                  Minutes Summary
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryPanel(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Decisions list */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Decisions ({decisions.length})
                    </h4>
                  </div>
                  {decisions.length > 0 && (
                    <button
                      onClick={() => {
                        const text = decisions.join("\n");
                        navigator.clipboard.writeText(text);
                        showToast("Copied all decisions!");
                      }}
                      className="text-[10px] text-teal-700 hover:underline font-bold flex items-center gap-0.5"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy All
                    </button>
                  )}
                </div>
                
                {decisions.length > 0 ? (
                  <div className="space-y-2.5">
                    {decisions.map((dec, idx) => (
                      <div key={idx} className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed relative group">
                        <span className="font-extrabold text-emerald-800 mr-1">Decision #{idx + 1}:</span>
                        {dec}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(dec);
                              showToast("Copied decision to clipboard!");
                            }}
                            className="p-1 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700"
                            title="Copy single item"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No decisions marked yet. Use formatting bar or tag selection in editor.
                  </p>
                )}
              </div>

              {/* Action Items list */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Action Items ({actions.length})
                    </h4>
                  </div>
                  {actions.length > 0 && (
                    <button
                      onClick={() => {
                        const text = actions.join("\n");
                        navigator.clipboard.writeText(text);
                        showToast("Copied all actions!");
                      }}
                      className="text-[10px] text-teal-700 hover:underline font-bold flex items-center gap-0.5"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy All
                    </button>
                  )}
                </div>
                
                {actions.length > 0 ? (
                  <div className="space-y-2.5">
                    {actions.map((act, idx) => (
                      <div key={idx} className="bg-orange-50/30 border border-orange-100 rounded-xl p-3 text-xs text-orange-900 leading-relaxed relative group">
                        <span className="font-extrabold text-orange-800 mr-1">Action #{idx + 1}:</span>
                        {act}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(act);
                              showToast("Copied action to clipboard!");
                            }}
                            className="p-1 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700"
                            title="Copy single item"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No action items marked yet. Highlight and tag text in editor.
                  </p>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-[9px] text-[#9B958B] leading-snug font-medium max-w-[200px]">
                💡 <strong>Tip:</strong> Double click any text in the editor to instantly highlight or tag.
              </p>
              <button
                onClick={() => setShowSummaryPanel(false)}
                className="bg-slate-850 hover:bg-slate-950 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Dismiss Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- EXPORT PREVIEW MODAL --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-serif font-bold text-lg text-slate-900">Document Export Preview</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              <div
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-xl mx-auto"
                dangerouslySetInnerHTML={{ __html: buildDocPreviewHTML() }}
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 italic">
                  Selected template:
                </span>
                <div className="relative flex items-center">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="appearance-none text-xs font-semibold pr-8 pl-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl focus:outline-none transition cursor-pointer"
                  >
                    <option value="default">Default Corporate Layout</option>
                    <option value="acme">Acme Client Blueprint</option>
                    <option value="standup">Agile Daily Standup</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    showToast("Downloaded minutes as .docx format successfully!");
                    setShowExportModal(false);
                  }}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs py-2 px-4 rounded-lg"
                >
                  Download DOCX
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- SLIDE ZOOM / REFERENCE DETAIL PREVIEW MODAL --- */}
      {zoomedSlide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded font-extrabold uppercase">
                  Slide #{zoomedSlide.pageNum}
                </span>
                <h3 className="font-serif font-bold text-base text-slate-900 truncate max-w-md">
                  {zoomedSlide.title}
                </h3>
              </div>
              <button
                onClick={() => setZoomedSlide(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition font-bold text-sm w-7 h-7 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {zoomedSlide.imageSrc ? (
                <div className="w-full max-h-[60vh] flex items-center justify-center rounded-xl overflow-hidden border border-slate-250 bg-slate-50 p-2 shadow-sm">
                  <img
                    src={zoomedSlide.imageSrc}
                    alt={zoomedSlide.title}
                    className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : zoomedSlide.pdfUrl ? (
                <div className="w-full h-[55vh] border rounded-xl overflow-hidden shadow-inner bg-slate-100">
                  <iframe
                    src={zoomedSlide.pdfUrl}
                    title={zoomedSlide.title}
                    className="w-full h-full border-none"
                  />
                </div>
              ) : null}

              {/* Text content details */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slide Summary</h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {zoomedSlide.summary}
                </p>

                {zoomedSlide.bullets && zoomedSlide.bullets.length > 0 && (
                  <div className="pt-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Highlights & Details</h5>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-medium">
                      {zoomedSlide.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 rounded-b-2xl">
              <span className="text-[11px] text-slate-500 font-medium">
                Click "Insert Reference Tag" to place a citation in your editor.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomedSlide(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    insertSlideReference(zoomedSlide);
                    setZoomedSlide(null);
                  }}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs py-2 px-4 rounded-lg transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Insert Reference Tag
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- SPEAKER TAG UPDATE CONFIRMATION MODAL --- */}
      {pendingUpdateTags && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl border border-slate-200 p-6 animate-fade-in">
            <h3 className="font-serif font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <HelpCircle className="w-5 h-5" />
              </span>
              Update Previous Tags?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              You changed the details for <span className="font-semibold text-slate-800">"{pendingUpdateTags.oldName}"</span> to <span className="font-semibold text-slate-800">"{pendingUpdateTags.newName}"</span>. 
              We found matching speaker tags in your notes.
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-lg mb-6">
              Would you like to automatically update all previous <span className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded text-amber-700">"{pendingUpdateTags.oldName}"</span> tags in your notes to <span className="font-mono text-[11px] bg-white border px-1 py-0.5 rounded text-teal-700">"{pendingUpdateTags.newName}"</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => handleConfirmUpdateTags(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
              >
                No, keep original tags
              </button>
              <button
                onClick={() => handleConfirmUpdateTags(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs py-2 px-4 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                Yes, update all tags
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Floating Suggested Rewrite Popup */}
      {activeSuggestion && (
        <div
          style={{
            position: "fixed",
            left: `${activeSuggestion.x}px`,
            top: `${activeSuggestion.y}px`,
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
          className="suggestion-popup-container bg-[#1E222B] text-white rounded-2xl p-5 shadow-2xl border border-slate-700/80 w-80 max-w-sm space-y-3 animate-in fade-in zoom-in duration-150"
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold text-[#34D399] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Suggested Rewrite
          </div>

          {/* Suggested text */}
          <p className="text-sm font-bold text-white leading-relaxed">
            {activeSuggestion.suggested}
          </p>

          {/* Explanation from preset */}
          {activeSuggestion.element.getAttribute("data-explanation") && (
            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-2 font-medium">
              {activeSuggestion.element.getAttribute("data-explanation")}
            </p>
          )}

          {/* Accept / Dismiss Buttons */}
          <div className="flex items-center gap-2 pt-1.5 justify-end">
            <button
              onClick={() => {
                const span = activeSuggestion.element;
                const parent = span.parentNode;
                if (parent) {
                  // Replace span with suggested text node
                  const textNode = document.createTextNode(activeSuggestion.suggested);
                  span.replaceWith(textNode);
                  parent.normalize();
                }
                showToast("Rewrite suggestion applied successfully!");
                setActiveSuggestion(null);
                handleEditorChange();
              }}
              className="bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs px-4.5 py-2 rounded-xl transition duration-150 cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => {
                const span = activeSuggestion.element;
                const parent = span.parentNode;
                if (parent) {
                  // Revert span to its original text content, removing formatting
                  const textNode = document.createTextNode(span.textContent || "");
                  span.replaceWith(textNode);
                  parent.normalize();
                }
                setActiveSuggestion(null);
                handleEditorChange();
              }}
              className="bg-[#374151] hover:bg-[#4B5563] text-slate-200 font-bold text-xs px-4.5 py-2 rounded-xl transition duration-150 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}


      {/* Floating Help Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            showToast("Need help? Click on supporting slide decks to zoom and reference, drag and drop attendees to seat them, or double click words to apply tags.");
          }}
          className="w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-md rounded-full flex items-center justify-center font-bold text-sm cursor-pointer transition transform hover:scale-110"
          title="Get Help & Guidelines"
        >
          <HelpCircle className="w-5 h-5 text-slate-500" />
        </button>
      </div>

    </div>
  );
}
