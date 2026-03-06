/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores extraídas do Branding ConfirmaMED
        brand: {
          blue: "#0054A6", // Azul Confirmação (Tecnologia/Confiança)
          green: "#79B943", // Verde Cuidado (Saúde/Aprovação)
          dark: "#1e293b", // Cinza Escuro para textos
          light: "#f8fafc", // Cinza Neutro para fundos
          accent: "#00AEEF", // Azul Vibrante para destaques
        },
      },
      fontFamily: {
        // Títulos em Poppins e corpo em Nunito para humanização
        sans: ["Nunito Sans", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
