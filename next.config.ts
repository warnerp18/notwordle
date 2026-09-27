import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // auto-memoizes components and hooks, so no manual useMemo/useCallback needed
  reactCompiler: true,
};

export default nextConfig;
