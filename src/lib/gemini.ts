import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractCueCard(base64Image: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/png" } },
          { text: "Exhaustively extract every single word from this IELTS Speaking Part 2 cue card image. Map it precisely to a JSON object:\n'title' (the main introductory topic),\n'preamble' (general timing instructions like 'You will have to talk...'),\n'instructionLine' (the line 'You should say:'),\n'bulletPoints' (An array containing the core prompts. IMPORTANT: If there is a concluding 'And explain...' instruction at the bottom of the list, append it directly to the previous bullet point text or include it as the final bullet point so that they are displayed together as one cohesive list. Do not create a separate field for the final instruction.)\nDo not summarize. Do not skip words." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          preamble: { type: Type.STRING },
          instructionLine: { type: Type.STRING },
          bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'preamble', 'instructionLine', 'bulletPoints']
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function evaluateSession(transcript: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `You are an expert IELTS examiner. Evaluate the following speaking session transcript. 
        Structure your feedback according to:
        1. Fluency & Coherence
        2. Lexical Resource
        3. Grammatical Range & Accuracy
        4. Pronunciation
        
        For each category, provide:
        - A band score (0-9).
        - Detailed, actionable feedback.
        - Specific examples from the text with corrections.
        
        Also provide an overall estimated band score.
        Format the output in clean Markdown.
        
        Transcript:
        ${transcript}`
      }
    ]
  });

  return response.text;
}

export async function evaluateAudioFile(base64Audio: string, mimeType: string = "audio/mpeg") {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Audio, mimeType: mimeType } },
          { text: `You are a certified senior IELTS Speaking Examiner. 
          
          Analyze this audio file and provide a COMPREHENSIVE evaluation.
          
          1. TRANSCRIPT: Provide a full verbatim transcript of the session.
          2. EVALUATION:
             - Fluency and Coherence: Detailed analysis.
             - Lexical Resource: Detailed analysis.
             - Grammatical Range and Accuracy: Detailed analysis.
             - Pronunciation: Detailed analysis.
          3. ESTIMATED SCORE: Provide a band score from 1.0 to 9.0.
          
          Return the data in a structured JSON format.` }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING },
                text: { type: Type.STRING },
                startTime: { type: Type.NUMBER }
              }
            }
          },
          feedback: {
             type: Type.OBJECT,
             properties: {
               fluency: { type: Type.STRING },
               lexical: { type: Type.STRING },
               grammar: { type: Type.STRING },
               pronunciation: { type: Type.STRING }
             }
          },
          estimatedScore: { type: Type.NUMBER },
          generalAdvice: { type: Type.STRING }
        },
        required: ['transcript', 'feedback', 'estimatedScore', 'generalAdvice']
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
