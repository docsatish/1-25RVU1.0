import { GoogleGenAI, Type } from "@google/genai";
import { WorklistItem } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWorklistImage = async (base64Image: string): Promise<WorklistItem[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a professional medical billing assistant. 
    Analyze this screenshot of a radiology worklist. 
    Extract:
    1. CPT codes
    2. Study Description (e.g. "CT Head", "CXR")
    3. Number of times each study was performed (count)
    4. The Exam Date or Service Date for the study.
    
    SPECIAL INSTRUCTIONS:
    - If a study is listed multiple times, sum them up. If they have different dates, list them as separate items.
    - For dates, use YYYY-MM-DD format.
    - Radiology reports often use "w/o" or "without" interchangeably.
    - Radiology reports often use "w/" or "with" interchangeably.
    - Extract the description clearly, preserving the intent (with/without contrast).
    
    Format the response as a JSON array of objects with "cpt", "description", "count", and "examDate" properties.
    If a CPT code is not visible, leave "cpt" null. 
    If a date is not found, leave "examDate" null.
    Ignore any patient names or PHI.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cpt: { type: Type.STRING, description: "The 5-digit CPT code if available", nullable: true },
            description: { type: Type.STRING, description: "The name or description of the study" },
            count: { type: Type.NUMBER, description: "Quantity of this study" },
            examDate: { type: Type.STRING, description: "The date of the exam in YYYY-MM-DD format", nullable: true }
          },
          required: ["description", "count"]
        }
      }
    }
  });

  try {
    const jsonStr = response.text || "[]";
    return JSON.parse(jsonStr) as WorklistItem[];
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};
