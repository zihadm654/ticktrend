import { storeConfig } from "../../store.config";
import { slugify } from "@/lib/slug";
import type { brands, features, products } from "./schema";

// Invented demo watch houses and model names. None represent licensed merchandise.
export const demoBrands = [
  { name: "Avenmere Atelier", brandType: "imported", color: "#374c69" },
  { name: "Vellune House", brandType: "imported", color: "#76624f" },
  { name: "Orivane Studio", brandType: "mastercopy", color: "#5a695d" },
  { name: "Thistlewake", brandType: "mastercopy", color: "#675276" },
  { name: "Sahmira Timepieces", brandType: "firstcopy", color: "#937245" },
  { name: "Qamriven", brandType: "firstcopy", color: "#365e61" },
  { name: "Elowen Stage", brandType: "local", color: "#925b65" },
  { name: "Mirovale Lights", brandType: "local", color: "#705d81" },
  { name: "Meghvara", brandType: "local", color: "#496b61" },
  { name: "Bhorika Works", brandType: "local", color: "#92644e" },
] satisfies { name: string; brandType: typeof brands.$inferInsert.brandType; color: string }[];

const featuresByGroup = {
  display: ["Luminous hands", "Date window", "Day-date display", "Skeleton dial", "GMT hand", "Small seconds", "Chronograph dial", "Textured dial"],
  complications: ["Chronograph", "GMT", "Moonphase", "Alarm", "Tachymeter", "Power reserve", "Perpetual calendar", "World time"],
  durability: ["Sapphire crystal", "Mineral crystal", "Screw-down crown", "Shock resistant", "Anti-magnetic", "100 m water resistance", "Scratch-resistant coating", "Rotating bezel"],
  movement: ["Automatic movement", "Quartz movement", "Solar movement", "Hand-wound movement", "Smart module", "Sweeping seconds", "Date quickset", "Jewelled movement"],
  case: ["Stainless steel case", "Titanium case", "Gold-plated case", "Ceramic bezel", "Fluted bezel", "Exhibition caseback", "Slim profile", "Cushion case"],
  strap: ["Steel bracelet", "Leather strap", "Mesh bracelet", "Rubber strap", "Silicone strap", "Fabric strap", "Quick-release strap", "Deployment clasp"],
} satisfies Record<typeof features.$inferInsert.group, string[]>;

export const demoFeatures = Object.entries(featuresByGroup).flatMap(([group, names]) =>
  names.map((name) => ({ name, slug: slugify(name), group: group as typeof features.$inferInsert.group })),
);

const productNames = [
  "Cinder Meridian", "Harbour GMT", "Lumen Field", "Atlas Chrono",
  "Verge Slim", "Orbit Solar", "Tideway Diver", "Copper Hour",
  "Granite Dress", "Vector Digital", "Solstice Moon", "Ridge Automatic",
  "Delta Pilot", "Onyx Minimal", "Cadence Date", "Beacon Field",
  "Ledger Quartz", "Marina Hundred", "Nocturne Moonphase", "Summit Trek",
  "Halo Dress", "Relay Chrono", "Ember GMT", "Nimbus Solar",
  "Basalt Diver", "Arc Slim", "Prism Digital", "Voyager World",
  "Slate Date", "Comet Automatic", "Lattice Mesh", "Northwind Pilot",
  "Pebble Quartz", "Aurora Moon", "Drift Diver", "Copperline Dress",
  "Signal Smart", "Quarry Field", "Apex Field", "Rivet Chrono",
];

