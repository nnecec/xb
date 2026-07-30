import type { CustomThemePreset } from '@/lib/app-settings'
import { TWEAKCN_THEME_PRESETS } from '@/lib/tweakcn-theme-presets'

export interface CustomThemePresetDef {
  key: CustomThemePreset
  name: string
  description: string
  lightCss: string
  darkCss: string
}

const THEME_VARIABLE_NAMES = [
  '--radius',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--font-sans',
  '--font-serif',
  '--font-mono',
  '--shadow-x',
  '--shadow-y',
  '--shadow-blur',
  '--shadow-spread',
  '--shadow-opacity',
  '--shadow-color',
  '--shadow-2xs',
  '--shadow-xs',
  '--shadow-sm',
  '--shadow',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-2xl',
  '--tracking-normal',
  '--spacing',
] as const

export const CUSTOM_THEME_VARIABLE_NAMES = [...THEME_VARIABLE_NAMES]

const CUSTOM_THEME_VARIABLE_SET = new Set<string>(CUSTOM_THEME_VARIABLE_NAMES)

export const CUSTOM_THEME_PRESETS: CustomThemePresetDef[] = [
  {
    key: 'default',
    name: 'Default',
    description: 'shadcn 默认中性色',
    lightCss: `--radius: 0.625rem;
--background: oklch(1 0 0);
--foreground: oklch(0.145 0 0);
--card: oklch(1 0 0);
--card-foreground: oklch(0.145 0 0);
--popover: oklch(1 0 0);
--popover-foreground: oklch(0.145 0 0);
--primary: oklch(0.205 0 0);
--primary-foreground: oklch(0.985 0 0);
--secondary: oklch(0.97 0 0);
--secondary-foreground: oklch(0.205 0 0);
--muted: oklch(0.97 0 0);
--muted-foreground: oklch(0.556 0 0);
--accent: oklch(0.97 0 0);
--accent-foreground: oklch(0.205 0 0);
--destructive: oklch(0.577 0.245 27.325);
--border: oklch(0.922 0 0);
--input: oklch(0.922 0 0);
--ring: oklch(0.708 0 0);`,
    darkCss: `--background: oklch(0.145 0 0);
--foreground: oklch(0.985 0 0);
--card: oklch(0.205 0 0);
--card-foreground: oklch(0.985 0 0);
--popover: oklch(0.205 0 0);
--popover-foreground: oklch(0.985 0 0);
--primary: oklch(0.922 0 0);
--primary-foreground: oklch(0.205 0 0);
--secondary: oklch(0.269 0 0);
--secondary-foreground: oklch(0.985 0 0);
--muted: oklch(0.269 0 0);
--muted-foreground: oklch(0.708 0 0);
--accent: oklch(0.269 0 0);
--accent-foreground: oklch(0.985 0 0);
--destructive: oklch(0.704 0.191 22.216);
--border: oklch(1 0 0 / 10%);
--input: oklch(1 0 0 / 15%);
--ring: oklch(0.556 0 0);`,
  },
  {
    key: 'vercel',
    name: 'Vercel',
    description: '高对比黑白产品感',
    lightCss: `--radius: 0.5rem;
--background: #ffffff;
--foreground: #000000;
--card: #ffffff;
--card-foreground: #000000;
--popover: #ffffff;
--popover-foreground: #000000;
--primary: #000000;
--primary-foreground: #ffffff;
--secondary: #f5f5f5;
--secondary-foreground: #111111;
--muted: #f5f5f5;
--muted-foreground: #666666;
--accent: #eeeeee;
--accent-foreground: #111111;
--destructive: #e5484d;
--border: #e5e5e5;
--input: #e5e5e5;
--ring: #000000;`,
    darkCss: `--background: #000000;
--foreground: #ffffff;
--card: #111111;
--card-foreground: #ffffff;
--popover: #111111;
--popover-foreground: #ffffff;
--primary: #ffffff;
--primary-foreground: #000000;
--secondary: #1f1f1f;
--secondary-foreground: #fafafa;
--muted: #1f1f1f;
--muted-foreground: #a3a3a3;
--accent: #262626;
--accent-foreground: #fafafa;
--destructive: #ff6369;
--border: #2e2e2e;
--input: #333333;
--ring: #ffffff;`,
  },
  {
    key: 'twitter',
    name: 'Twitter',
    description: '蓝色强调的社交产品色',
    lightCss: `--radius: 0.75rem;
--background: #ffffff;
--foreground: #0f1419;
--card: #ffffff;
--card-foreground: #0f1419;
--popover: #ffffff;
--popover-foreground: #0f1419;
--primary: #1d9bf0;
--primary-foreground: #ffffff;
--secondary: #eff3f4;
--secondary-foreground: #0f1419;
--muted: #f7f9f9;
--muted-foreground: #536471;
--accent: #e8f5fd;
--accent-foreground: #0f1419;
--destructive: #f4212e;
--border: #eff3f4;
--input: #cfd9de;
--ring: #1d9bf0;`,
    darkCss: `--background: #000000;
--foreground: #e7e9ea;
--card: #000000;
--card-foreground: #e7e9ea;
--popover: #16181c;
--popover-foreground: #e7e9ea;
--primary: #1d9bf0;
--primary-foreground: #ffffff;
--secondary: #202327;
--secondary-foreground: #e7e9ea;
--muted: #16181c;
--muted-foreground: #71767b;
--accent: #061622;
--accent-foreground: #e7e9ea;
--destructive: #f4212e;
--border: #2f3336;
--input: #2f3336;
--ring: #1d9bf0;`,
  },
  {
    key: 'supabase',
    name: 'Supabase',
    description: '绿色强调的开发者工具色',
    lightCss: `--radius: 0.5rem;
--background: #ffffff;
--foreground: #1f2937;
--card: #ffffff;
--card-foreground: #1f2937;
--popover: #ffffff;
--popover-foreground: #1f2937;
--primary: #3ecf8e;
--primary-foreground: #072719;
--secondary: #f1f5f3;
--secondary-foreground: #1f2937;
--muted: #f6f8f7;
--muted-foreground: #6b7280;
--accent: #e8f8f0;
--accent-foreground: #0f5132;
--destructive: #ef4444;
--border: #dfe7e2;
--input: #dfe7e2;
--ring: #3ecf8e;`,
    darkCss: `--background: #0b0f0d;
--foreground: #f8fafc;
--card: #121716;
--card-foreground: #f8fafc;
--popover: #121716;
--popover-foreground: #f8fafc;
--primary: #3ecf8e;
--primary-foreground: #06130d;
--secondary: #1c2420;
--secondary-foreground: #f8fafc;
--muted: #1c2420;
--muted-foreground: #93a39b;
--accent: #10251a;
--accent-foreground: #d6f7e5;
--destructive: #f87171;
--border: #26332d;
--input: #26332d;
--ring: #3ecf8e;`,
  },
  {
    key: 'modern',
    name: 'Modern',
    description: '明亮蓝色强调的现代主题',
    lightCss: `--background: #ffffff;
--foreground: #333333;
--card: #ffffff;
--card-foreground: #333333;
--popover: #ffffff;
--popover-foreground: #333333;
--primary: #3b82f6;
--primary-foreground: #ffffff;
--secondary: #f3f4f6;
--secondary-foreground: #4b5563;
--muted: #f9fafb;
--muted-foreground: #6b7280;
--accent: #e0f2fe;
--accent-foreground: #1e3a8a;
--destructive: #ef4444;
--destructive-foreground: #ffffff;
--border: #e5e7eb;
--input: #e5e7eb;
--ring: #3b82f6;
--chart-1: #3b82f6;
--chart-2: #2563eb;
--chart-3: #1d4ed8;
--chart-4: #1e40af;
--chart-5: #1e3a8a;
--sidebar: #f9fafb;
--sidebar-foreground: #333333;
--sidebar-primary: #3b82f6;
--sidebar-primary-foreground: #ffffff;
--sidebar-accent: #e0f2fe;
--sidebar-accent-foreground: #1e3a8a;
--sidebar-border: #e5e7eb;
--sidebar-ring: #3b82f6;
--font-sans: Inter, sans-serif;
--font-serif: Source Serif 4, serif;
--font-mono: JetBrains Mono, monospace;
--radius: 0.375rem;
--shadow-x: 0;
--shadow-y: 1px;
--shadow-blur: 3px;
--shadow-spread: 0px;
--shadow-opacity: 0.1;
--shadow-color: oklch(0 0 0);
--shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
--shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
--shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
--shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
--tracking-normal: 0em;
--spacing: 0.25rem;`,
    darkCss: `--background: #171717;
--foreground: #e5e5e5;
--card: #262626;
--card-foreground: #e5e5e5;
--popover: #262626;
--popover-foreground: #e5e5e5;
--primary: #3b82f6;
--primary-foreground: #ffffff;
--secondary: #262626;
--secondary-foreground: #e5e5e5;
--muted: #1f1f1f;
--muted-foreground: #a3a3a3;
--accent: #1e3a8a;
--accent-foreground: #bfdbfe;
--destructive: #ef4444;
--destructive-foreground: #ffffff;
--border: #404040;
--input: #404040;
--ring: #3b82f6;
--chart-1: #60a5fa;
--chart-2: #3b82f6;
--chart-3: #2563eb;
--chart-4: #1d4ed8;
--chart-5: #1e40af;
--sidebar: #171717;
--sidebar-foreground: #e5e5e5;
--sidebar-primary: #3b82f6;
--sidebar-primary-foreground: #ffffff;
--sidebar-accent: #1e3a8a;
--sidebar-accent-foreground: #bfdbfe;
--sidebar-border: #404040;
--sidebar-ring: #3b82f6;
--font-sans: Inter, sans-serif;
--font-serif: Source Serif 4, serif;
--font-mono: JetBrains Mono, monospace;
--radius: 0.375rem;
--shadow-x: 0;
--shadow-y: 1px;
--shadow-blur: 3px;
--shadow-spread: 0px;
--shadow-opacity: 0.1;
--shadow-color: oklch(0 0 0);
--shadow-2xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-xs: 0 1px 3px 0px hsl(0 0% 0% / 0.05);
--shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10);
--shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10);
--shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10);
--shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10);
--shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);`,
  },
  {
    key: 'claude',
    name: 'Claude',
    description: '温暖纸面和红棕强调色',
    lightCss: `--radius: 0.7rem;
--background: #f7f3ed;
--foreground: #2f2923;
--card: #fffaf3;
--card-foreground: #2f2923;
--popover: #fffaf3;
--popover-foreground: #2f2923;
--primary: #c15f3c;
--primary-foreground: #fffaf3;
--secondary: #eee7dc;
--secondary-foreground: #3d342d;
--muted: #eee7dc;
--muted-foreground: #766b60;
--accent: #ead8ca;
--accent-foreground: #3d342d;
--destructive: #b42318;
--border: #dfd6ca;
--input: #d8cec1;
--ring: #c15f3c;`,
    darkCss: `--background: #211c18;
--foreground: #f4eee6;
--card: #2b241f;
--card-foreground: #f4eee6;
--popover: #2b241f;
--popover-foreground: #f4eee6;
--primary: #e09b78;
--primary-foreground: #24160f;
--secondary: #382f29;
--secondary-foreground: #f4eee6;
--muted: #382f29;
--muted-foreground: #c6b8aa;
--accent: #49362b;
--accent-foreground: #f4eee6;
--destructive: #f97066;
--border: #443930;
--input: #51443a;
--ring: #e09b78;`,
  },
  ...TWEAKCN_THEME_PRESETS,
]

