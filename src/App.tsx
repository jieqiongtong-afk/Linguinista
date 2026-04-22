import { useState, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload,
  User,
  GraduationCap,
  AlertCircle,
  FileAudio,
  Activity,
  Award,
  BookOpen,
  Volume2,
  Table,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTimer } from './hooks/useTimer';
import { extractCueCard, evaluateAudioFile } from './lib/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface EvaluationData {
  transcript: { speaker: string; text: string; startTime: number }[];
  feedback: {
    fluency: string;
    lexical: string;
    grammar: string;
    pronunciation: string;
  };
  estimatedScore: number;
  generalAdvice: string;
}

// --- Components ---

function ScoreBadge({ score }: { score: number }) {
  const getColors = (s: number) => {
    if (s >= 7.5) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (s >= 6.0) return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  };

  return (
    <div className={cn("px-6 py-2 rounded-2xl border-2 font-black text-3xl tracking-tighter shadow-2xl", getColors(score))}>
      {score.toFixed(1)}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'practice' | 'analyze'>('practice');
  
  // Practice State
  const { seconds, isRunning, start, stop, reset, formattedTime } = useTimer();
  const [cueCard, setCueCard] = useState<{title: string, preamble: string, instructionLine: string, bulletPoints: string[]} | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleCueCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const data = await extractCueCard(base64);
          setCueCard(data);
          setIsProcessingOCR(false);
        } catch (err) {
          console.error("OCR Failed", err);
          alert(`OCR Error: ${err instanceof Error ? err.message : 'Unknown Error'}`);
          setIsProcessingOCR(false);
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression failed", error);
      setIsProcessingOCR(false);
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setEvaluation(null);
  };

  const runFullAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisStep('Ingesting Audio Artifacts...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        setAnalysisStep('Reconstructing Transcript...');
        const data = await evaluateAudioFile(base64, selectedFile.type);
        setAnalysisStep('Finalizing Evaluation...');
        setEvaluation(data);
        setIsAnalyzing(false);
      } catch (err) {
        console.error("Analysis Failed", err);
        setAnalysisStep(`Evaluation Error: ${err instanceof Error ? err.message : 'Unknown Error'}`);
        // Leave message visible for 6 seconds
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalysisStep('');
        }, 6000);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const jumpToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      audioRef.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white font-sans flex overflow-hidden">
      
      {/* Lateral Navigation */}
      <nav className="w-20 bg-[#1E293B] border-r border-[#334155] flex flex-col items-center py-8 gap-10 z-50">
        <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">L</div>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setView('practice')}
            className={cn(
               "p-3 rounded-xl transition-all group relative",
               view === 'practice' ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-[#64748B] hover:text-white"
            )}
          >
            <Activity size={24} />
            <span className="absolute left-full ml-4 px-2 py-1 bg-black rounded text-[10px] font-bold uppercase tracking-widest invisible group-hover:visible whitespace-nowrap z-50 shadow-2xl">Practice Studio</span>
          </button>
          
          <button 
            onClick={() => setView('analyze')}
            className={cn(
               "p-3 rounded-xl transition-all group relative",
               view === 'analyze' ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-[#64748B] hover:text-white"
            )}
          >
            <Award size={24} />
            <span className="absolute left-full ml-4 px-2 py-1 bg-black rounded text-[10px] font-bold uppercase tracking-widest invisible group-hover:visible whitespace-nowrap z-50 shadow-2xl">Analysis Hub</span>
          </button>
        </div>

        <div className="mt-auto">
          <AlertCircle size={20} className="text-[#334155]" />
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        <header className="h-16 px-8 border-b border-[#334155] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#94A3B8]">
              {view === 'practice' ? "IELTS PRACTICE STUDIO" : "IELTS EVALUATION HUB"}
            </h2>
            <div className="h-4 w-[2px] bg-[#334155]" />
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">v2.0 Beta</span>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto no-scrollbar relative p-8">
          <AnimatePresence mode="wait">
            
            {view === 'practice' ? (
              <motion.div 
                key="practice"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full max-w-5xl mx-auto grid grid-cols-12 gap-8 pt-10"
              >
                {/* Timer Section */}
                <div className="col-span-7 flex flex-col items-center justify-center gap-12 py-12">
                   <div className="relative group">
                      <div className="absolute -inset-8 bg-blue-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative font-mono font-black text-9xl tracking-tighter tabular-nums text-white select-none">
                        {formattedTime}<span className="text-blue-500 animate-pulse text-[0.4em] align-top ml-2">.</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-6">
                      <button 
                        onClick={isRunning ? stop : start}
                        className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95 group",
                          isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"
                        )}
                      >
                        {isRunning ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                      </button>
                      
                      <button 
                        onClick={reset}
                        className="w-16 h-16 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#334155] transition-all shadow-xl active:scale-95"
                      >
                        <RotateCcw size={24} />
                      </button>
                   </div>

                   <div className="flex gap-4">
                     {['Part 1', 'Part 2', 'Part 3'].map(p => (
                       <div key={p} className="p-4 bg-[#1E293B] rounded-2xl border border-[#334155] text-center w-32 shadow-lg">
                          <p className="text-[10px] font-black uppercase text-[#475569] mb-1">{p}</p>
                          <p className="text-xs font-bold text-[#94A3B8]">Recommended: {p === 'Part 1' ? '4-5m' : (p === 'Part 2' ? '3-4m' : '4-5m')}</p>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Question Section */}
                <div className="col-span-5">
                   <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-8 h-full shadow-2xl flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-blue-400">
                          <BookOpen size={18} />
                          <h3 className="text-xs font-black uppercase tracking-widest">Part 2 Cue Card</h3>
                        </div>
                        <label className="cursor-pointer px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg active:scale-95">
                          Upload Question
                          <input type="file" className="hidden" accept="image/*" onChange={handleCueCardUpload} />
                        </label>
                      </div>

                      <div className="flex-1 bg-[#0F172A] border-2 border-dashed border-[#334155] rounded-2xl flex flex-col justify-center p-6 relative overflow-hidden">
                        {isProcessingOCR && (
                           <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 text-white">
                              <Activity className="animate-spin text-blue-500" />
                              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Extracting Prompt...</p>
                           </div>
                        )}
                        
                        {!cueCard ? (
                          <div className="text-center opacity-30 select-none space-y-4">
                            <Upload size={48} strokeWidth={1} className="mx-auto" />
                            <p className="text-[11px] font-bold uppercase tracking-widest max-w-[140px] mx-auto leading-relaxed">
                              SYSTEM AWAITING CUE CARD INGESTION
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6 h-full flex flex-col justify-start overflow-y-auto no-scrollbar">
                             <div className="space-y-6">
                                <div className="space-y-4">
                                  {cueCard.preamble && (
                                    <p className="text-[10px] font-medium text-[#64748B] leading-relaxed border-b border-white/5 pb-4">
                                      {cueCard.preamble}
                                    </p>
                                  )}
                                  <h4 className="text-xl font-black italic tracking-tighter uppercase text-white leading-tight">
                                    {cueCard.title}
                                  </h4>
                                  {cueCard.instructionLine && (
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 opacity-80 pt-2">
                                      {cueCard.instructionLine}
                                    </p>
                                  )}
                                  <ul className="space-y-4">
                                    {cueCard.bulletPoints.map((bp, i) => (
                                      <li key={i} className="flex gap-4 items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                                        <span className="text-sm font-medium text-[#94A3B8] leading-tight">{bp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>

              </motion.div>
            ) : (
              <motion.div 
                key="analyze"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="h-full max-w-6xl mx-auto flex flex-col gap-8"
              >
                {!evaluation ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-full max-w-xl p-12 bg-[#1E293B] border-4 border-dashed border-[#334155] rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden group">
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-[#1E293B] z-10 flex flex-col items-center justify-center gap-6 p-8">
                           <div className="w-24 h-24 relative">
                              <Loader2 size={96} className="text-blue-500 animate-spin" strokeWidth={1} />
                              <div className="absolute inset-0 animate-ping bg-blue-500/20 rounded-full" />
                           </div>
                           <div className="text-center space-y-2">
                              <p className="text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">{analysisStep}</p>
                              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#64748B]">Do not close this tab</p>
                           </div>
                           <div className="w-full bg-[#334155] h-1 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 15, repeat: Infinity }}
                                className="h-full bg-blue-500"
                              />
                           </div>
                        </div>
                      )}
                      
                      {!selectedFile ? (
                        <>
                          <div className="w-20 h-20 bg-[#334155] rounded-3xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform">
                            <FileAudio size={40} className="text-blue-400" />
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="text-3xl font-black tracking-tight text-white uppercase italic">Session Artifact Analysis</h3>
                            <p className="text-[#64748B] text-sm font-medium">Upload your recording for certified AI evaluation</p>
                          </div>

                          <label className="inline-block px-10 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-blue-500/20 active:scale-95 transition-all cursor-pointer">
                            Select Audio File
                            <input type="file" className="hidden" accept="audio/*" onChange={handleAudioSelect} />
                          </label>
                        </>
                      ) : (
                        <div className="space-y-8">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-emerald-500/10 rounded-full">
                              <FileAudio size={48} className="text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-xl font-black text-white">{selectedFile.name}</p>
                              <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY FOR ANALYSIS</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <button 
                              onClick={runFullAnalysis}
                              className="w-full py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                              Start Full AI Analysis <ChevronRight size={20} />
                            </button>
                            <button 
                              onClick={() => { setSelectedFile(null); setAudioUrl(null); }}
                              className="text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:text-white transition-colors"
                            >
                              Change File
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-8 pb-20">
                    
                    {/* Left: Summary and Transcription */}
                    <div className="col-span-8 flex flex-col gap-8">
                       <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-[#334155] shadow-2xl relative overflow-hidden">
                          <div className="relative z-10 flex flex-col gap-8">
                             <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Session Report Card</p>
                                   <h2 className="text-5xl font-black italic tracking-tighter uppercase">Evaluation Summary</h2>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                  <p className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Estimated Band</p>
                                  <ScoreBadge score={evaluation.estimatedScore} />
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                               {Object.entries(evaluation.feedback).map(([key, value]) => (
                                 <div key={key} className="bg-[#0F172A] p-6 rounded-2xl border border-[#334155] space-y-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">{key}</h4>
                                    <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">{value}</p>
                                 </div>
                               ))}
                             </div>

                             <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                               <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3">General Advice</h4>
                               <p className="text-sm font-medium text-[#E2E8F0] leading-relaxed italic">"{evaluation.generalAdvice}"</p>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h3 className="text-xl font-black uppercase tracking-tight ml-4 flex items-center gap-3">
                            <Table size={20} className="text-blue-500" />
                            Session Script <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Verbatim Reconstructed</span>
                          </h3>
                          <div className="space-y-4">
                            {evaluation.transcript.map((line, i) => (
                              <button 
                                key={i}
                                onClick={() => jumpToTime(line.startTime)}
                                className="w-full text-left bg-white/5 hover:bg-white/10 transition-all p-6 rounded-3xl border border-white/5 flex gap-6 items-start group"
                              >
                                <div className="pt-1 shrink-0">
                                  <span className="px-2 py-1 bg-[#334155] group-hover:bg-blue-500 text-[10px] font-black text-white rounded-md tracking-widest transition-colors uppercase">
                                    {line.speaker}
                                  </span>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <p className="text-lg font-medium text-[#E2E8F0] leading-relaxed">{line.text}</p>
                                  <p className="text-[10px] font-mono font-bold text-[#64748B] group-hover:text-blue-400 transition-colors">
                                    {Math.floor(line.startTime / 60)}:{(line.startTime % 60).toFixed(0).padStart(2, '0')}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                       </div>
                    </div>

                    {/* Right: Audio Control & Context */}
                    <aside className="col-span-4 space-y-6 sticky top-8 h-fit">
                       <div className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-[#334155] shadow-2xl flex flex-col items-center gap-6 text-center">
                          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/20 shrink-0">
                             <Volume2 size={40} className="text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black uppercase tracking-tight italic">Audio Artifact</h4>
                            <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest mt-1">Direct Master Stream</p>
                          </div>
                          <audio ref={audioRef} src={audioUrl || ''} controls className="w-full h-10 custom-audio" />
                          <button 
                            onClick={() => {
                              setEvaluation(null);
                              setAudioUrl(null);
                              setSelectedFile(null);
                            }}
                            className="w-full py-4 rounded-2xl border-2 border-[#334155] hover:bg-white hover:text-[#0F172A] transition-all text-xs font-black uppercase tracking-[0.2em]"
                          >
                            New Analysis
                          </button>
                       </div>

                       <div className="bg-[#3B82F6] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                             <CheckCircle2 size={120} strokeWidth={0.5} />
                          </div>
                          <h4 className="text-xl font-black uppercase tracking-tight text-white mb-4">Certified Eval</h4>
                          <p className="text-xs font-bold text-white/80 leading-relaxed uppercase tracking-widest">
                            AI scoring based on official IELTS public band descriptors. 
                            Analysis covers 100% of captured verbal input.
                          </p>
                       </div>
                    </aside>

                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

    </div>
  );
}