const genders = ["men", "women", "unisex"] as const;
const movements = ["quartz", "automatic", "mechanical", "solar", "digital", "smart"] as const;
const styles = ["dress", "sport", "casual", "digital"] as const;
const caseMaterials = ["stainless_steel", "alloy", "titanium", "ceramic", "gold_plated", "plastic"] as const;
const strapTypes = ["steel", "leather", "mesh", "rubber", "silicone", "fabric"] as const;
const conditions = ["new", "new", "new", "open_box", "refurbished", "used"] as const;
const glassTypes = ["mineral", "sapphire", "acrylic"] as const;
const dials = ["Black", "White", "Blue", "Green", "Silver", "Grey", "Brown"] as const;
const caseSizes = [34, 36, 38, 40, 42, 44, 46] as const;
const waterResistance = [30, 50, 100, 200] as const;
const origins = ["Japan", "Switzerland", "China", "Fictional demo origin"] as const;
const collections = ["Classic", "Sport", "Heritage", "Studio"] as const;
const strapLabel: Record<(typeof strapTypes)[number], string> = {
  steel: "Steel", leather: "Leather", mesh: "Mesh", rubber: "Rubber", silicone: "Silicone", fabric: "Fabric",
};

export const demoProducts = productNames.map((name, index) => {
  const brand = demoBrands[Math.floor(index / 4)];
  const dialColor = dials[index % dials.length];
  const strapType = strapTypes[index % strapTypes.length];
  const alternativeDial = dials[(index + 2) % dials.length];
  const alternativeStrap = strapTypes[(index + 3) % strapTypes.length];
  // One feature from each group, rotated so neighbouring models seldom match twice.
  const featureSlugs = Object.values(featuresByGroup).map((names, groupIndex) =>
    slugify(names[(index + groupIndex * 3) % names.length]),
  );
  return {
    name, slug: slugify(name), brand, index,
    gender: genders[index % genders.length],
    movement: movements[index % movements.length] as typeof products.$inferInsert.movement,
    style: styles[index % styles.length],
    caseSizeMm: caseSizes[index % caseSizes.length],
    caseMaterial: caseMaterials[index % caseMaterials.length] as typeof products.$inferSelect.caseMaterial,
    strapType: strapTypes[index % strapTypes.length] as typeof products.$inferSelect.strapType,
    glass: glassTypes[index % glassTypes.length],
    waterResistanceM: waterResistance[index % waterResistance.length],
    dialColor,
    referenceNo: `TTF-${String(index + 1).padStart(3, "0")}-${movements[index % movements.length].slice(0, 2).toUpperCase()}`,
    warrantyMonths: [0, 6, 12, 24][index % 4],
    condition: conditions[index % conditions.length] as typeof products.$inferSelect.condition,
    collectionName: `${brand.name.split(" ")[0]} ${collections[index % collections.length]}`,
    countryOfOrigin: index >= 32 ? "Bangladesh" : origins[index % origins.length],
    featureSlugs,
    optionLabels: [
      `${dialColor} dial · ${strapLabel[strapType]} strap`,
      `${alternativeDial} dial · ${strapLabel[alternativeStrap]} strap`,
    ],
    imageUrl: `/seed/${slugify(name)}.svg`,
    hoverImageUrl: `/seed/${slugify(name)}-detail.svg`,
  } satisfies {
    name: string;
    slug: string;
    brand: typeof brand;
    index: number;
    gender: typeof products.$inferSelect.gender;
    movement: typeof products.$inferSelect.movement;
    style: string;
    caseSizeMm: number;
    caseMaterial: typeof products.$inferSelect.caseMaterial;
    strapType: typeof products.$inferSelect.strapType;
    glass: string;
    waterResistanceM: number;
    dialColor: string;
    referenceNo: string;
    warrantyMonths: number;
    condition: typeof products.$inferSelect.condition;
    collectionName: string;
    countryOfOrigin: string;
    featureSlugs: string[];
    optionLabels: string[];
    imageUrl: string;
    hoverImageUrl: string;
  };
});

/** Convert whole demo currency units into this store's integer minor units. */
export const demoMoney = (wholeUnits: number) => wholeUnits * 10 ** storeConfig.currency.minorUnits;
export const demoSeedKey = "demo_seed_v1";
