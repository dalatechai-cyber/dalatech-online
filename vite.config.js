import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Rollup reports an import of a name a module does not export as a warning and
// then carries on, so `npm run build` stayed green while `App.jsx` imported a
// `heroHour` that `scenes.js` has never exported — and Vite's dev server, which
// resolves the same import strictly, threw. Treat the warnings that mean the
// bundle is already broken as errors.
const FATAL_WARNINGS = new Set([
  "MISSING_EXPORT",
  "UNRESOLVED_IMPORT",
  "MISSING_GLOBAL_NAME",
  "CIRCULAR_DEPENDENCY",
]);

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (FATAL_WARNINGS.has(warning.code)) {
          throw new Error(
            `[build] ${warning.code}: ${warning.message}` +
              (warning.id ? `\n  in ${warning.id}` : "")
          );
        }
        defaultHandler(warning);
      },
    },
  },
});
