"use client";

import { ClientThemeProvider } from "@wrksz/themes/client";

/**
 * @wrksz/themes avoids the React 19 warning from next-themes, which inlined a
 * `<script>` inside a client component (scripts in the React tree are flagged in dev).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClientThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme={false}
    >
      {children}
    </ClientThemeProvider>
  );
}
