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
			fontFamily: {
				sans: ['Segoe UI', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif'],
			},
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
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Blue-based color palette
				'blue-deep': 'hsl(var(--blue-deep))',
				'blue-primary': 'hsl(var(--blue-primary))',
				'blue-light': 'hsl(var(--blue-light))',
				'blue-pale': 'hsl(var(--blue-pale))',
				navy: 'hsl(var(--navy))',
				cyan: 'hsl(var(--cyan))',
				teal: 'hsl(var(--teal))',
				sky: 'hsl(var(--sky))',
				indigo: 'hsl(var(--indigo))',
				purple: 'hsl(var(--purple))',
				green: 'hsl(var(--green))',
				emerald: 'hsl(var(--emerald))',
				gold: 'hsl(var(--gold))',
				orange: 'hsl(var(--orange))',
				pink: 'hsl(var(--pink))',
				rose: 'hsl(var(--rose))',
				glass: {
					DEFAULT: 'hsl(var(--glass-background))',
					border: 'hsl(var(--glass-border))',
					highlight: 'hsl(var(--glass-highlight))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'2xl': 'calc(var(--radius) + 8px)',
				'3xl': 'calc(var(--radius) + 16px)'
			},
			boxShadow: {
				'glass': '0 8px 32px hsl(var(--glass-shadow)), inset 0 1px 0 hsl(var(--glass-highlight))',
				'glass-lg': '0 16px 48px hsl(var(--glass-shadow)), inset 0 2px 0 hsl(var(--glass-highlight))',
				'glow': '0 0 30px hsl(var(--primary) / 0.4)',
				'glow-lg': '0 0 60px hsl(var(--primary) / 0.5)',
				'glow-cyan': '0 0 35px hsl(var(--cyan) / 0.4)',
				'glow-emerald': '0 0 35px hsl(var(--emerald) / 0.4)',
				'glow-gold': '0 0 35px hsl(var(--gold) / 0.4)',
				'glow-teal': '0 0 35px hsl(var(--teal) / 0.4)',
				'glow-green': '0 0 35px hsl(var(--green) / 0.4)',
				'soft': '0 4px 24px hsl(var(--primary) / 0.18)',
				'soft-lg': '0 8px 48px hsl(var(--primary) / 0.25)',
				'elevated': '0 12px 40px hsl(var(--glass-shadow)), 0 4px 12px hsl(var(--primary) / 0.1)'
			},
      keyframes: {
        shimmer: {
          "100%": {
            transform: "translateX(100%)",
          },
        },
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-in-down': {
					'0%': { opacity: '0', transform: 'translateY(-20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-in-bounce': {
					'0%': { transform: 'scale(0.9)', opacity: '0' },
					'50%': { transform: 'scale(1.02)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)', opacity: '0.6' },
					'50%': { transform: 'translateY(-15px)', opacity: '0.8' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
					'50%': { opacity: '0.8', transform: 'scale(1.02)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 15px hsl(var(--primary) / 0.3)' },
					'50%': { boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'bounce-soft': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(-3deg)' },
					'75%': { transform: 'rotate(3deg)' }
				},
				'pulse-ring': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(1.5)', opacity: '0' }
				},
				'border-glow': {
					'0%, 100%': { borderColor: 'hsl(var(--primary) / 0.3)' },
					'50%': { borderColor: 'hsl(var(--primary) / 0.6)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-in-up': 'fade-in-up 0.4s ease-out',
				'fade-in-down': 'fade-in-down 0.4s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'scale-in-bounce': 'scale-in-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'shimmer': 'shimmer 2s linear infinite',
				'float': 'float 15s ease-in-out infinite',
				'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
				'wiggle': 'wiggle 0.5s ease-in-out',
				'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
				'border-glow': 'border-glow 2s ease-in-out infinite'
			},
			backdropBlur: {
				'glass': '20px'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
