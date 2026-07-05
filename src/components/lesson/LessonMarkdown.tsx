import ReactMarkdown from "react-markdown";
import { QuizBlock, FlashcardBlock, FillBlock, CalloutBlock } from "./interactive-blocks";

/**
 * Custom mini-parser that splits markdown content by fenced blocks:
 *
 *   :::quiz
 *   {"q":"...","options":["a","b"],"answer":0,"explain":"..."}
 *   :::
 *
 *   :::flashcard
 *   {"front":"...","back":"..."}
 *   :::
 *
 *   :::fill
 *   {"prompt":"...","answer":"..."}
 *   :::
 *
 *   :::callout tip
 *   Text body (markdown-lite)
 *   :::
 */
type Segment =
  | { kind: "md"; text: string }
  | { kind: "quiz" | "flashcard" | "fill"; data: any }
  | { kind: "callout"; variant: any; body: string };

const FENCE_RE = /^:::([a-zA-Z]+)(?:\s+([a-zA-Z]+))?\s*\n([\s\S]*?)\n:::[ \t]*$/gm;

function parse(content: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  const src = content || "";
  let m: RegExpExecArray | null;
  while ((m = FENCE_RE.exec(src)) !== null) {
    if (m.index > last) segs.push({ kind: "md", text: src.slice(last, m.index) });
    const type = m[1].toLowerCase();
    const arg = m[2];
    const body = m[3];
    if (type === "callout") {
      segs.push({ kind: "callout", variant: (arg as any) || "tip", body });
    } else if (type === "quiz" || type === "flashcard" || type === "fill") {
      try {
        const data = JSON.parse(body);
        segs.push({ kind: type, data });
      } catch {
        segs.push({ kind: "md", text: "```\n" + body + "\n```" });
      }
    } else {
      segs.push({ kind: "md", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < src.length) segs.push({ kind: "md", text: src.slice(last) });
  return segs;
}

export default function LessonMarkdown({ content }: { content: string }) {
  const segs = parse(content);
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === "md") return <ReactMarkdown key={i}>{s.text}</ReactMarkdown>;
        if (s.kind === "quiz") return <QuizBlock key={i} {...s.data} />;
        if (s.kind === "flashcard") return <FlashcardBlock key={i} {...s.data} />;
        if (s.kind === "fill") return <FillBlock key={i} {...s.data} />;
        if (s.kind === "callout") return (
          <CalloutBlock key={i} variant={s.variant}>
            <ReactMarkdown>{s.body}</ReactMarkdown>
          </CalloutBlock>
        );
        return null;
      })}
    </>
  );
}