function cleanValue(value: string) {
  return value.replace(/!important/g, '').trim()
}

export interface ThemePreviewColors {
  background: string
  foreground: string
  card: string
  primary: string
  secondary: string
  accent: string
  destructive: string
  muted: string
  border: string
}

function readPreviewColor(variables: Record<string, string>, key: string, fallback: string) {
  return variables[key] ?? fallback
}

export function getThemePreviewColors(css: string): ThemePreviewColors {
  const variables = parseCustomThemeVariables(css)
  const background = readPreviewColor(variables, '--background', '#ffffff')
  const foreground = readPreviewColor(variables, '--foreground', '#333333')
  const card = readPreviewColor(variables, '--card', background)
  const primary = readPreviewColor(variables, '--primary', '#666666')
  const secondary = readPreviewColor(variables, '--secondary', '#eeeeee')
  const accent = readPreviewColor(variables, '--accent', primary)
  const destructive = readPreviewColor(variables, '--destructive', '#ef4444')
  const muted = readPreviewColor(variables, '--muted', secondary)
  const border = readPreviewColor(variables, '--border', '#e5e5e5')

  return {
    background,
    foreground,
    card,
    primary,
    secondary,
    accent,
    destructive,
    muted,
    border,
  }
}

export function parseCustomThemeVariables(css: string): Record<string, string> {
  const variables: Record<string, string> = {}
  const declarationPattern = /(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi
  let match: RegExpExecArray | null

  while ((match = declarationPattern.exec(css))) {
    const name = match[1]
    const value = match[2]
    if (!name || !value) continue
    if (CUSTOM_THEME_VARIABLE_SET.has(name)) {
      variables[name] = cleanValue(value)
    }
  }

  return variables
}
