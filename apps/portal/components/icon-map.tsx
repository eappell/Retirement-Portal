import {
  CalculatorIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CubeIcon,
  HeartIcon,
  BellIcon,
  ChartPieIcon,
  SparklesIcon,
  BoltIcon,
  RocketLaunchIcon,
  CalendarIcon,
  BookmarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  DocumentChartBarIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: CalculatorIcon,
  CalculatorIcon: CalculatorIcon,

  CurrencyDollar: CurrencyDollarIcon,
  CurrencyDollarIcon: CurrencyDollarIcon,

  Globe: GlobeAltIcon,
  GlobeAltIcon: GlobeAltIcon,
  GlobeAlt: GlobeAltIcon,

  Building: BuildingOfficeIcon,
  BuildingOffice: BuildingOfficeIcon,
  BuildingOfficeIcon: BuildingOfficeIcon,

  Cube: CubeIcon,
  CubeIcon: CubeIcon,

  Heart: HeartIcon,
  HeartIcon: HeartIcon,
  Bell: BellIcon,
  BellIcon: BellIcon,
  "Chart Pie": ChartPieIcon,
  ChartPieIcon: ChartPieIcon,
  Chart: ChartBarIcon,
  ChartBar: ChartBarIcon,
  ChartBarIcon: ChartBarIcon,
  ChartBarSquare: ChartBarSquareIcon,
  ChartBarSquareIcon: ChartBarSquareIcon,
  DocumentChartBar: DocumentChartBarIcon,
  DocumentChartBarIcon: DocumentChartBarIcon,
  Sparkles: SparklesIcon,
  SparklesIcon: SparklesIcon,
  Bolt: BoltIcon,
  BoltIcon: BoltIcon,
  Rocket: RocketLaunchIcon,
  RocketLaunch: RocketLaunchIcon,
  RocketLaunchIcon: RocketLaunchIcon,
  CreditCard: CreditCardIcon,
  CreditCardIcon: CreditCardIcon,
  Shopping: ShoppingCartIcon,
  ShoppingCart: ShoppingCartIcon,
  ShoppingCartIcon: ShoppingCartIcon,
  UserGroup: UserGroupIcon,
  UserGroupIcon: UserGroupIcon,
  Document: DocumentTextIcon,
  DocumentTextIcon: DocumentTextIcon,
  Chat: ChatBubbleLeftIcon,
  ChatBubbleLeftIcon: ChatBubbleLeftIcon,
  PresentationChartBar: PresentationChartBarIcon,
  PresentationChartBarIcon: PresentationChartBarIcon,
  Calendar: CalendarIcon,
  CalendarIcon: CalendarIcon,
  Bookmark: BookmarkIcon,
  BookmarkIcon: BookmarkIcon,
  "Check Circle": CheckCircleIcon,
  CheckCircleIcon: CheckCircleIcon,
  Clipboard: ClipboardDocumentIcon,
  ClipboardDocumentIcon: ClipboardDocumentIcon,
  Code: CodeBracketIcon,
  CodeBracketIcon: CodeBracketIcon,
  Cog: Cog6ToothIcon,
  Cog6ToothIcon: Cog6ToothIcon,
};

function toPascalCase(s: string) {
  return s
    .replace(/[-_ ]+/g, " ")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function getIconComponent(name?: string) {
  if (!name) return CalculatorIcon;

  const variants = [name, name.replace(/Icon$/i, "")];
  variants.push(toPascalCase(name));
  variants.push(toPascalCase(name.replace(/Icon$/i, "")));

  for (const v of variants) {
    if (v && ICON_MAP[v]) return ICON_MAP[v];
  }

  const lower = name.toLowerCase().replace(/icon$/i, "");
  for (const key of Object.keys(ICON_MAP)) {
    if (key.toLowerCase().replace(/icon$/i, "") === lower) return ICON_MAP[key];
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

export function AppIcon({ icon, className, style, color }: { icon?: string; className?: string; style?: React.CSSProperties; color?: string }) {
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
