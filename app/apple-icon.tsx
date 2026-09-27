import { ImageResponse } from "next/og";

// iPhone/iPad home-screen icon - same design as app/icon.svg, rendered as a PNG
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      // full-bleed square - iOS rounds the corners itself
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#538d4e",
        }}>
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M10 23V9l12 14V9"
            fill="none"
            stroke="#f8f8f8"
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
