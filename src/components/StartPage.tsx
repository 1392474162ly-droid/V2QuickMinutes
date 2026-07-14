import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  Plus, 
  X,
  FileText, 
  ArrowRight, 
  Layout, 
  ChevronDown,
  ChevronUp,
  Check,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react";
// @ts-ignore
import stickerDog from "../assets/images/sticker_dog.png";
// @ts-ignore
import stickerCat from "../assets/images/sticker_cat.png";
// @ts-ignore
import stickerTiger from "../assets/images/sticker_tiger.png";
// @ts-ignore
import stickerCroc from "../assets/images/sticker_croc.png";
// @ts-ignore
import stickerLion from "../assets/images/sticker_lion.png";
// @ts-ignore
import stickerTurtle from "../assets/images/sticker_turtle.png";
// @ts-ignore
import stickerFlamingo from "../assets/images/sticker_flamingo.png";
// @ts-ignore
import stickerPolarbear from "../assets/images/sticker_polarbear.png";
// @ts-ignore
import stickerGiraffe from "../assets/images/sticker_giraffe.png";
// @ts-ignore
import stickerFox from "../assets/images/sticker_fox.png";
// @ts-ignore
import stickerKoala from "../assets/images/sticker_koala.png";
// @ts-ignore
import doorClosed from "../assets/images/door_closed_v2.png";
// @ts-ignore
import doorOpen from "../assets/images/door_open_v2.png";

const AVATAR_STICKERS = [stickerDog, stickerCat, stickerTiger, stickerCroc, stickerLion, stickerTurtle, stickerFlamingo, stickerPolarbear, stickerGiraffe, stickerFox, stickerKoala];
const getAvatarForPerson = (id: number, avatarIndex?: number) => {
  if (avatarIndex !== undefined && avatarIndex >= 0 && avatarIndex < AVATAR_STICKERS.length) {
    return AVATAR_STICKERS[avatarIndex];
  }
  const idx = ((id - 1) % AVATAR_STICKERS.length + AVATAR_STICKERS.length) % AVATAR_STICKERS.length;
  return AVATAR_STICKERS[idx];
};

export const formatShortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "";
  const first = parts[0];
  const secondInitial = parts[1].charAt(0).toUpperCase();
  return `${first} ${secondInitial}.`;
};

export interface Participant {
  id: number;
  name: string;
  org: string;
  title: string;
  color: string;
  isPlaceholder?: boolean;
  avatarIndex?: number;
}

export interface Seat {
  id: number;
  x: number;
  y: number;
  participantId: number | null;
}

interface StartPageProps {
  seats: Seat[];
  setSeats: React.Dispatch<React.SetStateAction<Seat[]>>;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  seatingShape: "round" | "rect" | "rows";
  setSeatingShape: React.Dispatch<React.SetStateAction<"round" | "rect" | "rows">>;
  gridCols: number;
  setGridCols: React.Dispatch<React.SetStateAction<number>>;
  gridRows: number;
  setGridRows: React.Dispatch<React.SetStateAction<number>>;
  selectedUnseatedId: number | null;
  setSelectedUnseatedId: React.Dispatch<React.SetStateAction<number | null>>;
  changeSeatCount: (newCount: number) => void;
  applySeatingTemplate: (shape: "round" | "rect" | "rows") => void;
  generateRowsOfSeats: (cols: number, rows: number) => void;
  onSaveSeating: () => void;
  showToast: (msg: string) => void;
}

