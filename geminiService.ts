import { WorklistItem } from "./types";

export const analyzeWorklistImage = async (base64Image: string): Promise<WorklistItem[]> => {
  try {
    // We point to the Netlify Function endpoint we created
    const response = await fetch("/.netlify/functions/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText}`);
    }

    // The Netlify function will return the JSON array from Gemini
    const data = await response.json();
    return data as WorklistItem[];
    
  } catch (error) {
    console.error("Failed to analyze worklist via backend:", error);
    return [];
  }
};