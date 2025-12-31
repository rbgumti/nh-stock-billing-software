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
				// Liquid Glass Color Palette
				gold: 'hsl(var(--gold))',
				navy: 'hsl(var(--navy))',
				purple: 'hsl(var(--purple))',
				cyan: 'hsl(var(--cyan))',
				pink: 'hsl(var(--pink))',
				teal: 'hsl(var(--teal))',
				orange: 'hsl(var(--orange))',
				emerald: 'hsl(var(--emerald))',
				lime: 'hsl(var(--lime))',
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
				'3xl': 'calc(var(--radius) + 16px)',
				'4xl': 'calc(var(--radius) + 24px)'
			},
			boxShadow: {
				'glass': '0 8px 32px hsl(var(--glass-shadow)), inset 0 1px 0 hsl(var(--glass-highlight))',
				'glass-lg': '0 16px 64px hsl(var(--glass-shadow)), inset 0 2px 0 hsl(var(--glass-highlight))',
				'glass-xl': '0 24px 80px hsl(var(--glass-shadow)), inset 0 2px 0 hsl(var(--glass-highlight))',
				'glow': '0 0 30px hsl(var(--teal) / 0.35)',
				'glow-lg': '0 0 60px hsl(var(--teal) / 0.45)',
				'glow-teal': '0 0 40px hsl(var(--teal) / 0.4)',
				'glow-cyan': '0 0 40px hsl(var(--cyan) / 0.4)',
				'glow-lime': '0 0 40px hsl(var(--lime) / 0.45)',
				'glow-emerald': '0 0 40px hsl(var(--emerald) / 0.4)',
				'liquid': '0 10px 50px -10px hsl(var(--teal) / 0.3), 0 8px 25px -8px hsl(var(--cyan) / 0.2)',
				'liquid-lg': '0 20px 70px -15px hsl(var(--teal) / 0.35), 0 15px 40px -12px hsl(var(--cyan) / 0.25)'
			},
			keyframes: {
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
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-12px)' }
				},
				'float-slow': {
					'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
					'50%': { transform: 'translateY(-20px) rotate(5deg)' }
				},
				'liquid-morph': {
					'0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
					'25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
					'50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
					'75%': { borderRadius: '60% 40% 60% 30% / 60% 40% 60% 40%' }
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--teal) / 0.4)' },
					'50%': { boxShadow: '0 0 0 20px hsl(var(--teal) / 0)' }
				},
				'gradient-shift': {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'fade-in-up': 'fade-in-up 0.5s ease-out',
				'scale-in': 'scale-in 0.3s ease-out',
				'shimmer': 'shimmer 2.5s linear infinite',
				'float': 'float 4s ease-in-out infinite',
				'float-slow': 'float-slow 6s ease-in-out infinite',
				'liquid-morph': 'liquid-morph 15s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'gradient-shift': 'gradient-shift 4s ease infinite'
			},
			backdropBlur: {
				'glass': '20px',
				'glass-lg': '30px',
				'glass-xl': '40px'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'glass-gradient': 'linear-gradient(135deg, hsl(0 0% 100% / 0.1), hsl(0 0% 100% / 0.05))',
				'liquid-gradient': 'linear-gradient(135deg, hsl(var(--teal) / 0.1), hsl(var(--cyan) / 0.05), hsl(var(--lime) / 0.05))'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;