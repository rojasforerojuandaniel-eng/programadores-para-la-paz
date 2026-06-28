# Rhynode Finance — App Nativa Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una app Android nativa real con Expo Router + React Native que consuma el backend Next.js existente, incluyendo todas las funciones actuales de Rhynode Finance, con diseño premium y capacidades nativas (biometría, cámara OCR, push, voz, offline).

**Architecture:** Monorepo con `npm workspaces`: el proyecto Next.js existente permanece intacto en `src/`; la app móvil vive en `apps/mobile/`; el código compartido (Zod schemas, helpers financieros, tipos, keys i18n) se extrae a `packages/shared/`. La app móvil consume los endpoints `/api/*` actuales y agrega tres endpoints nativos (`/api/mobile/push-token`, `/api/mobile/upload-receipt`, `/api/mobile/health`).

**Tech Stack:** Expo SDK 53, React Native 0.79, Expo Router, NativeWind + React Native Reusables, lucide-react-native, React Hook Form + Zod, Reanimated 3 + Moti, victory-native-xl, TanStack Query, Zustand, @clerk/clerk-expo, expo-secure-store, expo-sqlite, expo-camera, expo-notifications, expo-local-authentication, Maestro, EAS Build.

---

## File Structure Map

```
rhynode-finance/
├── package.json                  # MODIFICAR: agregar workspaces
├── tsconfig.json                 # MODIFICAR: opcionalmente references
├── .eslintrc.js / eslint.config  # MODIFICAR: incluir apps/mobile y packages/shared
├── .prettierrc                   # SIN cambios (o ajustar si es necesario)
├── .husky/                       # MODIFICAR: incluir lint de mobile/shared
├── src/                          # Next.js web (existente, sin tocar lógica de negocio)
├── native/                       # MODIFICAR/LEGACY: mover a native-legacy/ o eliminar tras validación
├── apps/
│   └── mobile/                   # NUEVO
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── (auth)/
│       │   │   ├── _layout.tsx
│       │   │   ├── sign-in.tsx
│       │   │   └── onboarding.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── index.tsx
│       │   │   ├── transactions.tsx
│       │   │   ├── add.tsx
│       │   │   ├── plan.tsx
│       │   │   └── more.tsx
│       │   ├── dashboard/
│       │   ├── personal/
│       │   ├── business/
│       │   ├── advisor/
│       │   │   └── index.tsx
│       │   ├── settings/
│       │   │   └── index.tsx
│       │   └── camera.tsx
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── text.tsx
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── sheet.tsx
│       │   │   │   └── avatar.tsx
│       │   │   └── features/
│       │   │       ├── balance-card.tsx
│       │   │       ├── transaction-list-item.tsx
│       │   │       ├── quick-add-form.tsx
│       │   │       └── bottom-tab-bar.tsx
│       │   ├── screens/
│       │   ├── hooks/
│       │   │   ├── use-auth.ts
│       │   │   ├── use-api.ts
│       │   │   ├── use-biometric.ts
│       │   │   └── use-network.ts
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   ├── auth.ts
│       │   │   ├── storage.ts
│       │   │   ├── i18n.ts
│       │   │   ├── theme.ts
│       │   │   ├── notifications.ts
│       │   │   ├── offline-queue.ts
│       │   │   └── biometric.ts
│       │   ├── types/
│       │   └── constants.ts
│       ├── assets/
│       ├── package.json
│       ├── app.json
│       ├── eas.json
│       ├── babel.config.js
│       ├── metro.config.js
│       ├── nativewind-env.d.ts
│       └── tsconfig.json
└── packages/
    └── shared/                   # NUEVO
        ├── src/
        │   ├── index.ts
        │   ├── schemas/
        │   │   ├── transaction.ts
        │   │   ├── budget.ts
        │   │   ├── goal.ts
        │   │   ├── debt.ts
        │   │   └── index.ts
        │   ├── types/
        │   │   └── index.ts
        │   ├── finance/
        │   │   ├── health-score.ts
        │   │   ├── format.ts
        │   │   ├── currency.ts
        │   │   ├── decimal.ts
        │   │   ├── transaction-categories.ts
        │   │   └── voice-parse.ts
        │   └── i18n/
        │       └── keys.ts
        ├── package.json
        └── tsconfig.json
```

---

## Phase 0 — Workspace Setup & Foundation (Week 1)

