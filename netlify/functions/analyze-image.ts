import { Handler } from "@netlify/functions";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Initialize with the server-side environment variable
const genAI = new GoogleGenerativeAI(process.env.API_KEY || "");

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { base64Image } = JSON.parse(event.body || "{}");
    
    // Define the schema here so Gemini knows exactly how to format the JSON
    const schema = {
      description: "List of radiology worklist items",
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          cpt: { type: SchemaType.STRING, description: "The 5-digit CPT code if available", nullable: true },
          description: { type: SchemaType.STRING, description: "The name or description of the study" },
          count: { type: SchemaType.NUMBER, description: "Quantity of this study" },
          examDate: { type: SchemaType.STRING, description: "The date of the exam in YYYY-MM-DD format", nullable: true }
        },
        required: ["description", "count"]
      }
    };

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

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
      
      Ignore any patient names or PHI.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        // Adding CORS headers just in case your frontend is on a different subdomain
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: response.text(),
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message || "Internal Server Error" }) 
    };
  }
};