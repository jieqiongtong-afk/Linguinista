import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function extractCueCard(base64Image: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/png" } },
          { text: "Exhaustively extract every single word from this IELTS Speaking Part 2 cue card image. Map it precisely to a JSON object:\n'title' (the main introductory topic),\n'preamble' (general timing instructions like 'You will have to talk...'),\n'instructionLine' (the line 'You should say:'),\n'bulletPoints' (An array containing the core prompts. IMPORTANT: If there is a concluding 'And explain...' instruction at the bottom of the list, append it directly to the previous bullet point text or include it as the final bullet point so that they are displayed together as one cohesive list. Do not create a separate field for the final instruction.)\nDo not summarize. Do not skip words." }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          preamble: { type: SchemaType.STRING },
          instructionLine: { type: SchemaType.STRING },
          bulletPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ['title', 'preamble', 'instructionLine', 'bulletPoints']
      }
    }
  });

  return JSON.parse(result.response.text() || "{}");
}

export async function evaluateAudioFile(base64Audio: string, mimeType: string = "audio/mpeg") {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
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
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transcript: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                speaker: { type: SchemaType.STRING },
                text: { type: SchemaType.STRING },
                startTime: { type: SchemaType.NUMBER }
              }
            }
          },
          feedback: {
             type: SchemaType.OBJECT,
             properties: {
               fluency: { type: SchemaType.STRING },
               lexical: { type: SchemaType.STRING },
               grammar: { type: SchemaType.STRING },
               pronunciation: { type: SchemaType.STRING }
             }
          },
          estimatedScore: { type: SchemaType.NUMBER },
          generalAdvice: { type: SchemaType.STRING }
        },
        required: ['transcript', 'feedback', 'estimatedScore', 'generalAdvice']
      }
    }
  });

  return JSON.parse(result.response.text() || "{}");
}