**Deliverable:** `apps/mobile/` compila con Expo Router, NativeWind, design system base, i18n es/en, y `packages/shared/` publicado localmente. La app muestra una pantalla "Hello Rhynode" con tema oscuro, un botón reusable y cambio de idioma.

### Task 0.1: Configure npm workspaces

**Files:**
- Modify: `package.json`
- Modify: `.eslintrc.js` or `eslint.config.mjs`
- Modify: `.husky/pre-commit`

- [ ] **Step 1: Add workspaces to root `package.json`**

Add at the top level (before or after `private`):

```json
{
  "name": "rhynode-finance",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  ...
}
```

- [ ] **Step 2: Update ESLint config to include mobile and shared**

If using flat config (`eslint.config.mjs`), add workspace globs to the existing include patterns, e.g.:

```js
// eslint.config.mjs — add to the relevant config object
{
  files: ["src/**/*.{ts,tsx}", "apps/mobile/**/*.{ts,tsx}", "packages/shared/**/*.{ts,tsx}"],
}
```

If using `.eslintrc.js`, extend `ignorePatterns` if needed and ensure `parserOptions.project` includes the new tsconfigs.

- [ ] **Step 3: Update Husky pre-commit hook**

Edit `.husky/pre-commit` (or `.husky/pre-commit.mjs`) so lint-staged also runs over `apps/mobile` and `packages/shared`:

```bash
#!/bin/sh
npx lint-staged
```

Ensure `lint-staged` in root `package.json` covers the new paths:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "bash -c 'npx tsc --noEmit --project tsconfig.json'",
    "bash -c 'npx tsc --noEmit --project apps/mobile/tsconfig.json'",
    "bash -c 'npx tsc --noEmit --project packages/shared/tsconfig.json'"
  ]
}
```

- [ ] **Step 4: Run install and verify workspaces**

```bash
cd /home/juan-daniel/rhynode-finance
npm install
```

Expected: `node_modules` symlinks `apps/mobile` and `packages/shared`.

- [ ] **Step 5: Commit**

```bash
git add package.json .eslintrc.js .husky/pre-commit

git commit -m "chore(mobile): configure npm workspaces for web + mobile + shared"
```

---

### Task 0.2: Create shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/finance/format.ts`
- Create: `packages/shared/src/finance/currency.ts`
- Create: `packages/shared/src/finance/transaction-categories.ts`
- Create: `packages/shared/src/schemas/transaction.ts`
- Create: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@rhynode/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./finance": "./src/finance/index.ts",
    "./types": "./src/types/index.ts"
  },
  "devDependencies": {
    "typescript": "^5",
    "zod": "^4.4.3"
  },
  "peerDependencies": {
    "zod": "^4.4.3"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Extract format helper**

Create `packages/shared/src/finance/format.ts` by copying the relevant formatting functions from `src/lib/format.ts`. Start with:

```ts
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(d);
}
```

- [ ] **Step 4: Extract categories**

Create `packages/shared/src/finance/transaction-categories.ts`:

```ts
export const COMMON_CATEGORIES = [
  { id: 'food', labelKey: 'categories.food', type: 'expense' },
  { id: 'transport', labelKey: 'categories.transport', type: 'expense' },
  { id: 'housing', labelKey: 'categories.housing', type: 'expense' },
  { id: 'health', labelKey: 'categories.health', type: 'expense' },
  { id: 'entertainment', labelKey: 'categories.entertainment', type: 'expense' },
  { id: 'salary', labelKey: 'categories.salary', type: 'income' },
  { id: 'investment', labelKey: 'categories.investment', type: 'income' },
  { id: 'other', labelKey: 'categories.other', type: 'both' },
] as const;
```

- [ ] **Step 5: Create shared transaction schema**

Create `packages/shared/src/schemas/transaction.ts`:

```ts
import { z } from 'zod';

export const transactionSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, 'Category is required'),
  accountId: z.string().min(1, 'Account is required'),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string().datetime(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
```

- [ ] **Step 6: Barrel exports**

Create `packages/shared/src/index.ts`:

```ts
export * from './finance/format';
export * from './finance/transaction-categories';
export * from './schemas/transaction';
export type * from './types';
```

- [ ] **Step 7: Install and test shared package locally**

```bash
cd /home/juan-daniel/rhynode-finance
npm install
npx tsc --noEmit --project packages/shared/tsconfig.json
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): extract shared schemas, format helpers and categories"
```

---

### Task 0.3: Bootstrap Expo app with Expo Router

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`
- Modify: `native/` → `native-legacy/`

- [ ] **Step 1: Write `apps/mobile/package.json`**

```json
{
  "name": "@rhynode/mobile",
  "version": "0.1.0",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@clerk/clerk-expo": "^2.0.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@react-native-community/netinfo": "11.4.1",
    "@rhynode/shared": "*",
    "@tanstack/react-query": "^5.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "expo": "~53.0.0",
    "expo-camera": "~16.0.0",
    "expo-linking": "~7.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-notifications": "~0.31.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-speech-recognition": "^1.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-status-bar": "~2.2.0",
    "i18next": "^24.0.0",
    "lucide-react-native": "^0.487.0",
    "moti": "^0.30.0",
    "nativewind": "^4.1.0",
    "react": "19.0.0",
    "react-hook-form": "^7.54.0",
    "react-i18next": "^15.0.0",
    "react-native": "0.79.0",
    "react-native-gesture-handler": "~2.24.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.10.0",
    "react-native-svg": "15.8.0",
    "react-native-webview": "13.12.0",
    "tailwind-merge": "^3.0.0",
    "victory-native-xl": "^41.0.0",
    "zod": "^4.4.3",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~19.0.0",
    "react-native-reusables": "^0.21.0",
    "typescript": "~5.5.0"
  }
}
```

- [ ] **Step 2: Run `npx expo install --check` to pin versions**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo install --check
```

