import { ImageResponse } from "next/og";

// preview image shown when the link is shared (Slack, iMessage, LinkedIn, X...)
export const alt = "Not Wordle - guess the hidden five-letter word";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#121213";
const TEXT = "#f8f8f8";
const MUTED = "#818384";
const CORRECT = "#538d4e";
const PRESENT = "#b59f3b";
const ABSENT = "#3a3a3c";

const ROWS: { letter: string; color: string }[][] = [
  [
    { letter: "N", color: ABSENT },
    { letter: "O", color: ABSENT },
    { letter: "T", color: ABSENT },
  ],
  [
    { letter: "W", color: CORRECT },
    { letter: "O", color: PRESENT },
    { letter: "R", color: CORRECT },
    { letter: "D", color: ABSENT },
    { letter: "L", color: PRESENT },
    { letter: "E", color: CORRECT },
  ],
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: BG,
        color: TEXT,
      }}>
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex", gap: 16 }}>
          {row.map((tile, i) => (
            <div
              key={i}
              style={{
                width: 120,
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tile.color,
                fontSize: 72,
                fontWeight: 700,
              }}>
              {tile.letter}
            </div>
          ))}
        </div>
      ))}
      <div
        style={{ display: "flex", marginTop: 32, fontSize: 36, color: MUTED }}>
        notwordle.app
      </div>
    </div>,
    { ...size },
  );
}
