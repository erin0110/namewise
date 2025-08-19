// api/namewise.ts  (Vercel Node.js Serverless Function)
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { description, style } = (req.body ?? {}) as {
      description?: string;
      style?: string;
    };
    if (!description) return res.status(400).send("description is required");

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

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.response.text(); // Gemini는 텍스트로 JSON 반환
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(jsonText);
  } catch (e: any) {
    return res.status(500).send(e?.message || "Server error");
  }
}
