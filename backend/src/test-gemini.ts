import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const modelsToTest = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-001"
];

async function testModels() {
  console.log("--- Starting Gemini Model Diagnostic Test ---");
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'Success'");
      const response = await result.response;
      const text = response.text();
      
      if (text.includes("Success")) {
        console.log(`✅ SUCCESS: Model '${modelName}' is working correctly.`);
        process.exit(0);
      }
    } catch (error: any) {
      console.log(`❌ FAILED: Model '${modelName}' returned status ${error.status || 'Unknown'}. Message: ${error.message}`);
    }
  }
  
  console.log("--- Diagnostic Test Finished: No working models found ---");
  process.exit(1);
}

testModels();