Expected: package.json updated with exact SDK 53 compatible versions.

- [ ] **Step 3: Write `apps/mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"],
      "@rhynode/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 4: Write `apps/mobile/babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Write `apps/mobile/metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '../../packages/shared'),
];

config.resolver.extraNodeModules = {
  '@rhynode/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
};

module.exports = config;
```

- [ ] **Step 6: Write minimal `apps/mobile/app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '~/lib/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
```

- [ ] **Step 7: Write `apps/mobile/app/index.tsx`**

```tsx
import { View, Text } from 'react-native';
import { Button } from '~/components/ui/button';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-foreground mb-4">Hello Rhynode</Text>
      <Button>
        <Text className="text-primary-foreground font-semibold">Empezar</Text>
      </Button>
    </View>
  );
}
```

- [ ] **Step 8: Move legacy native shell**

```bash
cd /home/juan-daniel/rhynode-finance
git mv native native-legacy
```

Update root `.gitignore` if `native/` was ignored; ensure `native-legacy/` is not accidentally picked up by new tooling.

- [ ] **Step 9: Verify the app builds**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo start --android
```

Expected: Metro bundler starts and the app renders the "Hello Rhynode" screen in the Android emulator.

- [ ] **Step 10: Commit**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile native-legacy

git commit -m "feat(mobile): bootstrap Expo Router app with shared package"
```

---

### Task 0.4: Configure NativeWind and create base design tokens

**Files:**
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/src/lib/theme.tsx`
- Create: `apps/mobile/src/components/ui/button.tsx`
- Create: `apps/mobile/src/components/ui/text.tsx`
- Create: `apps/mobile/src/components/ui/card.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Create `apps/mobile/tailwind.config.js`**

```js
const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 5.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 160 84% 39%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4% 16%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;
  --accent: 217 91% 60%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 160 84% 39%;
  --success: 160 84% 39%;
  --success-foreground: 0 0% 98%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 98%;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
  --radius-2xl: 1.5rem;
  --radius-3xl: 2rem;
}
```

- [ ] **Step 3: Create `apps/mobile/src/lib/theme.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = '@rhynode/theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      }
    });
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const resolvedTheme = theme === 'system' ? deviceScheme ?? 'dark' : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 4: Import global CSS in layout**

Modify `apps/mobile/app/_layout.tsx`:

```tsx
import '../global.css';
import { Stack } from 'expo-router';
...
```

- [ ] **Step 5: Create reusable Button component**

Create `apps/mobile/src/components/ui/button.tsx`:

```tsx
import { Pressable, Text, ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-2xl px-5 py-3 active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        destructive: 'bg-destructive',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'h-12',
        sm: 'h-9 px-3',
        lg: 'h-14 px-6',
        icon: 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps extends ViewProps, VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Pressable>
  );
}
```

- [ ] **Step 6: Create `apps/mobile/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Verify NativeWind compiles**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo start --android
```

Expected: app still runs and the Button has green background (`bg-primary`).

- [ ] **Step 8: Commit**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile/src apps/mobile/global.css apps/mobile/tailwind.config.js apps/mobile/babel.config.js apps/mobile/metro.config.js apps/mobile/app/_layout.tsx

git commit -m "feat(mobile): add NativeWind theme and base components"
```

