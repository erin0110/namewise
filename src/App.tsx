import { useMemo, useState } from "react";
import styled, { createGlobalStyle } from "styled-components";

/**
 * NameWise — AI Naming Assistant (no extension selection)
 * - Client calls /api/namewise (serverless proxy stores API key)
 * - Outputs: componentName, styledNames, fileName (base only, no ext)
 */

// ---------- Global Styles ----------
const GlobalStyle = createGlobalStyle`
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
`;

// ---------- styled-components ----------
const S = {
  AppShell: styled.div`
    display: grid;
    place-items: center;
    height: 100vh;
    background: radial-gradient(
        1200px 600px at 10% -10%,
        rgba(99, 102, 241, 0.12),
        transparent 55%
      ),
      radial-gradient(
        900px 400px at 90% 110%,
        rgba(168, 85, 247, 0.12),
        transparent 60%
      ),
      linear-gradient(180deg, rgba(0, 0, 0, 0.02), transparent 40%);
  `,
  Card: styled.div`
    width: 480px;
    max-width: 92vw;
    height: 600px;
    max-height: 92vh;
    background: rgba(17, 24, 39, 0.9);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    display: grid;
    grid-template-rows: auto auto 1fr;
    overflow: hidden;
  `,
  Header: styled.header`
    padding: 16px;
    display: grid;
    gap: 4px;
    background: rgba(31, 41, 55, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  `,
  Title: styled.h1`
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    display: flex;
    gap: 8px;
    align-items: center;
  `,
  Subtitle: styled.div`
    font-size: 12px;
    opacity: 0.7;
  `,
  Badge: styled.span`
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 8px;
    background: linear-gradient(135deg, #22c55e, #6366f1, #a855f7);
  `,
  InputArea: styled.div`
    padding: 14px 16px;
    display: grid;
    gap: 10px;
  `,
  Label: styled.label`
    font-size: 12px;
    opacity: 0.8;
    letter-spacing: 0.2px;
  `,
  Textarea: styled.textarea`
    min-height: 64px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(31, 41, 55, 0.6);
    color: #e5e7eb;
    font-size: 14px;
  `,
  Select: styled.select`
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(31, 41, 55, 0.6);
    color: #e5e7eb;
  `,
  Button: styled.button`
    padding: 12px 14px;
    border-radius: 12px;
    font-weight: 800;
    border: none;
    color: white;
    background: linear-gradient(
      90deg,
      #22c55e,
      #10b981,
      #06b6d4,
      #6366f1,
      #a855f7
    );
    background-size: 200% 100%;
    cursor: pointer;
    transition: transform 0.02s ease, background-position 0.6s ease;
    &:hover {
      background-position: 100% 0;
    }
    &:active {
      transform: translateY(1px);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
  Main: styled.main`
    padding: 12px 16px;
    display: grid;
    gap: 10px;
    overflow: auto;
  `,
  SectionTitle: styled.h2`
    font-size: 12px;
    opacity: 0.8;
    margin: 0 0 4px 0;
    letter-spacing: 0.2px;
  `,
  ResultCard: styled.div`
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 10px;
    display: grid;
    gap: 8px;
    background: rgba(31, 41, 55, 0.5);
  `,
  ResultRow: styled.div`
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    padding: 8px 10px;
    border-radius: 10px;
  `,
  Code: styled.code`
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    font-size: 13px;
  `,
  CopyBtn: styled.button`
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: #e5e7eb;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
  `,
  Small: styled.small`
    opacity: 0.7;
    font-size: 11px;
  `,
};

// ---------- helpers ----------
function toCase(style: NamingStyle, name: string) {
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (!words.length) return "";
  switch (style) {
    case "PascalCase":
      return words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
    case "camelCase":
      return words
        .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w))
        .join("");
    case "kebab-case":
      return words.join("-");
    case "snake_case":
      return words.join("_");
  }
}

// ---------- types ----------
type NamingStyle = "PascalCase" | "camelCase" | "kebab-case" | "snake_case";
type NamewiseResult = {
  componentName: string;
  styledNames: string[];
  fileName?: string;
};
type HistoryItem = {
  id: string;
  description: string;
  style: NamingStyle;
  result: { componentName: string; styledNames: string[]; fileName: string };
  createdAt: number;
};

// ---------- component ----------
export default function App() {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<NamingStyle>("PascalCase");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HistoryItem["result"] | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("namewise.history") || "[]");
    } catch {
      return [];
    }
  });

  const canSubmit = useMemo(
    () => description.trim().length > 3 && !loading,
    [description, loading]
  );

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/namewise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), style }),
      });
      if (!res.ok) throw new Error(await res.text());
      const parsed: NamewiseResult = await res.json();
      const componentName = toCase(style, parsed.componentName || "");
      const styledNames = (parsed.styledNames || []).map(
        (s) => `S.${toCase("PascalCase", s.replace(/^S\./, ""))}`
      );
      const fileBase = toCase(
        style,
        (parsed.fileName || parsed.componentName || "Component").replace(
          /\.(t|j)sx?$/i,
          ""
        )
      );
      const adjusted = { componentName, styledNames, fileName: fileBase };
      setResult(adjusted);

      const item: HistoryItem = {
        id: crypto.randomUUID(),
        description: description.trim(),
        style,
        result: adjusted,
        createdAt: Date.now(),
      };
      const next = [item, ...history].slice(0, 20);
      setHistory(next);
      localStorage.setItem("namewise.history", JSON.stringify(next));
    } catch (e: any) {
      setError(e?.message || "문제가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <>
      <GlobalStyle />
      <S.AppShell>
        <S.Card>
          <S.Header>
            <S.Title>
              <S.Badge>☆</S.Badge> AI Naming Assistant
            </S.Title>
            <S.Subtitle>Generate component names from descriptions</S.Subtitle>
          </S.Header>

          <S.InputArea>
            <S.Label>Feature Description</S.Label>
            <S.Textarea
              placeholder="클릭하면 이미지가 확대되는 썸네일"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <S.Label>Naming Style</S.Label>
            <S.Select
              value={style}
              onChange={(e) => setStyle(e.target.value as NamingStyle)}
            >
              <option>PascalCase</option>
              <option>camelCase</option>
              <option>kebab-case</option>
              <option>snake_case</option>
            </S.Select>

            <S.Button onClick={generate} disabled={!canSubmit}>
              {loading ? "Generating..." : "Generate Names"}
            </S.Button>
            {error && <S.Small style={{ color: "#fca5a5" }}>{error}</S.Small>}
          </S.InputArea>

          <S.Main>
            <S.SectionTitle>Generated Names</S.SectionTitle>
            {result && (
              <S.ResultCard>
                <S.ResultRow>
                  <div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      COMPONENT NAME
                    </div>
                    <S.Code>{result.componentName}</S.Code>
                  </div>
                  <S.CopyBtn onClick={() => copy(result.componentName)}>
                    복사
                  </S.CopyBtn>
                </S.ResultRow>
                <S.ResultRow>
                  <div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      STYLED COMPONENT
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.styledNames.map((n, i) => (
                        <S.Code key={i}>{n}</S.Code>
                      ))}
                    </div>
                  </div>
                  <S.CopyBtn
                    onClick={() => copy(result.styledNames.join(", "))}
                  >
                    복사
                  </S.CopyBtn>
                </S.ResultRow>
                <S.ResultRow>
                  <div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      FILE NAME (no ext)
                    </div>
                    <S.Code>{result.fileName}</S.Code>
                  </div>
                  <S.CopyBtn onClick={() => copy(result.fileName)}>
                    복사
                  </S.CopyBtn>
                </S.ResultRow>
              </S.ResultCard>
            )}
          </S.Main>
        </S.Card>
      </S.AppShell>
    </>
  );
}
