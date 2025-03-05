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
        'purple': '#2f59cf',
        'deep-purple': '#00185c',
        'light-white': '#f6f8fd',
      },
      fontFamily: {
        'title': ['"Fraktion Sans Variable"', '"uncut sans"', 'system-ui', '-apple-system', 'sans-serif'],
        'body': ['"Soehne"', '"uncut sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
  safelist: ["w-32", "w-44", "w-52"],
};
export default config;
