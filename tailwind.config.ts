import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "google-blue": "#1a73e8",
        "google-red": "#ea4335",
        "google-yellow": "#fbbc04",
        "google-green": "#34a853",
        "bucket-a": "#ea4335",
        "bucket-b": "#fbbc04",
        "bucket-c": "#34a853",
        "bucket-d": "#ff9800",
        "bucket-e": "#1a73e8",
        "bucket-f": "#673ab7",
        "bucket-g": "#9e9e9e",
      },
    },
  },
  plugins: [],
};
export default config;
