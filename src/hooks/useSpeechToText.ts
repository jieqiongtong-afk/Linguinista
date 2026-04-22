import { useState, useCallback, useRef, useEffect } from 'react';

export interface TranscriptLine {
  id: string;
  speaker: 'Teacher' | 'Student';
  text: string;
  timestamp: number;
  offset: number; // Seconds since session start
}

export function useSpeechToText() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReconstructing, setIsReconstructing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionStartRef = useRef<number>(0);
  const isManuallyStopped = useRef<boolean>(false);
  
  const transcriptRef = useRef<TranscriptLine[]>([]);

  const syncTranscript = () => {
    setTranscript([...transcriptRef.current]);
  };

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          const newText = result[0].transcript.trim();
          if (newText) {
            const newLine: TranscriptLine = {
              id: Math.random().toString(36).substr(2, 9),
              speaker: 'Student', // Default to student for live, teacher can toggle
              text: newText,
              timestamp: Date.now(),
              offset: (Date.now() - sessionStartRef.current) / 1000,
            };
            transcriptRef.current.push(newLine);
            syncTranscript();
          }
          currentInterim = '';
        } else {
          currentInterim += result[0].transcript;
        }
      }
      setInterimText(currentInterim);
    };

    recognition.onend = () => {
      if (isRecording && !isManuallyStopped.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      sessionStartRef.current = Date.now();
      isManuallyStopped.current = false;
      
      const mediaRecorder = new MediaRecorder(stream, {
        audioBitsPerSecond: 256000
      });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
      
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err) {
      console.error("Recording failed to start:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    isManuallyStopped.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  const updateLine = useCallback((id: string, newText: string) => {
    transcriptRef.current = transcriptRef.current.map(line => 
      line.id === id ? { ...line, text: newText } : line
    );
    syncTranscript();
  }, []);

  const addManualLine = useCallback((speaker: 'Teacher' | 'Student') => {
    const newLine: TranscriptLine = {
      id: Math.random().toString(36).substr(2, 9),
      speaker,
      text: '',
      timestamp: Date.now(),
      offset: (Date.now() - sessionStartRef.current) / 1000,
    };
    transcriptRef.current.push(newLine);
    syncTranscript();
  }, []);

  const clearSession = useCallback(() => {
    transcriptRef.current = [];
    syncTranscript();
    setAudioUrl(null);
  }, []);

  return {
    transcript,
    setTranscript: (lines: TranscriptLine[]) => {
      transcriptRef.current = lines;
      syncTranscript();
    },
    isRecording,
    audioUrl,
    isReconstructing,
    setIsReconstructing,
    startRecording,
    stopRecording,
    updateLine,
    addManualLine,
    clearSession,
    sessionStartTime: sessionStartRef.current,
    audioBlob: audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/wav' }) : null
  };
}
