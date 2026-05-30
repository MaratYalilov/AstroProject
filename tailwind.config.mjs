/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
    "./src/content/**/*.{md,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
        // forest (initial)
        forest: {
          50:  '#F6F8F1',
          100: '#EDF1E3',
          200: '#D7E0C1',
          300: '#B7C68F',
          400: '#8FA45B',
          500: '#667F35',
          600: '#556A2D',
          700: '#445524',
          800: '#333F1B',
          900: '#222A12',
        },
		        // Терракота (middle)
terracotta: {
  50:  '#FCF5F4',
  100: '#F8E8E6',
  200: '#EFCBC8',
  300: '#E0A19D',
  400: '#C86A63',
  500: '#943634',
  600: '#7D2E2C',
  700: '#662523',
  800: '#4F1D1B',
  900: '#381412',
},
        // Баклажан (final)
        eggplant: {
          50:  '#F7F5FA',
          100: '#EDE7F3',
          200: '#D7C9E6',
          300: '#BEA6D6',
          400: '#A07BC2',
          500: '#78477D', // DEFAULT
          600: '#643A68',
          700: '#502F53',
          800: '#3C223E',
          900: '#281629',
        },
        // fjords (isolated) 
        fjord: {
          50:  '#F3F7FB',
          100: '#E7EFF7',
          200: '#C9DCEF',
          300: '#9DBFE0',
          400: '#6F9ECD',
          500: '#3C6DA2',
          600: '#335C89',
          700: '#294A70',
          800: '#1F3857',
          900: '#15263E',
        }
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

