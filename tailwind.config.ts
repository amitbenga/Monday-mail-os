import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        madrasa: {
          green: "#7DC242",
          blue: "#4FC3D9",
          ink: "#1f2937",
        },
      },
      fontFamily: {
        sans: ['"Heebo"', '"Assistant"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
