/** Display names for catalog enum values. Zod-free so client components can import it cheaply. */
export const labels: Record<string, string> = {
  // Gender
  men: "Men",
  women: "Women",
  unisex: "Unisex",
  // Brand type
  imported: "Imported",
  mastercopy: "Master copy",
  firstcopy: "First copy",
  local: "Local",
  // Movement
  quartz: "Quartz",
  automatic: "Automatic",
  mechanical: "Mechanical",
  solar: "Solar",
  digital: "Digital",
  smart: "Smart",
  // Case material
  stainless_steel: "Stainless steel",
  alloy: "Alloy",
  titanium: "Titanium",
  ceramic: "Ceramic",
  gold_plated: "Gold plated",
  plastic: "Plastic",
  // Strap type
  leather: "Leather",
  steel: "Steel",
  mesh: "Mesh",
  rubber: "Rubber",
  silicone: "Silicone",
  fabric: "Fabric",
  // Condition
  new: "New",
  open_box: "Open box",
  refurbished: "Refurbished",
  used: "Used",
  // Feature group (values do not collide with the movement/strap enums)
  display: "Display",
  complications: "Complications",
  durability: "Durability",
  movement: "Movement",
  case: "Case",
  strap: "Strap",
  // Glass
  mineral: "Mineral crystal",
  sapphire: "Sapphire crystal",
  acrylic: "Acrylic crystal",
  // Style
  dress: "Dress",
  sport: "Sport",
  casual: "Casual",
  // Case-size buckets
  "under-36": "Under 36 mm",
  "36-40": "36–40 mm",
  "41-44": "41–44 mm",
  "45-plus": "45 mm and over",
  // Water-resistance minimums (metres)
  "30": "30 m+",
  "50": "50 m+",
  "100": "100 m+",
  "200": "200 m+",
  "300": "300 m+",
};
export function label(value: string) {
  return (
    labels[value] ??
    value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  );
}

/** Minimum water-resistance facet values, in metres. */
export const waterBuckets = [30, 50, 100, 200, 300] as const;
export const waterLabel = (metres: number) => `${metres} m+`;

/** Feature groups in product-page order. */
export const featureGroups = [
  "display",
  "complications",
  "durability",
  "movement",
  "case",
  "strap",
] as const;
