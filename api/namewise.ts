// api/namewise.ts  (Vercel Node.js Serverless Function)
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // OPTIONS 요청 처리 (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 요청 본문 검증
    console.log("Request body:", req.body);

    const { description, style } = (req.body ?? {}) as {
      description?: string;
      style?: string;
    };

    if (!description) {
      return res.status(400).json({
        error: "description is required",
        received: { description, style },
      });
    }

    // 환경 변수 확인
    console.log("Environment variables check:", {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      keyLength: process.env.GEMINI_API_KEY?.length || 0,
    });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not set",
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 무료 티어용 경량 모델

    const prompt = `
너는 프론트엔드 시니어 개발자다. 사용자의 자연어 설명을 바탕으로
1) 컴포넌트명
2) styled-components 네이밍 (S. 접두어)
3) 파일명(확장자 없이 베이스명만)
을 제안하라.

설명: ${description}
제약:
- 네이밍 스타일: ${style || "PascalCase"}
- styled-components는 "S." 접두어 사용
- 파일 확장자 표기는 금지(베이스명만)
- JSON 이외 텍스트 금지

반드시 이 JSON 스키마로만 출력:
{
  "componentName": "string",
  "styledNames": ["S.Container", "S.*"],
  "fileName": "BaseName"
}
    `.trim();

    console.log("Calling Gemini API with prompt length:", prompt.length);

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.response.text(); // Gemini는 텍스트로 JSON 반환
    console.log("Gemini response:", jsonText);

    // JSON 유효성 검증
    try {
      JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Invalid JSON response from Gemini:", jsonText);
      return res.status(500).json({
        error: "Invalid response format from AI service",
        details: String(parseError),
      });
    }

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(jsonText);
  } catch (e: any) {
    console.error("API Error:", e);
    return res.status(500).json({
      error: e?.message || "Server error",
      stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      type: e?.constructor?.name || "Unknown",
    });
  }
}
