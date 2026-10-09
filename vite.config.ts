import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// Vite runs from the project root (npm scripts, CI) and its own root defaults to
// the working directory, so deriving the alias from the working directory keeps
// it correct however Vite loads the config file.
const srcDir = path.resolve(process.cwd(), "src")

// Vite config — https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  server: {
    // Honors the PORT environment variable used by hosted dev environments.
    port: Number(process.env.PORT ?? 5173),
  },
  preview: {
    port: Number(process.env.PORT ?? 5173),
  },
})