---

### Task 0.5: Configure i18n for mobile

**Files:**
- Create: `apps/mobile/src/lib/i18n.ts`
- Create: `apps/mobile/src/locales/es.json`
- Create: `apps/mobile/src/locales/en.json`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Create minimal locale files**

`apps/mobile/src/locales/es.json`:

```json
{
  "common": {
    "appName": "Rhynode",
    "getStarted": "Empezar",
    "hello": "Hola"
  }
}
```

`apps/mobile/src/locales/en.json`:

```json
{
  "common": {
    "appName": "Rhynode",
    "getStarted": "Get Started",
    "hello": "Hello"
  }
}
```

- [ ] **Step 2: Create `apps/mobile/src/lib/i18n.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import es from '../locales/es.json';
import en from '../locales/en.json';

const resources = { es: { translation: es }, en: { translation: en } };

i18n.use(initReactI18next).init({
  resources,
  lng: Localization.getLocales()[0]?.languageCode ?? 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 3: Import i18n in layout**

Modify `apps/mobile/app/_layout.tsx`:

```tsx
import '../global.css';
import '~/lib/i18n';
...
```

- [ ] **Step 4: Use translation in home screen**

Modify `apps/mobile/app/index.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
...
export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <View ...>
      <Text ...>{t('common.hello')}</Text>
      <Button><Text ...>{t('common.getStarted')}</Text></Button>
    </View>
  );
}
```

- [ ] **Step 5: Add typecheck and commit**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx tsc --noEmit
```

Expected: passes.

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile/src/locales apps/mobile/src/lib/i18n.ts apps/mobile/app/_layout.tsx apps/mobile/app/index.tsx

git commit -m "feat(mobile): configure i18next with es/en locales"
```

---

## Phase 1 — Auth & Navigation (Weeks 1–2)

### Task 1.1: Integrate Clerk Expo authentication

**Files:**
- Create: `apps/mobile/src/lib/auth.ts`
- Create: `apps/mobile/src/hooks/use-auth.ts`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/sign-in.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/.env.example`

- [ ] **Step 1: Install Clerk Expo**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo install @clerk/clerk-expo expo-secure-store
```

- [ ] **Step 2: Create `apps/mobile/src/lib/auth.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'clerk-token';

export async function getClerkToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setClerkToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeClerkToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

- [ ] **Step 3: Create `apps/mobile/src/hooks/use-auth.ts`**

```ts
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-expo';

export function useAuth() {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { user } = useUser();
  return { isLoaded, isSignedIn, user, signOut };
}
```

- [ ] **Step 4: Wrap app with ClerkProvider**

Modify `apps/mobile/app/_layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '~/lib/auth';
...
export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <ThemeProvider>
        ...
      </ThemeProvider>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Create sign-in screen**

Create `apps/mobile/app/(auth)/sign-in.tsx`:

```tsx
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { View, Text, TextInput } from 'react-native';
import { Button } from '~/components/ui/button';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSignIn = async () => {
    if (!isLoaded || !signIn) return;
    const result = await signIn.create({ identifier: email, password });
    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId });
      router.replace('/(tabs)');
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-background">
      <Text className="text-foreground text-2xl font-bold mb-6">Inicia sesión</Text>
      <TextInput
        className="bg-card text-foreground rounded-xl px-4 py-3 mb-4"
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="bg-card text-foreground rounded-xl px-4 py-3 mb-6"
        placeholder="Contraseña"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button onPress={onSignIn}>
        <Text className="text-primary-foreground font-semibold">Entrar</Text>
      </Button>
    </View>
  );
}
```

- [ ] **Step 6: Add `.env.example`**

Create `apps/mobile/.env.example`:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_URL=https://rhynode-finance.vercel.app
```

- [ ] **Step 7: Test sign-in flow**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo start --android
```

Expected: app loads Clerk splash, shows sign-in, and on successful sign-in routes to tabs.

- [ ] **Step 8: Commit**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile
git commit -m "feat(mobile): integrate Clerk Expo auth and sign-in screen"
```

---

