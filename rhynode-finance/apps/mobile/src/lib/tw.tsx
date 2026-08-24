import React from 'react';

/**
 * Simple className → StyleSheet converter.
 * Works without twrnc or NativeWind — just maps common Tailwind classes.
 */

// Inline color tokens (matches tailwind.config.js)
const colors: Record<string, string> = {
  'bg-background': '#0a0a0f',
  'bg-card': '#151520',
  'bg-primary': '#10b981',
  'bg-secondary': '#292929',
  'bg-destructive': '#f43f5e',
  'bg-accent': '#3b82f6',
  'bg-success': '#10b981',
  'bg-warning': '#f59e0b',
  'bg-muted': '#292929',
  'bg-black': '#000000',
  'bg-white': '#ffffff',
  'bg-transparent': 'transparent',

  'text-foreground': '#fafafa',
  'text-primary': '#10b981',
  'text-primary-foreground': '#fafafa',
  'text-secondary-foreground': '#fafafa',
  'text-destructive': '#f43f5e',
  'text-destructive-foreground': '#fafafa',
  'text-success': '#10b981',
  'text-success-foreground': '#fafafa',
  'text-warning': '#f59e0b',
  'text-warning-foreground': '#fafafa',
  'text-muted-foreground': '#a1a1aa',
  'text-card-foreground': '#fafafa',
  'text-white': '#ffffff',

  'border-border': '#262626',
  'border-destructive': '#f43f5e',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseClass(cls: string): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style: Record<string, any> = {};

  // Flexbox
  if (cls === 'flex-1') style.flex = 1;
  if (cls === 'flex-row') style.flexDirection = 'row';
  if (cls === 'flex-col') style.flexDirection = 'column';

  // Alignment
  if (cls === 'items-center') style.alignItems = 'center';
  if (cls === 'items-start') style.alignItems = 'flex-start';
  if (cls === 'justify-center') style.justifyContent = 'center';
  if (cls === 'justify-between') style.justifyContent = 'space-between';

  // Position
  if (cls === 'absolute') style.position = 'absolute';
  if (cls === 'relative') style.position = 'relative';

  // Overflow
  if (cls === 'overflow-hidden') style.overflow = 'hidden';

  // Width/Height percentages
  if (cls === 'w-full') style.width = '100%';
  if (cls === 'h-full') style.height = '100%';
  if (cls === 'h-px') style.height = 1;

  // Width/Height values
  const sizeMatch = cls.match(/^(w|h)-(\d+(?:\/\d+)?)$/);
  if (sizeMatch) {
    const val = sizeMatch[1] === 'w' ? 'width' : 'height';
    const num = parseInt(sizeMatch[2]);
    if (!isNaN(num)) style[val] = num;
  }

  // Padding
  const padMatch = cls.match(/^(p|px|py|pt|pb|pl|pr)-(\d+)$/);
  if (padMatch) {
    const key = padMatch[1];
    const val = parseInt(padMatch[2]) * 4;
    if (key === 'p') { style.paddingTop = val; style.paddingBottom = val; style.paddingLeft = val; style.paddingRight = val; }
    else if (key === 'px') { style.paddingLeft = val; style.paddingRight = val; }
    else if (key === 'py') { style.paddingTop = val; style.paddingBottom = val; }
    else if (key === 'pt') style.paddingTop = val;
    else if (key === 'pb') style.paddingBottom = val;
    else if (key === 'pl') style.paddingLeft = val;
    else if (key === 'pr') style.paddingRight = val;
  }

  // Margin
  const margMatch = cls.match(/^(m|mx|my|mt|mb|ml|mr)-(\d+)$/);
  if (margMatch) {
    const key = margMatch[1];
    const val = parseInt(margMatch[2]) * 4;
    if (key === 'm') { style.marginTop = val; style.marginBottom = val; style.marginLeft = val; style.marginRight = val; }
    else if (key === 'mx') { style.marginLeft = val; style.marginRight = val; }
    else if (key === 'my') { style.marginTop = val; style.marginBottom = val; }
    else if (key === 'mt') style.marginTop = val;
    else if (key === 'mb') style.marginBottom = val;
    else if (key === 'ml') style.marginLeft = val;
    else if (key === 'mr') style.marginRight = val;
  }

  // Negative margin
  const negMargMatch = cls.match(/^-m[trbl]-(\d+)$/);
  if (negMargMatch) {
    const key = cls[2]; // t, r, b, or l
    const val = -parseInt(negMargMatch[1]) * 4;
    if (key === 't') style.marginTop = val;
    else if (key === 'b') style.marginBottom = val;
    else if (key === 'l') style.marginLeft = val;
    else if (key === 'r') style.marginRight = val;
  }

  // Gap
  const gapMatch = cls.match(/^gap-(\d+)$/);
  if (gapMatch) style.gap = parseInt(gapMatch[1]) * 4;

  // Border radius
  const radiusMap: Record<string, number> = { 'rounded-xl': 20, 'rounded-2xl': 24, 'rounded-3xl': 32, 'rounded-full': 9999, 'rounded-lg': 16, 'rounded-md': 12, 'rounded-sm': 8, 'rounded': 8 };
  if (radiusMap[cls]) style.borderRadius = radiusMap[cls];

  // Border width
  if (cls === 'border') style.borderWidth = 1;
  const borderWMatch = cls.match(/^border-(\d)$/);
  if (borderWMatch) style.borderWidth = parseInt(borderWMatch[1]);

  // Font size
  const fontSizeMap: Record<string, number> = {
    'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18,
    'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36,
  };
  if (fontSizeMap[cls]) style.fontSize = fontSizeMap[cls];

  // Font weight
  const fontWeightMap: Record<string, string> = {
    'font-bold': '700', 'font-semibold': '600', 'font-medium': '500', 'font-normal': '400',
  };
  if (fontWeightMap[cls]) style.fontWeight = fontWeightMap[cls] as '700' | '600' | '500' | '400';

  // Text alignment
  if (cls === 'text-center') style.textAlign = 'center';

  // Letter spacing
  if (cls === 'tracking-tight') style.letterSpacing = -0.5;

  // Opacity
  const opacityMatch = cls.match(/^opacity-(\d+)$/);
  if (opacityMatch) style.opacity = parseInt(opacityMatch[1]) / 100;

  // Colors (background, text, border)
  if (colors[cls]) {
    if (cls.startsWith('bg-')) style.backgroundColor = colors[cls];
    else if (cls.startsWith('text-')) style.color = colors[cls];
    else if (cls.startsWith('border-')) style.borderColor = colors[cls];
  }

  // Gap shorthand
  const gapShortMap: Record<string, number> = { 'gap-2': 8, 'gap-3': 12, 'gap-4': 16 };
  if (gapShortMap[cls]) style.gap = gapShortMap[cls];

  // Width shorthand
  const wMap: Record<string, number> = { 'w-5': 20, 'w-8': 32, 'w-10': 40, 'w-12': 48, 'w-14': 56, 'w-16': 64, 'w-20': 80 };
  if (wMap[cls]) style.width = wMap[cls];

  // Height shorthand
  const hMap: Record<string, number> = { 'h-2': 8, 'h-4': 16, 'h-9': 36, 'h-10': 40, 'h-12': 48, 'h-13': 52, 'h-14': 56, 'h-16': 64, 'h-20': 80, 'h-24': 96 };
  if (hMap[cls]) style.height = hMap[cls];

  return style;
}

