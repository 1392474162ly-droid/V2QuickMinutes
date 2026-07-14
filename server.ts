import express from "express";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: any = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Translation API will run in simulation/fallback mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // API Route to download the entire application as a clean ZIP
  app.get("/api/download-app", (req, res) => {
    try {
      const zip = new AdmZip();
      const workspaceRoot = process.cwd();
      
      const filesToInclude = [
        "package.json",
        "index.html",
        "server.ts",
        "tsconfig.json",
        "vite.config.ts",
        "metadata.json",
        ".env.example",
        ".gitignore"
      ];
      
      // Add root level configuration files
      filesToInclude.forEach(file => {
        const filePath = path.join(workspaceRoot, file);
        if (fs.existsSync(filePath)) {
          zip.addLocalFile(filePath);
        }
      });
      
      // Add src directory recursively
      const srcPath = path.join(workspaceRoot, "src");
      if (fs.existsSync(srcPath)) {
        zip.addLocalFolder(srcPath, "src");
      }
      
      // Add assets directory recursively if exists
      const assetsPath = path.join(workspaceRoot, "assets");
      if (fs.existsSync(assetsPath)) {
        zip.addLocalFolder(assetsPath, "assets");
      }

      const zipBuffer = zip.toBuffer();
      
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=QuickMinutes-App.zip");
      res.send(zipBuffer);
    } catch (error: any) {
      console.error("ZIP Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate app download ZIP" });
    }
  });

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

  // Free Google Translate API proxy fallback (no auth key required, highly stable for transcripts)
  async function translateWithGoogleFallback(text: string, sourceLang: string, targetLang: string = "en"): Promise<string> {
    try {
      const sl = sourceLang === "zh-CN" ? "zh-CN" : "en";
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Translate API status ${res.status}`);
      }
      const data = await res.json();
      if (data && data[0]) {
        const translated = data[0].map((x: any) => x[0]).join("");
        return translated.trim();
      }
      throw new Error("Invalid response structure");
    } catch (error) {
      console.error("Fallback Google translation failed:", error);
      return "";
    }
  }

  // API Route for translation
  app.post("/api/translate", async (req, res) => {
    const { text, sourceLang } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const ai = getGeminiClient();
      if (!ai) {
        // Simple client fallback with Google Translate proxy support
        const isChinese = sourceLang === "zh-CN";
        const fallbackOriginal = addSmartLocalPunctuation(text, isChinese);
        let fallbackTranslation = fallbackOriginal;
        if (isChinese) {
          const gTrans = await translateWithGoogleFallback(text, "zh-CN", "en");
          fallbackTranslation = gTrans || translateMandarinToEnglish(text);
        }
        return res.json({
          originalText: fallbackOriginal,
          translatedText: fallbackTranslation,
          isSimulated: true
        });
      }

      const prompt = `You are a professional subtitle editor and translator.
Task:
1. Format the raw speech text with natural punctuation (such as commas, periods, question marks, exclamation marks, and proper capitalization).
2. Translate the formatted text into natural, fluent English.
3. If the input is English, the "translatedText" and "originalText" should be the exact same well-punctuated English sentence.
4. Keep the output strictly accurate to what was said, only correcting punctuation and grammar for natural reading.

Input text: "${text}"
Input language: ${sourceLang === "zh-CN" ? "Mandarin (Chinese)" : "English"}

Return ONLY a JSON response in this exact format:
{
  "originalText": "Formatted original text with punctuation",
  "translatedText": "Formatted English translation"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "{}";
      let parsed: any = {};
      
      try {
        let cleaned = responseText;
        if (cleaned.includes("```")) {
          const matches = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (matches && matches[1]) {
            cleaned = matches[1];
          } else {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "");
          }
        }
        cleaned = cleaned.trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("JSON parsing error on Gemini response, falling back to regex extraction:", parseErr, responseText);
        const origMatch = responseText.match(/"originalText"\s*:\s*"([\s\S]*?)"/);
        const transMatch = responseText.match(/"translatedText"\s*:\s*"([\s\S]*?)"/);
        parsed = {
          originalText: origMatch ? origMatch[1] : text,
          translatedText: transMatch ? transMatch[1] : text
        };
      }

      res.json({
        originalText: parsed.originalText || text,
        translatedText: parsed.translatedText || text,
        isSimulated: false
      });
    } catch (error: any) {
      console.error("Translation API Error, using punctuated fallback:", error);
      const isChinese = sourceLang === "zh-CN";
      const fallbackOriginal = addSmartLocalPunctuation(text, isChinese);
      let fallbackTranslation = fallbackOriginal;
      if (isChinese) {
        const gTrans = await translateWithGoogleFallback(text, "zh-CN", "en");
        fallbackTranslation = gTrans || translateMandarinToEnglish(text);
      }
      res.json({
        originalText: fallbackOriginal,
        translatedText: fallbackTranslation,
        isSimulated: true,
        error: error.message || "Failed to translate"
      });
    }
  });



  // API Route to transcribe uploaded audio files using Gemini
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audioData, mimeType, language } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Fallback offline mock transcription
        const isChinese = language === "zh-CN";
        return res.json({
          originalText: isChinese 
            ? "感谢大家今天来参加这个关于新功能开发的讨论会议。" 
            : "Thank you all for attending today's discussion meeting on new feature development.",
          translatedText: isChinese
            ? "Thank you all for attending today's discussion meeting on new feature development."
            : "Thank you all for attending today's discussion meeting on new feature development.",
          speaker: "Unknown Speaker",
          isFallback: true
        });
      }

      const prompt = `You are an expert audio transcription system. Transcribe the uploaded audio file precisely.
The speaker in the audio spoke in ${language === "zh-CN" ? "Mandarin (Chinese)" : "English"}.
- Transcribe the exact words spoken. Do not add any preamble, metadata, or notes.
- Translate the speech into English if the original speech is in Mandarin.
- If the original speech is in English, both the "originalText" and "translatedText" should be the exact same English transcription.
- Always set the speaker to "Unknown Speaker".

Return ONLY a JSON response in this exact format:
{
  "originalText": "Transcribed original text",
  "translatedText": "English translation (or same as originalText if original is English)",
  "speaker": "Unknown Speaker"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: audioData,
              mimeType: mimeType || "audio/mp3"
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "{}";
      let parsed: any = {};
      
      try {
        let cleaned = responseText;
        if (cleaned.includes("```")) {
          const matches = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (matches && matches[1]) {
            cleaned = matches[1];
          } else {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "");
          }
        }
        cleaned = cleaned.trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("JSON parsing error on transcribe-audio Gemini response, falling back to regex extraction:", parseErr, responseText);
        const origMatch = responseText.match(/"originalText"\s*:\s*"([\s\S]*?)"/);
        const transMatch = responseText.match(/"translatedText"\s*:\s*"([\s\S]*?)"/);
        parsed = {
          originalText: origMatch ? origMatch[1] : "Transcription unavailable",
          translatedText: transMatch ? transMatch[1] : "Translation unavailable"
        };
      }

      res.json({
        originalText: parsed.originalText || "",
        translatedText: parsed.translatedText || "",
        speaker: "Unknown Speaker",
        isFallback: false
      });
    } catch (error: any) {
      console.error("Audio Transcription API Error:", error);
      res.status(500).json({ error: error.message || "Failed to transcribe audio file" });
    }
  });

  // API Route to generate dynamic live-dialogue meeting transcript lines
  app.post("/api/generate-simulated-line", async (req, res) => {
    try {
      const { meetingTitle, participants, selectedLang, previousLines } = req.body;
      
      const ai = getGeminiClient();
      
      const pList = participants && participants.length > 0
        ? participants.map((p: any) => `${p.name} (${p.title || 'Attendee'} at ${p.org})`).join(", ")
        : "Priya Anand (Product Lead), Marcus Chen (Engineering Manager), Dana Fowler (Account Director)";

      const historyContext = previousLines && previousLines.length > 0
        ? previousLines.slice(-4).map((l: any) => `${l.speaker}: "${l.translatedText}"`).join("\n")
        : "None (just starting the session)";

      if (!ai) {
        // High quality offline randomized fallback generator
        const fallbackSpeakers = participants && participants.length > 0 
          ? participants 
          : [{ name: "Priya Anand", color: "#0F766E" }, { name: "Marcus Chen", color: "#C2410C" }, { name: "Dana Fowler", color: "#1D4ED8" }];
        
        const randomSpeaker = fallbackSpeakers[Math.floor(Math.random() * fallbackSpeakers.length)];
        
        const fallbackDialogues: Record<string, { original: string, translation: string }[]> = {
          "zh-CN": [
            { original: "关于这个问题，我们可以先看看具体的资源分配。", translation: "Regarding this issue, we can first look at the specific resource allocation." },
            { original: "我们需要确保所有的利益相关者对这个决定都感到满意。", translation: "We need to ensure all stakeholders are satisfied with this decision." },
            { original: "我认为这个时间表非常切合实际，我们会全力配合工作。", translation: "I think this timeline is very realistic, and we will fully cooperate." },
            { original: "关于这个功能的开发进度，预计下周一就可以交付测试了。", translation: "Regarding the development progress of this feature, it is expected to be delivered for testing next Monday." }
          ],
          "en-US": [
            { original: "I think we should schedule a follow-up on the resource allocation tomorrow.", translation: "I think we should schedule a follow-up on the resource allocation tomorrow." },
            { original: "We need to double check if the staging servers are fully synchronized.", translation: "We need to double check if the staging servers are fully synchronized." },
            { original: "Let's make sure the client documentation is ready by Thursday morning.", translation: "Let's make sure the client documentation is ready by Thursday morning." },
            { original: "The engineering team has already started working on the performance fixes.", translation: "The engineering team has already started working on the performance fixes." }
          ]
        };

        const activeFallback = fallbackDialogues[selectedLang] || fallbackDialogues["en-US"];
        const randomLine = activeFallback[Math.floor(Math.random() * activeFallback.length)];

        return res.json({
          speaker: randomSpeaker.name,
          originalText: randomLine.original,
          translatedText: randomLine.translation,
          isSimulated: true
        });
      }

      const prompt = `You are a professional meeting transcript simulator.
The current meeting is titled: "${meetingTitle || "Acme Sync"}"
The participants in this meeting are: [${pList}]
The selected language of the spoken fragment must be: "${selectedLang || "en-US"}"

Here is the recent transcript history of the conversation so far:
${historyContext}

Generate the next logical spoken line in the meeting.
- Select one speaker from the participants list above.
- Make them speak a realistic, natural-sounding boardroom comment in their specified language (${selectedLang || "en-US"}).
- Provide a clear, natural English translation of what they just said.

Return ONLY a JSON response in this exact format. Do not use markdown blocks, backticks, or any surrounding text:
{
  "speaker": "Name of the participant",
  "originalText": "Spoken comment in selected language",
  "translatedText": "Exact English translation"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text?.trim() || "";
      let parsed = JSON.parse(responseText);
      
      // Clean up markdown block headers if any escaped
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed.replace(/```json/g, "").replace(/```/g, ""));
      }

      res.json({
        speaker: parsed.speaker || "Attendee",
        originalText: parsed.originalText || "Hello",
        translatedText: parsed.translatedText || "Hello",
        isSimulated: false
      });
    } catch (error: any) {
      console.error("Live Sim Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate dynamic simulated line" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
