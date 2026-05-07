// test-api-key.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_TEST);

async function testApiKey() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("✅ API Key is working!");
    console.log(result.response.text());
  } catch (error) {
    console.error("❌ API Key error:", error.message);
  }
}

testApiKey();
