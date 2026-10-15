import type { Config } from 'tailwindcss';
export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: '#2563EB', 'deep-blue': '#1E40AF', navy: '#0F172A', 'light-blue': '#EFF6FF' } } }, plugins: [] } satisfies Config;
