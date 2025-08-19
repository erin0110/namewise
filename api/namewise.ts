// api/namewise.ts — Vercel Node.js Serverless Function (REST만 사용)
export default async function handler(req: any, res: any) {
  // 프리플라이트(옵션): CORS 대비
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).send("Missing GEMINI_API_KEY");

  // Vercel 환경에서 body가 문자열/객체 케이스 모두 처리
  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { description, style } = body ?? {};
  if (!description) return res.status(400).send("description is required");

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
}`.trim();

  const glReq = {
    contents: [{ parts: [{ text: prompt }] }], // v1beta 형식
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  };

  try {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(glReq),
      }
    );

    const text = await r.text(); // Gemini는 JSON 텍스트로 반환
    if (!r.ok) return res.status(r.status).send(text);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(text);
  } catch (err: any) {
    // 런타임 크래시 로그를 HTTP 본문으로 노출 (초기 디버깅 편의용)
    return res
      .status(500)
      .send(`Runtime error: ${err?.message || String(err)}`);
  }
}
