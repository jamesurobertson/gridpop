
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
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
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
                // GridPop game colors - updated with new palette
                gridpop: {
                    bg: '#ffffff',
                    emptycell: '#f1f1f1',
                    cell0: '#f1f1f1',
                    cell1: '#FAD4C0',
                    cell2: '#B6E0FE',
                    cell3: '#C3F5D0',
                    cell4: '#D9CEFF',
                    cell5: '#FFF3B0',
                    cell6: '#F8A0A0',
                    cell7: '#FF7070',
                    textColor1: '#D48F82',
                    textColor2: '#5BA3D9',
                    textColor3: '#6BBF9E',
                    textColor4: '#8E7DCC',
                    textColor5: '#D1B347',
                    textColor6: '#C25C5C',
                    textColor7: '#B91C1C',
                    tetroI: '#B6E0FE',  // Sky Blue
                    tetroO: '#FFF3B0',  // Pale Lemon
                    tetroT: '#D9CEFF',  // Lavender Mist
                    tetroS: '#C3F5D0',  // Mint Green
                    tetroZ: '#F8A0A0',  // Pastel Red
                    tetroL: '#FAD4C0',  // Soft Coral
                    tetroJ: '#B6E0FE',  // Sky Blue
                },
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'score-float': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0) translateX(-50%) scale(1)',
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(-100px) translateX(-50%) scale(1.5)',
					},
				},
				'game-over': {
					'0%, 100%': { transform: 'translateX(0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
					'20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'score-float': 'score-float 1.5s ease-out forwards',
				'game-over': 'game-over 0.5s ease-in-out',
			},
			textShadow: {
				sm: '0 1px 2px rgba(0,0,0,0.2)',
				DEFAULT: '0 2px 4px rgba(0,0,0,0.2)',
				lg: '0 8px 16px rgba(0,0,0,0.2)',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