### Task 1.2: Implement bottom tab navigation

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/transactions.tsx`
- Create: `apps/mobile/app/(tabs)/add.tsx`
- Create: `apps/mobile/app/(tabs)/plan.tsx`
- Create: `apps/mobile/app/(tabs)/more.tsx`
- Create: `apps/mobile/src/components/features/bottom-tab-bar.tsx`

- [ ] **Step 1: Write tabs layout**

Create `apps/mobile/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { Home, List, PlusCircle, Target, Menu } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const tint = scheme === 'dark' ? '#10b981' : '#059669';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { backgroundColor: scheme === 'dark' ? '#0a0a0f' : '#ffffff' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: Home }} />
      <Tabs.Screen name="transactions" options={{ title: 'Movimientos', tabBarIcon: List }} />
      <Tabs.Screen name="add" options={{ title: 'Agregar', tabBarIcon: PlusCircle }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: Target }} />
      <Tabs.Screen name="more" options={{ title: 'Más', tabBarIcon: Menu }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Write placeholder tab screens**

Create `apps/mobile/app/(tabs)/transactions.tsx`:

```tsx
import { View, Text } from 'react-native';
export default function TransactionsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground text-xl">Movimientos</Text>
    </View>
  );
}
```

Repeat for `add.tsx`, `plan.tsx`, `more.tsx` with appropriate labels.

- [ ] **Step 3: Update root layout to route signed-in users to tabs**

Modify `apps/mobile/app/_layout.tsx` to conditionally redirect based on auth state (use a small `AuthGate` component).

- [ ] **Step 4: Verify navigation**

Run the app and confirm 5 tabs render and switching works.

- [ ] **Step 5: Commit**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile/app/(tabs)
git commit -m "feat(mobile): add bottom tab navigation with 5 main sections"
```

---

### Task 1.3: Add biometric gate

**Files:**
- Create: `apps/mobile/src/lib/biometric.ts`
- Create: `apps/mobile/src/hooks/use-biometric.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Install dependency**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo install expo-local-authentication
```

- [ ] **Step 2: Create biometric helper**

`apps/mobile/src/lib/biometric.ts`:

```ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateBiometric(reason: string): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!compatible || !enrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason });
  return result.success;
}
```

- [ ] **Step 3: Add biometric gate on app launch**

Create a small component that prompts biometric before rendering the app.

- [ ] **Step 4: Test on emulator/device**

Expected: app prompts fingerprint/PIN when hardware is available.

- [ ] **Step 5: Commit**

```bash
cd /home/juan-daniel/rhynode-finance
git add apps/mobile/src/lib/biometric.ts apps/mobile/src/hooks/use-biometric.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add biometric unlock gate"
```

---

## Phase 2 — Dashboard & Transactions (Weeks 2–3)

### Task 2.1: Build typed API client

**Files:**
- Create: `apps/mobile/src/lib/api.ts`
- Create: `apps/mobile/src/hooks/use-api.ts`
- Modify: root Next.js auth to accept bearer token from mobile

- [ ] **Step 1: Create API client**

`apps/mobile/src/lib/api.ts`:

```ts
const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // token injection handled by caller or interceptor
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  // add patch/delete as needed
};
```

- [ ] **Step 2: Add auth interceptor using Clerk token**

Use `@clerk/clerk-expo` `getToken()` to inject the JWT.

- [ ] **Step 3: Add backend helper to accept mobile bearer token**

Modify `src/lib/auth.ts` (or create a helper) so `/api/*` routes can validate a `Authorization: Bearer <clerk_token>` header in addition to cookies.

- [ ] **Step 4: Test health endpoint**

Create `/api/mobile/health/route.ts` returning `{ ok: true }`.

Call it from mobile and verify 200.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/api.ts src/app/api/mobile/health/route.ts
git commit -m "feat(mobile): typed api client and mobile health endpoint"
```

---

### Task 2.2: Build dashboard home

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/src/components/features/balance-card.tsx`
- Create: `apps/mobile/src/components/features/health-score-ring.tsx`
- Create: `apps/mobile/src/components/features/upcoming-bills-list.tsx`

- [ ] **Step 1: Fetch dashboard data**

Identify the existing dashboard endpoint or create `/api/dashboard/summary` that returns: total balance, income/expense this month, health score, upcoming bills.

- [ ] **Step 2: Build BalanceCard component**

NativeWind-styled card with animated number counter.

- [ ] **Step 3: Build HealthScoreRing**

Use `react-native-svg` or `victory-native-xl` for a circular progress indicator.

- [ ] **Step 4: Build UpcomingBillsList**

FlatList showing next 5 upcoming payments/debts.

- [ ] **Step 5: Assemble dashboard**

Combine in `(tabs)/index.tsx` with scroll, refresh control, and skeleton loading.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx apps/mobile/src/components/features/balance-card.tsx ...
git commit -m "feat(mobile): dashboard home with balance, health and upcoming bills"
```

---

### Task 2.3: Transactions list and quick-add

**Files:**
- Create: `apps/mobile/src/components/features/transaction-list-item.tsx`
- Create: `apps/mobile/src/components/features/quick-add-form.tsx`
- Modify: `apps/mobile/app/(tabs)/transactions.tsx`
- Modify: `apps/mobile/app/(tabs)/add.tsx`
- Modify or create Next.js endpoints for transactions if not already suitable for mobile

- [ ] **Step 1: Create TransactionListItem component**

Show amount, description, category, date. Color code income/expense.

- [ ] **Step 2: Fetch transactions**

Use TanStack Query to call `/api/transactions` with pagination.

- [ ] **Step 3: Build quick-add form**

Fields: type toggle (Gasté/Recibí), amount input, description, category picker, account picker, date.
Use React Hook Form + Zod (shared transaction schema).

- [ ] **Step 4: Wire add screen**

`add.tsx` opens QuickAddForm in a modal/stack and on save navigates back.

- [ ] **Step 5: Add optimistic update**

Update TanStack Query cache after creating transaction.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): transactions list and quick-add form"
```

---

## Phase 3 — Personal Finance (Weeks 4–5)

### Task 3.1: Accounts, budgets, goals, debts

**Files:**
- Create screens under `apps/mobile/app/personal/`
- Create feature components: `account-card.tsx`, `budget-progress.tsx`, `goal-card.tsx`, `debt-card.tsx`

- [ ] **Step 1: Build accounts list**

Screen: `app/personal/accounts/index.tsx`. Fetch `/api/personal/accounts`.

- [ ] **Step 2: Build budgets list**

Screen: `app/personal/budgets/index.tsx`. Fetch `/api/personal/budgets`.

- [ ] **Step 3: Build goals list**

Screen: `app/personal/goals/index.tsx`. Fetch `/api/personal/goals`.

- [ ] **Step 4: Build debts list**

Screen: `app/personal/debts/index.tsx`. Fetch `/api/personal/debts`.

- [ ] **Step 5: Link from Plan tab**

Update `(tabs)/plan.tsx` to show cards that navigate to each section.

- [ ] **Step 6: Commit per feature**

```bash
git add apps/mobile/app/personal accounts budgets goals debts
# commit individually per feature
```

---

### Task 3.2: Recurring, subscriptions and calendar

**Files:**
- Create: `apps/mobile/app/personal/recurring/index.tsx`
- Create: `apps/mobile/app/personal/subscriptions/index.tsx`
- Create: `apps/mobile/app/personal/calendar/index.tsx`
- Create feature components: `recurring-item.tsx`, `subscription-card.tsx`, `finance-calendar.tsx`

- [ ] **Step 1: Recurring list**

Fetch `/api/personal/recurring`.

- [ ] **Step 2: Subscriptions list**

Fetch `/api/personal/subscriptions`.

- [ ] **Step 3: Calendar view**

Use `react-native-calendar-strip` or custom calendar with dots for events.

- [ ] **Step 4: Link from Plan tab**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/personal/recurring subscriptions calendar
git commit -m "feat(mobile): recurring, subscriptions and financial calendar"
```

---

## Phase 4 — Business + AI (Weeks 6–7)

### Task 4.1: Invoices, clients, projects

**Files:**
- Create: `apps/mobile/app/business/invoices/`
- Create: `apps/mobile/app/business/clients/`
- Create: `apps/mobile/app/business/projects/`
- Create feature components: `invoice-card.tsx`, `client-card.tsx`, `project-card.tsx`

- [ ] **Step 1: Invoices list and detail**

Fetch `/api/invoices`.

- [ ] **Step 2: Clients list**

Fetch `/api/clients`.

- [ ] **Step 3: Projects list**

Fetch `/api/projects`.

- [ ] **Step 4: Link from More tab**

Update `(tabs)/more.tsx`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/business
git commit -m "feat(mobile): invoices, clients and projects screens"
```

---

### Task 4.2: AI advisor chat

**Files:**
- Modify: `apps/mobile/app/advisor/index.tsx`
- Create: `apps/mobile/src/components/features/advisor-message.tsx`
- Create: `apps/mobile/src/components/features/advisor-input.tsx`

- [ ] **Step 1: Build chat UI**

Use FlatList for messages, text input with send button.

- [ ] **Step 2: Connect to SSE endpoint**

Consume `/api/ai/chat` with streaming. Use `event-source` polyfill or fetch reader.

- [ ] **Step 3: Render markdown-ish responses**

Simple formatting for bold, lists, numbers.

- [ ] **Step 4: Link from More tab**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/advisor apps/mobile/src/components/features/advisor*
git commit -m "feat(mobile): AI advisor chat with streaming"
```

---

### Task 4.3: Camera OCR for receipts

**Files:**
- Create: `apps/mobile/app/camera.tsx`
- Create: `apps/mobile/src/components/features/camera-overlay.tsx`
- Create backend: `src/app/api/mobile/upload-receipt/route.ts`
- Modify: `apps/mobile/src/lib/api.ts` for multipart upload

- [ ] **Step 1: Create upload endpoint using Vercel Blob**

```ts
// src/app/api/mobile/upload-receipt/route.ts
import { put } from '@vercel/blob';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const file = form.get('file') as File;
  if (!file) return new Response('Missing file', { status: 400 });

  const blob = await put(`receipts/${userId}/${Date.now()}-${file.name}`, file, { access: 'public' });
  return Response.json({ url: blob.url });
}
```

- [ ] **Step 2: Install Vercel Blob**

```bash
cd /home/juan-daniel/rhynode-finance
npm install @vercel/blob
```

- [ ] **Step 3: Build camera screen**

Use `expo-camera` with a custom overlay for receipt alignment.

- [ ] **Step 4: Upload and OCR flow**

Capture → upload to `/api/mobile/upload-receipt` → call `/api/ai/ocr` with URL → pre-fill QuickAddForm.

- [ ] **Step 5: Add to Add tab**

"Escanear recibo" option.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/camera.tsx src/app/api/mobile/upload-receipt/route.ts
git commit -m "feat(mobile): native camera OCR for receipts"
```

---

## Phase 5 — Premium Native Features (Week 8)

### Task 5.1: Push notifications

**Files:**
- Create: `apps/mobile/src/lib/notifications.ts`
- Create backend: `src/app/api/mobile/push-token/route.ts`
- Modify backend: `src/lib/notifications.ts` to also send Expo Push
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Install notifications**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx expo install expo-notifications
```

- [ ] **Step 2: Register push token**

On login, get Expo Push Token and POST to `/api/mobile/push-token`.

- [ ] **Step 3: Handle notifications**

Foreground/background/tapped handlers; navigate via deep link.

- [ ] **Step 4: Backend Expo push sender**

Add `expo-server-sdk` to root project; extend `src/lib/notifications.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/notifications.ts src/app/api/mobile/push-token/route.ts
git commit -m "feat(mobile): Expo push notifications"
```

---

### Task 5.2: Offline sync engine

**Files:**
- Create: `apps/mobile/src/lib/offline-queue.ts`
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: data hooks to queue mutations when offline

- [ ] **Step 1: Create SQLite schema for offline queue**

Table: `pending_mutations` with id, method, endpoint, payload, timestamp, retries.

- [ ] **Step 2: Queue mutations when offline**

Intercept `POST/PATCH/DELETE` in API client; if NetInfo says offline, store in SQLite.

- [ ] **Step 3: Sync on reconnect**

Process queue in order, update TanStack Query cache on success.

- [ ] **Step 4: Persist TanStack Query**

Use `persistQueryClient` with AsyncStorage.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/offline-queue.ts
git commit -m "feat(mobile): offline sync engine for mutations"
```

---

### Task 5.3: Animations, haptics, empty states and tests

**Files:**
- Create: `apps/mobile/src/components/ui/skeleton.tsx`
- Create: `apps/mobile/src/components/ui/empty-state.tsx`
- Add haptics to Button and key actions
- Create: `apps/mobile/__tests__/components/button.test.tsx`
- Create: Maestro flow files under `apps/mobile/maestro/`

- [ ] **Step 1: Add haptics**

Use `expo-haptics` on Button press, transaction save, goal complete.

- [ ] **Step 2: Skeleton and empty states**

Create reusable components used across lists.

- [ ] **Step 3: Add entry animations**

Use Moti for screen/list entrance.

- [ ] **Step 4: Write unit tests**

Test Button, format helpers, auth hook wrapper.

- [ ] **Step 5: Write Maestro E2E flow**

`maestro/sign-in-and-add-transaction.yaml`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/skeleton.tsx apps/mobile/src/components/ui/empty-state.tsx apps/mobile/__tests__ apps/mobile/maestro
git commit -m "feat(mobile): premium UX polish, haptics, tests and E2E flows"
```

---

## Phase 6 — Play Store Release (Week 9)

### Task 6.1: Assets and store metadata

**Files:**
- Create: `apps/mobile/assets/icon.png` (1024x1024)
- Create: `apps/mobile/assets/splash.png` (1242x2436)
- Create: `apps/mobile/assets/adaptive-icon.png`
- Create: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Generate or source assets**

Use Open Design / image generation or design tool to create premium icon and splash.

- [ ] **Step 2: Configure EAS**

`eas.json`:

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "app-bundle" } }
  }
}
```

- [ ] **Step 3: Update `app.json`**

Ensure package name, version, permissions, adaptive icon, scheme, intent filters for deep links.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/assets apps/mobile/eas.json apps/mobile/app.json
git commit -m "chore(mobile): Play Store assets and EAS config"
```

---

### Task 6.2: EAS Build and Play Console

**Files:**
- Modify: `apps/mobile/.env` for production keys
- Modify: `apps/mobile/app.json` for production bundle id

- [ ] **Step 1: Create production build**

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
eas build --platform android --profile production
```

- [ ] **Step 2: Upload AAB to Play Console**

Create release, complete data safety form, privacy policy, content rating.

- [ ] **Step 3: Closed beta testing**

Add testers, collect feedback, fix critical bugs.

- [ ] **Step 4: Staged rollout**

Release to 20% → 50% → 100%.

- [ ] **Step 5: Tag release**

```bash
git tag mobile-v1.0.0-android
git push origin mobile-v1.0.0-android
```

---

## Parallelization & Agent Assignments

The following tasks can run in parallel once Phase 0 is stable:

| Parallel Track | Tasks | Agent specialization |
|----------------|-------|----------------------|
| **UI/Design** | Design system components, dashboard, empty states, animations | UI Designer + Frontend Developer |
| **Personal Finance** | Accounts, budgets, goals, debts, recurring, calendar | Frontend Developer + Backend support |
| **Business + AI** | Invoices, clients, projects, advisor chat, OCR | Full-stack Developer |
| **Native + Backend** | Push notifications, upload endpoint, offline sync, biometric | Backend Engineer + Mobile Engineer |
| **QA/DevOps** | Tests, Maestro, EAS config, Play Console setup | QA Engineer + DevOps |

**Rule:** no two agents modify the same file at the same time. Use worktree isolation if necessary (`superpowers:using-git-worktracks`).

---

## Self-Review

### Spec coverage

| Spec section | Plan coverage |
|--------------|---------------|
| Workspace monorepo | Task 0.1, 0.2, 0.3 |
| Stack tecnológico | Task 0.3, 0.4, 1.1, 5.1 |
| Backend reuse + new endpoints | Task 0.2, 2.1, 4.3, 5.1 |
| Navegación 5 tabs | Task 1.2 |
| Auth Clerk Expo | Task 1.1 |
| Dashboard | Task 2.2 |
| Transactions + quick-add | Task 2.3 |
| Personal finance | Task 3.1, 3.2 |
| Business + AI | Task 4.1, 4.2 |
| Camera OCR | Task 4.3 |
| Push notifications | Task 5.1 |
| Offline sync | Task 5.2 |
| Premium UX | Task 5.3 |
| Play Store | Task 6.1, 6.2 |

### Placeholder scan

- No "TBD" or "TODO" left in implementation steps.
- Code blocks include concrete code for scaffolding tasks.
- UI screen tasks include exact file paths and component names.
- Commands include expected outputs where applicable.

### Type consistency

- `TransactionInput` type used from `@rhynode/shared` in Task 0.2 and reused in Task 2.3.
- `api.get`/`api.post` signatures consistent.
- `useTheme` and `ThemeProvider` names consistent.

### Gaps identified and resolved

- Added Task 0.5 for i18n (not originally in spec but critical for es/en parity).
- Added backend `/api/mobile/health` in Phase 2 to verify auth/API client before building screens.
- Added `expo-haptics` in Task 5.3 (implied by spec but not explicitly listed).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-27-rhynode-native-android-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Ideal para este proyecto grande y multifuncional.

**2. Inline Execution** — Ejecuto las tareas en esta sesión usando `superpowers:executing-plans`, con checkpoints para revisión.

**Which approach?**
