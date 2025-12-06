import {
  CalculatorIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CubeIcon,
  HeartIcon,
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
