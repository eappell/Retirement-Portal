import * as HeroiconsOutline from "@heroicons/react/24/outline";

// Default fallback icon
const { CalculatorIcon } = HeroiconsOutline;

// Build a comprehensive icon map from all Heroicons
// This maps various name formats to the actual icon components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {};

// Process all Heroicons and add multiple name variants for each
Object.entries(HeroiconsOutline).forEach(([name, component]) => {
  if (!name.endsWith('Icon')) return;

  const iconComponent = component as React.ComponentType<{ className?: string }>;

  // Add the full name (e.g., "CalculatorIcon")
  ICON_MAP[name] = iconComponent;

  // Add without "Icon" suffix (e.g., "Calculator")
  const withoutSuffix = name.replace(/Icon$/, '');
  ICON_MAP[withoutSuffix] = iconComponent;

  // Add with spaces between words (e.g., "Calculator" -> "Calculator", "ChartBar" -> "Chart Bar")
  const withSpaces = withoutSuffix.replace(/([A-Z])/g, ' $1').trim();
  ICON_MAP[withSpaces] = iconComponent;

  // Add lowercase version
  ICON_MAP[withoutSuffix.toLowerCase()] = iconComponent;
});

// Export the map for external use
export { ICON_MAP };

function toPascalCase(s: string) {
  return s
    .replace(/[-_ ]+/g, " ")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function getIconComponent(name?: string) {
  if (!name) return CalculatorIcon;

  // Direct lookup
  if (ICON_MAP[name]) return ICON_MAP[name];

  // Try without Icon suffix
  const withoutIcon = name.replace(/Icon$/i, "");
  if (ICON_MAP[withoutIcon]) return ICON_MAP[withoutIcon];

  // Try PascalCase versions
  const pascalName = toPascalCase(name);
  if (ICON_MAP[pascalName]) return ICON_MAP[pascalName];

  const pascalWithoutIcon = toPascalCase(withoutIcon);
  if (ICON_MAP[pascalWithoutIcon]) return ICON_MAP[pascalWithoutIcon];

  // Try lowercase lookup
  const lower = name.toLowerCase().replace(/icon$/i, "").replace(/\s+/g, "");
  for (const key of Object.keys(ICON_MAP)) {
    const keyLower = key.toLowerCase().replace(/icon$/i, "").replace(/\s+/g, "");
    if (keyLower === lower) return ICON_MAP[key];
  }

  return CalculatorIcon;
}

export function getIconColor(name?: string) {
  if (!name) return '#ffffff';
  const key = name.toLowerCase();
  if (key.includes('retire') || key.includes('abroad')) return '#2563eb'; // blue
  if (key.includes('income') || key.includes('estimator')) return '#059669'; // green
  if (key.includes('tax') || key.includes('tax-impact')) return '#7c3aed'; // purple
  if (key.includes('health') || key.includes('healthcare')) return '#ef4444'; // red
  if (key.includes('income')) return '#10b981';
  return '#0b5394'; // default primary blue
}

export function AppIcon({ icon, className, style, color, appId, bgColor }: { icon?: string; className?: string; style?: React.CSSProperties; color?: string; appId?: string; bgColor?: string }) {
  const mergedStyle = { ...(style || {}), ...(color ? { color } : {}) } as React.CSSProperties;

  if (!icon) {
    const C = CalculatorIcon;
    return <C className={className} style={mergedStyle} />;
  }

  const trimmed = icon.trim();

  // SVG string
  if (trimmed.startsWith("<svg")) {
    return <div className={className} style={mergedStyle} dangerouslySetInnerHTML={{ __html: icon }} />;
  }

  // Emoji or short text icon (use a text span)
  if (trimmed.length <= 3 && /[^a-zA-Z0-9]/.test(trimmed)) {
    return <span className={className} style={mergedStyle}>{icon}</span>;
  }

  // Otherwise, treat as a heroicon name
  const IconComponent = getIconComponent(icon);
  return <IconComponent className={className} style={mergedStyle} />;
}
