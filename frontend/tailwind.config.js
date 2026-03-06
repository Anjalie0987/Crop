/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#4CAF50',
                    dark: '#2E7D32',
                    accent: '#FFC107',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Poppins', 'sans-serif'],
                serif: ['Playfair Display', 'serif'], // Adding a serif option for headings if needed
            },
        },
    },
    plugins: [],
}
