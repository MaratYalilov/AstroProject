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

        forest: {
          DEFAULT: '#79C58D',
          50: '#F2F9F4',
          100: '#E0F1E4',
          200: '#C1E3CA',
          300: '#A2D5B0',
          400: '#83C796',
          500: '#79C58D', // Основной оттенок
          600: '#5A9B6C',
          700: '#427A50',
          800: '#2B5934',
          900: '#143818',
        },
		        clay: {
          50: '#F9F2EF',
          100: '#F0DFD9',
          200: '#E1BFB3',
          300: '#D29F8D',
          400: '#C37F67',
          500: '#C27D6B',  // DEFAULT
          600: '#A15E4D',
          700: '#7A473A',
          800: '#533027',
          900: '#2B1913',
          DEFAULT: '#C27D6B',
        },
        berry: {
          50: '#F5F2F5',
          100: '#E8E0E9',
          200: '#D1C1D3',
          300: '#BAA2BD',
          400: '#A383A7',
          500: '#8A6B8E',  // DEFAULT
          600: '#6E5571',
          700: '#524055',
          800: '#372A39',
          900: '#1B151C',
          DEFAULT: '#8A6B8E',
        },
		  // Nordic Blue (fjords)
  fjord: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
          // Баклажан (final)
        eggplant: {
          50: '#F7F2F6',
          100: '#EBE0E9',
          200: '#D7C1D3',
          300: '#C3A2BD',
          400: '#AF83A7',
          500: '#78477D',  // DEFAULT
          600: '#5F3863',
          700: '#472A4A',
          800: '#2F1C31',
          900: '#180E19',
          DEFAULT: '#78477D',
        },
		        // Терракота (middle)
        terracotta: {
          50: '#FDF3EF',
          100: '#F9E0D6',
          200: '#F3C1AD',
          300: '#EDA284',
          400: '#E7835B',
          500: '#B96A4A',  // DEFAULT
          600: '#94553B',
          700: '#6F402C',
          800: '#4A2A1E',
          900: '#25150F',
          DEFAULT: '#B96A4A',
        },
		        // Пыльно-синий (isolated)
        dustyBlue: {
          50: '#F0F4F5',
          100: '#DAE4E7',
          200: '#B5C9CF',
          300: '#90AEB7',
          400: '#6B939F',
          500: '#5A7B8A',  // DEFAULT
          600: '#48626E',
          700: '#364A53',
          800: '#243137',
          900: '#12191C',
          DEFAULT: '#5A7B8A',
        },
		        // Шалфей (initial)
        sage: {
          50: '#F3F5F0',
          100: '#E2E8DB',
          200: '#C5D1B7',
          300: '#A8BA93',
          400: '#8BA36F',
          500: '#6B7B5E',  // DEFAULT
          600: '#55624B',
          700: '#404A38',
          800: '#2B3125',
          900: '#151913',
          DEFAULT: '#6B7B5E',
        },

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