/**
 * Parse a className string into a React Native StyleSheet.
 * Handles: "flex-1 bg-card p-4 text-foreground"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tw(classNameOrStrings: string | TemplateStringsArray, ...values: unknown[]): Record<string, any> {
  let className: string;
  if (Array.isArray(classNameOrStrings)) {
    className = (classNameOrStrings as readonly string[]).reduce((acc: string, str: string, i: number) => acc + str + (values[i] ?? ''), '');
  } else {
    className = classNameOrStrings as string;
  }

  if (!className) return {};

  const classes = className.split(/\s+/).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = {};

  for (const cls of classes) {
    Object.assign(merged, parseClass(cls));
  }

  return merged;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

/**
 * Wraps a React Native component to accept `className` prop.
 * Drop-in replacement for cssInterop from nativewind.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TwComponent(Component: AnyComponent) {
  const Wrapped = React.forwardRef<unknown, Record<string, unknown>>(
    ({ className, style, ...props }, ref) => {
      return (
        <Component
          ref={ref}
          {...(props as Record<string, unknown>)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={[className ? tw(className as string) : null, style].filter(Boolean)}
        />
      );
    }
  );
  Wrapped.displayName = `TwComponent(${Component.displayName ?? Component.name ?? 'Unknown'})`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Wrapped as any;
}