export default function StartPage({
  seats,
  setSeats,
  participants,
  setParticipants,
  seatingShape,
  setSeatingShape,
  gridCols,
  setGridCols,
  gridRows,
  setGridRows,
  selectedUnseatedId,
  setSelectedUnseatedId,
  changeSeatCount,
  applySeatingTemplate,
  generateRowsOfSeats,
  onSaveSeating,
  showToast
}: StartPageProps) {
  // Local state for participant creation form
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [newName, setNewName] = useState("");
  const [newOrg, setNewOrg] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [currentSelectedAvatarIdx, setCurrentSelectedAvatarIdx] = useState<number>(0);
  const [isDoorHovered, setIsDoorHovered] = useState(false);

  // Helper to add an unknown attendee
  const handleAddUnknownAttendee = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unknownCount = participants.filter(p => p.name.startsWith("Unknown Attendee ")).length;
    const letter = alphabet[unknownCount % 26] + (unknownCount >= 26 ? Math.floor(unknownCount / 26) + 1 : "");
    const name = `Unknown Attendee ${letter}`;
    const colors = ["#0F766E", "#C2410C", "#1D4ED8", "#7C3AED", "#DB2777", "#2563EB", "#059669"];
    const randColor = colors[participants.length % colors.length];

    const newPerson: Participant = {
      id: Date.now(),
      name,
      org: "External Guest",
      title: "Unknown",
      color: randColor,
      isPlaceholder: true,
      avatarIndex: participants.length % AVATAR_STICKERS.length
    };

    setParticipants(prev => [...prev, newPerson]);
    showToast(`Added ${newPerson.name}`);
  };

  // Dragging states
  const [draggingSeatId, setDraggingSeatId] = useState<number | null>(null);
  const localCanvasRef = useRef<HTMLDivElement | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);

  // Mouse handlers for dragging seats on the start screen canvas
  const handleSeatMouseDown = (e: React.MouseEvent, seatId: number) => {
    e.preventDefault();
    setDraggingSeatId(seatId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setHasMovedDuringDrag(false);
  };

  const handleSeatTouchStart = (e: React.TouchEvent, seatId: number) => {
    const touch = e.touches[0];
    setDraggingSeatId(seatId);
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    setHasMovedDuringDrag(false);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (draggingSeatId === null || !localCanvasRef.current) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 3) {
      setHasMovedDuringDrag(true);
    }

    const rect = localCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp coordinates to stay visible
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));

    setSeats(prev =>
      prev.map(s => s.id === draggingSeatId ? { ...s, x: clampedX, y: clampedY } : s)
    );
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (draggingSeatId === null || !localCanvasRef.current) return;
    const touch = e.touches[0];

    const dx = touch.clientX - dragStartPos.current.x;
    const dy = touch.clientY - dragStartPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 3) {
      setHasMovedDuringDrag(true);
    }

    const rect = localCanvasRef.current.getBoundingClientRect();
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
    }
  };

  // Add global mouseup listener
  useEffect(() => {
    window.addEventListener("mouseup", handleMouseOrTouchUp);
    window.addEventListener("touchend", handleMouseOrTouchUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseOrTouchUp);
      window.removeEventListener("touchend", handleMouseOrTouchUp);
    };
  }, [draggingSeatId]);

  // Click handler for seats (Click-to-place integration)
  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    if (selectedUnseatedId) {
      // Place selected participant in this seat
      const pId = selectedUnseatedId;
      setSeats(prev => prev.map(s => {
        if (s.participantId === pId) return { ...s, participantId: null };
        if (s.id === seatId) return { ...s, participantId: pId };
        return s;
      }));
      const person = participants.find(p => p.id === pId);
      if (person) {
        showToast(`Seated ${person.name} in Chair #${seatId}`);
      }
      setSelectedUnseatedId(null);
    } else {
      if (seat.participantId) {
        const person = participants.find(p => p.id === seat.participantId);
        if (person) {
          showToast(`${person.name} is seated here. Click the red 'x' button to unseat them.`);
        }
      } else {
        showToast("Empty seat. Select an active attendee from the list first, then click here to place them!");
      }
    }
  };

  // Create new participant locally
  const handleCreateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unknownCount = participants.filter(p => p.name.startsWith("Speaker ")).length;
    const letter = alphabet[unknownCount % 26] + (unknownCount >= 26 ? Math.floor(unknownCount / 26) + 1 : "");
    const autoName = `Speaker ${letter}`;

    const finalName = newName.trim() || autoName;
    const finalOrg = newOrg.trim() || "Acme Corp";
    const finalTitle = newTitle.trim() || "Board Member";
    const isPlaceholder = !newName.trim();

    const colors = ["#0F766E", "#C2410C", "#1D4ED8", "#7C3AED", "#DB2777", "#2563EB", "#059669"];
    const randColor = colors[participants.length % colors.length];

    const newPerson: Participant = {
      id: Date.now(),
      name: finalName,
      org: finalOrg,
      title: finalTitle,
      color: randColor,
      isPlaceholder,
      avatarIndex: currentSelectedAvatarIdx
    };

    setParticipants(prev => [...prev, newPerson]);
    setNewName("");
    setNewOrg("");
    setNewTitle("");
    setCurrentSelectedAvatarIdx(prev => (prev + 1) % AVATAR_STICKERS.length);
    showToast(`Added ${newPerson.name} to list`);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col md:flex-row overflow-hidden select-none">
      
      {/* ----------------- LEFT 1/3: BRANDING LOGO & PREMIUM HALF NOTEBOOK ----------------- */}
      <div className="w-full md:w-1/3 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200/85 flex flex-col p-4 md:p-6 relative md:h-screen min-h-0 shrink-0 gap-4">
        
        {/* Top Header Logo & Branding (Moved to the left panel) */}
        <div className="space-y-3 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FAF6EE] to-[#E9DFCE] border border-[#C89E5F]/40 text-[#C89E5F] font-serif font-black text-xl shadow-md">
              Q
            </div>
            <span className="font-serif text-2xl font-black text-slate-800 tracking-tight">
              QuickMinutes
            </span>
          </div>
          <div className="w-16 h-[2.5px] bg-[#C89E5F] rounded-full" />
        </div>

        {/* The Realistic Notebook Page Card */}
        <div className="w-full flex-1 bg-[#FAF6EE] rounded-r-3xl rounded-l-md shadow-[0_15px_40px_-15px_rgba(0,0,0,0.15)] border-y border-r border-[#E9DFCE] relative flex flex-col p-4 md:p-6 md:py-5 overflow-y-auto min-h-0">
          
          {/* 3D Binder Spiral seam on the left edge */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#DFD5C0] via-[#FAF6EE] to-[#EBE0C9] border-r border-[#D9CBAC]/60 rounded-l hidden md:flex flex-col justify-between py-12 pointer-events-none z-20">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="relative flex items-center justify-center -ml-2">
                {/* Paper hole */}
                <div className="w-3.5 h-3.5 rounded-full bg-slate-200 border border-slate-300 shadow-inner" />
                {/* Metal ring curving out */}
                <div className="absolute left-[-20px] w-12 h-6 rounded-full border-[3px] border-t-slate-300 border-b-slate-400 border-l-slate-200 border-r-transparent rotate-12 filter drop-shadow-md" />
              </div>
            ))}
          </div>

          {/* Notebook Lined Paper Decorative Heading margin */}
          <div className="md:pl-10 space-y-3 flex-1 flex flex-col min-h-0 justify-between">
            
            {/* ACTIVE ATTENDEES (Changed to single column grid-cols-1) */}
            <div className="space-y-1.5 pt-1 flex-1 flex flex-col min-h-0">
              <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider block">
                ACTIVE ATTENDEES
              </span>
              <div className="grid grid-cols-1 gap-2 content-start overflow-y-auto flex-1 p-1.5 bg-white/40 border border-slate-200 rounded-xl min-h-0 max-h-56">
                {participants.map(person => {
                  const isSeated = seats.some(s => s.participantId === person.id);
                  const isSelected = selectedUnseatedId === person.id;
                  return (
                    <div
                      key={person.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("participantId", person.id.toString());
                      }}
                      onClick={() => {
                        if (isSeated) {
                          setSeats(prev => prev.map(s => s.participantId === person.id ? { ...s, participantId: null } : s));
                          showToast(`Unseated ${person.name}`);
                        } else {
                          setSelectedUnseatedId(selectedUnseatedId === person.id ? null : person.id);
                        }
                      }}
                      className={`group relative border rounded-2xl p-2.5 transition flex items-center justify-between cursor-pointer select-none shadow-xs ${isSeated ? "bg-slate-100/50 border-slate-200/80 opacity-75" : isSelected ? "bg-[#C89E5F]/10 border-[#C89E5F]/50 ring-1 ring-[#C89E5F]/30" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
                      title={isSeated ? `${person.name} is seated. Click to unseat!` : "Drag onto boardroom seat or click to select for placing!"}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Sticker in its own shape, not cut in circle */}
                        <div className="w-12 h-10 flex items-center justify-center shrink-0 relative">
                          <img
                            src={getAvatarForPerson(person.id, person.avatarIndex)}
                            alt={person.name}
                            className="w-12 h-10 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold truncate block" style={{ color: person.color }}>
                              {person.name}
                            </span>
                            {person.isPlaceholder && (
                              <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded font-mono uppercase font-bold">Temp</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                            {person.org} {person.title && ` · ${person.title}`}
                          </p>
                        </div>
                      </div>

                      {/* Right side status */}
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {isSeated ? (
                          <span className="text-[9px] bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-mono uppercase font-extrabold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> Seated
                          </span>
                        ) : isSelected ? (
                          <span className="text-[9px] bg-[#C89E5F]/20 text-[#8C6D3F] border border-[#C89E5F]/30 px-2 py-0.5 rounded-full font-mono uppercase font-extrabold animate-pulse">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200/80 px-2 py-0.5 rounded-full font-mono uppercase font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {participants.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic p-1.5 font-medium">No active attendees yet.</span>
                )}
              </div>
              {selectedUnseatedId && (
                <p className="text-[10px] text-[#8E6D38] font-bold animate-pulse mt-1">
                  👉 Click any empty seat (#) in the room on the right side to seat them there.
                </p>
              )}
            </div>

            {/* STICKY BOTTOM CREATE PARTICIPANT */}
            <div className="border-t border-dashed border-slate-300 pt-2 mt-auto shrink-0">
              <button
                onClick={() => setIsFormExpanded(!isFormExpanded)}
                className="w-full flex items-center justify-between text-left transition pb-0.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">
                  <Plus className="w-3 h-3 text-slate-600" /> Create Participant
                </span>
                {isFormExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isFormExpanded && (
                <form onSubmit={handleCreateParticipant} className="space-y-2 mt-2 animate-fade-in text-slate-800">
                  <div className="flex gap-2.5 items-center">
                    {/* Left: Avatar Selector with Arrow Switchers (No "AVATAR" text, enlarged image with hover scale effect) */}
                    <div className="flex items-center justify-between bg-slate-100/60 p-2 rounded-xl border border-slate-200/60 shrink-0 w-36 h-24 overflow-visible relative z-20">
                      <button
                        type="button"
                        onClick={() => setCurrentSelectedAvatarIdx(prev => (prev - 1 + AVATAR_STICKERS.length) % AVATAR_STICKERS.length)}
                        className="p-1.5 hover:bg-slate-200/80 rounded-full transition text-slate-600 cursor-pointer z-30"
                        title="Previous Avatar"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="w-18 h-18 flex items-center justify-center relative overflow-visible">
                        <img
                          src={AVATAR_STICKERS[currentSelectedAvatarIdx]}
                          alt="Selected Avatar"
                          className="w-18 h-18 object-contain transition-all duration-300 ease-out hover:scale-160 hover:rotate-6 cursor-pointer hover:drop-shadow-xl select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentSelectedAvatarIdx(prev => (prev + 1) % AVATAR_STICKERS.length)}
                        className="p-1.5 hover:bg-slate-200/80 rounded-full transition text-slate-600 cursor-pointer z-30"
                        title="Next Avatar"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Right: Three Inputs (Name, Org, Title) */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Name (e.g. Dana Fowler)"
                        className="text-[11px] w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#C89E5F] shadow-xs text-slate-800"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={newOrg}
                          onChange={(e) => setNewOrg(e.target.value)}
                          placeholder="Organisation"
                          className="text-[11px] w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#C89E5F] shadow-xs text-slate-800"
                        />
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Title / Role"
                          className="text-[11px] w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#C89E5F] shadow-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-800 text-white font-extrabold text-[11px] py-1.5 px-2.5 rounded-lg hover:bg-slate-900 transition shadow-xs cursor-pointer"
                  >
                    + Add to Meeting
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ----------------- RIGHT 2/3: MEETING ROOM VISUALISATION (Now 2/3 and on the right) ----------------- */}
      <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col justify-between bg-[#F8FAFC] border-b md:border-b-0 md:border-l border-slate-200 relative md:h-screen overflow-y-auto min-h-0">
        {/* Background glow flares */}
        <div className="absolute top-1/4 left-[-20%] w-[120%] h-[40%] rounded-full bg-[#C89E5F]/3 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-[-20%] w-[120%] h-[40%] rounded-full bg-teal-500/3 blur-[100px] pointer-events-none" />

        {/* Top Header Workspace and Premium Light Save Button */}
        <div className="flex items-center justify-between z-10 border-b border-slate-200 pb-4 shrink-0">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-black text-[#C89E5F] uppercase tracking-[0.2em] block">
              Workspace Visualization
            </span>
            <h4 className="text-sm font-semibold text-slate-800">
              Interactive Seating Arrangement
            </h4>
          </div>
          {/* Light-coloured Save & Start Notes Button */}
          <button
            onClick={onSaveSeating}
            className="bg-white hover:bg-[#FAF6EE] text-slate-800 font-serif font-black text-xs py-2 px-4 rounded-xl border border-slate-200 transition duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 hover:border-[#C89E5F]/40"
          >
            Save & Start Notes
            <ArrowRight className="w-3.5 h-3.5 text-[#C89E5F]" />
          </button>
        </div>

        {/* Layout presets section shifted to the right above the visualisation */}
        <div className="mt-4 bg-slate-100/60 border border-slate-200/80 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-serif font-black text-slate-700 shrink-0">Layout presets</span>
            <div className="flex gap-1 bg-white p-0.5 rounded-xl border border-slate-200/60 shadow-2xs">
              <button
                onClick={() => applySeatingTemplate("round")}
                className={`px-3 py-1.5 rounded-lg transition text-xs font-extrabold cursor-pointer ${seatingShape === "round" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                ◯ Round Table
              </button>
              <button
                onClick={() => applySeatingTemplate("rect")}
                className={`px-3 py-1.5 rounded-lg transition text-xs font-extrabold cursor-pointer ${seatingShape === "rect" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                ▭ Conference Rect
              </button>
              <button
                onClick={() => applySeatingTemplate("rows")}
                className={`px-3 py-1.5 rounded-lg transition text-xs font-extrabold cursor-pointer ${seatingShape === "rows" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                ▤ Row Grid
              </button>
            </div>
          </div>

          {/* ROW GRID MATRIX input container designed to prevent overflow */}
          {seatingShape === "rows" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 animate-in fade-in duration-200">
              <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">Grid Matrix:</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Cols</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={gridCols}
                  onChange={(e) => setGridCols(Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-7 text-xs font-bold text-slate-700 focus:outline-none bg-transparent text-center"
                />
              </div>
              <span className="text-slate-400 text-xs font-bold">×</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase">Rows</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={gridRows}
                  onChange={(e) => setGridRows(Math.min(6, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-7 text-xs font-bold text-slate-700 focus:outline-none bg-transparent text-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEATING INTERACTIVE CANVAS */}
        <div className="space-y-2 z-10 my-4 flex-1 flex flex-col justify-center min-h-0">
          <span className="text-[10px] font-mono font-black text-[#C89E5F] uppercase tracking-[0.25em] block shrink-0">
            Room Seating Layout
          </span>
          
          <div
            ref={localCanvasRef}
            onMouseMove={handleContainerMouseMove}
            onTouchMove={handleContainerTouchMove}
            className="relative w-full aspect-[16/11] bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200 flex-1 min-h-[300px]"
          >
            {/* Add Unknown Attendee button in the leftmost bottom corner of the visualisation */}
            <button
              onClick={handleAddUnknownAttendee}
              onMouseEnter={() => setIsDoorHovered(true)}
              onMouseLeave={() => setIsDoorHovered(false)}
              className="absolute bottom-3 left-3 z-20 w-16 h-16 transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer"
              title="Add an unknown attendee to the seat list"
            >
              <img
                src={isDoorHovered ? doorOpen : doorClosed}
                alt="Add Unknown Attendee"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </button>

            <div className="absolute inset-4 rounded-xl border border-dashed border-slate-200/80 flex items-center justify-center pointer-events-none">
              {seatingShape === "round" && (
                <div className="w-[45%] h-[45%] rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-mono font-extrabold tracking-widest uppercase shadow-xs">
                  Round Table
                </div>
              )}
              {seatingShape === "rect" && (
                <div className="w-[60%] h-[30%] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-mono font-extrabold tracking-widest uppercase shadow-xs">
                  Conference Table
                </div>
              )}
              {seatingShape === "rows" && (
                <div className="w-[80%] h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-mono font-extrabold uppercase tracking-widest absolute top-2 shadow-xs">
                  Front Area
                </div>
              )}
            </div>

            {/* Rendering Draggable Seats */}
            {seats.map((seat) => {
              const person = participants.find(p => p.id === seat.participantId);
              return (
                <div
                  key={seat.id}
                  onMouseDown={(e) => handleSeatMouseDown(e, seat.id)}
                  onTouchStart={(e) => handleSeatTouchStart(e, seat.id)}
                  onClick={(e) => {
                    if (hasMovedDuringDrag) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    handleSeatClick(seat.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const pId = parseInt(e.dataTransfer.getData("participantId"));
                    if (pId) {
                      setSeats(prev => prev.map(s => {
                        if (s.participantId === pId) return { ...s, participantId: null };
                        if (s.id === seat.id) return { ...s, participantId: pId };
                        return s;
                      }));
                      const person = participants.find(p => p.id === pId);
                      if (person) {
                        showToast(`Seated ${person.name} in seat #${seat.id}`);
                      }
                    }
                  }}
                  style={{
                    left: `${seat.x}%`,
                    top: `${seat.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute select-none transition-all hover:scale-110 group cursor-grab active:cursor-grabbing ${!person ? "w-20 h-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50/95 flex items-center justify-center text-sm text-slate-400 font-bold shadow-xs border-slate-400/80" : "w-24 h-24 flex items-center justify-center"}`}
                  title={person ? `${person.name} (${person.org})` : `Empty Chair #${seat.id}`}
                >
                  {person ? (
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      {/* Sticker image in its own shape, not cut in circle */}
                      <img
                        src={getAvatarForPerson(person.id, person.avatarIndex)}
                        alt={person.name}
                        className="w-24 h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {/* Short name form (e.g. Priya A.) as small text below image, colored with person's specific color */}
                      <span 
                        className="absolute top-[85%] left-1/2 -translate-x-1/2 text-[10px] font-mono font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-xs whitespace-nowrap z-10 tracking-tight"
                        style={{ color: person.color }}
                      >
                        {formatShortName(person.name)}
                      </span>
                    </div>
                  ) : (
                    `#${seat.id}`
                  )}
                  
                  {/* Delete icon to unseat (Only cross button can unseat!) */}
                  {person && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, participantId: null } : s));
                        showToast(`Unseated ${person.name}`);
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md border border-white transition-opacity opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[9.5px] text-slate-400 mt-1 text-center leading-relaxed font-semibold shrink-0">
            👉 Hold & drag seats to rearrange space. Drag participant cards from left list onto circles. Click empty seat to seat.
          </p>
        </div>

        {/* Bottom Signature / Footer */}
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest z-10 pt-4 border-t border-slate-200 shrink-0">
          Executive Seating Hub • v2.1
        </div>
      </div>

    </div>
  );
}
