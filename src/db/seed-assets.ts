/** Reproduce committed SVG fixtures with: node --import tsx src/db/seed-assets.ts */
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { demoBrands, demoProducts } from "./seed-data";
import { slugify } from "@/lib/slug";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

const straps: Record<string, { light: string; dark: string }> = {
  leather: { light: "#8a5f3f", dark: "#5c3d28" },
  steel: { light: "#c3c9d0", dark: "#8f969e" },
  mesh: { light: "#aab1b8", dark: "#6f767e" },
  rubber: { light: "#4c5359", dark: "#2f3438" },
  silicone: { light: "#5d6d78", dark: "#3c4a52" },
  fabric: { light: "#828a76", dark: "#5b6151" },
};

const dials: Record<string, string> = {
  Black: "#23262b",
  White: "#f1eee6",
  Blue: "#2f4666",
  Green: "#35584a",
  Silver: "#b9bdc1",
  Grey: "#6b7178",
  Brown: "#6b4a35",
};

/**
 * An original still-life illustration of a fictional wristwatch: a strap band
 * behind a metallic case, the dial colour and strap of the option it depicts,
 * twelve markers, hands at ten past ten and a date window. Deterministic per title.
 */
function artwork(
  title: string,
  subtitle: string,
  color: string,
  options: { wide?: boolean; detail?: boolean; strap?: string | null } = {},
) {
  const { wide = false, detail = false, strap = null } = options;
  const width = wide ? 1600 : 800;
  const height = wide ? 900 : 960;
  const center = width / 2;
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variant = hash % 3;
  const band = straps[strap ?? "steel"] ?? straps.steel;
  const caseSize = wide ? 400 : 340;
  const cy = height / 2 + 18;
  const caseX = center - caseSize / 2;
  const caseY = cy - caseSize / 2;
  const radius = caseSize / 2;
  const dialRadius = radius - (wide ? 26 : 22);
  const dialColor = color;
  const bandWidth = wide ? 150 : 132;
  const bandTop = height * 0.03;
  const bandHeight = height * 0.94;

  const hand = (angleDeg: number, length: number, thickness: number) => {
    const angle = ((angleDeg - 90) * Math.PI) / 180;
    const x = center + Math.cos(angle) * length;
    const y = cy + Math.sin(angle) * length;
    return `<line x1="${center}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#f7f4ec" stroke-width="${thickness}" stroke-linecap="round"/>`;
  };
  const markers = Array.from({ length: 12 }, (_, index) => {
    const angle = ((index * 30 - 90) * Math.PI) / 180;
    const r1 = dialRadius - 26;
    const r2 = dialRadius - 12;
    const x1 = center + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;
    const x2 = center + Math.cos(angle) * r2;
    const y2 = cy + Math.sin(angle) * r2;
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#efeadd" stroke-opacity=".85" stroke-width="${index % 3 === 0 ? 7 : 4}" stroke-linecap="round"/>`;
  }).join("");

  const caseShape =
    variant === 0
      ? `<circle cx="${center}" cy="${cy}" r="${radius}" fill="url(#metal)" stroke="#b9bfc6" stroke-width="2"/>
  <circle cx="${center}" cy="${cy}" r="${dialRadius}" fill="${dialColor}"/>
  <circle cx="${center}" cy="${cy}" r="${dialRadius}" fill="none" stroke="#f4f0e6" stroke-opacity=".35" stroke-width="2"/>`
      : variant === 1
        ? `<rect x="${caseX}" y="${caseY}" width="${caseSize}" height="${caseSize}" rx="52" fill="url(#metal)" stroke="#b9bfc6" stroke-width="2"/>
  <rect x="${center - dialRadius}" y="${cy - dialRadius}" width="${dialRadius * 2}" height="${dialRadius * 2}" rx="40" fill="${dialColor}"/>
  <rect x="${center - dialRadius}" y="${cy - dialRadius}" width="${dialRadius * 2}" height="${dialRadius * 2}" rx="40" fill="none" stroke="#f4f0e6" stroke-opacity=".35" stroke-width="2"/>`
        : `<rect x="${caseX}" y="${caseY + 14}" width="${caseSize}" height="${caseSize - 28}" rx="96" fill="url(#metal)" stroke="#b9bfc6" stroke-width="2"/>
  <rect x="${center - dialRadius}" y="${cy - dialRadius + 10}" width="${dialRadius * 2}" height="${dialRadius * 2 - 20}" rx="80" fill="${dialColor}"/>
  <rect x="${center - dialRadius}" y="${cy - dialRadius + 10}" width="${dialRadius * 2}" height="${dialRadius * 2 - 20}" rx="80" fill="none" stroke="#f4f0e6" stroke-opacity=".35" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(subtitle)}. Original illustration of a fictional wristwatch.</desc>
  <defs>
    <linearGradient id="bg" x2=".8" y2="1"><stop stop-color="#f2f3f2"/><stop offset="1" stop-color="#dfe1e0"/></linearGradient>
    <linearGradient id="band" x1="0" x2="1"><stop stop-color="${band.dark}"/><stop offset=".5" stop-color="${band.light}"/><stop offset="1" stop-color="${band.dark}"/></linearGradient>
    <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#e6e9ec"/><stop offset=".35" stop-color="#aab1b8"/><stop offset=".62" stop-color="#f4f6f7"/><stop offset="1" stop-color="#8d949b"/></linearGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  ${wide ? `<path d="M0 0h${width * 0.32}L${width * 0.6} ${height}H${width * 0.34}Z" fill="#fff" opacity=".32"/><rect x="${center - 320}" y="${cy + radius + 60}" width="640" height="260" fill="#d6d9d7"/>` : ""}
  <ellipse cx="${center + 26}" cy="${cy + radius + 34}" rx="${radius + 40}" ry="26" fill="#3b4147" opacity=".2" filter="url(#shadow)"/>
  <g transform="${detail ? `rotate(7 ${center} ${cy}) translate(${wide ? 0 : 12} ${wide ? 0 : -8})` : ""}">
    <rect x="${center - bandWidth / 2}" y="${bandTop}" width="${bandWidth}" height="${bandHeight}" rx="30" fill="url(#band)"/>
    <line x1="${center - bandWidth / 2 + 16}" y1="${bandTop + 26}" x2="${center - bandWidth / 2 + 16}" y2="${bandTop + bandHeight - 26}" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-dasharray="7 9"/>
    <line x1="${center + bandWidth / 2 - 16}" y1="${bandTop + 26}" x2="${center + bandWidth / 2 - 16}" y2="${bandTop + bandHeight - 26}" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-dasharray="7 9"/>
    <rect x="${center + radius + (wide ? 8 : 6)}" y="${cy - (wide ? 26 : 22)}" width="${wide ? 30 : 24}" height="${wide ? 52 : 44}" rx="8" fill="url(#metal)" stroke="#9ba2a9" stroke-width="1.5"/>
    ${caseShape}
    ${markers}
    ${hand(305, dialRadius - 76, 11)}
    ${hand(60, dialRadius - 52, 7)}
    <circle cx="${center}" cy="${cy}" r="${wide ? 12 : 10}" fill="#f7f4ec"/>
    <circle cx="${center}" cy="${cy}" r="${wide ? 5 : 4}" fill="${dialColor}"/>
    <rect x="${center + dialRadius - 62}" y="${cy - 22}" width="44" height="34" rx="5" fill="#f7f4ec"/>
    <text x="${center + dialRadius - 40}" y="${cy + 3}" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#3a3f45">${(hash % 28) + 1}</text>
  </g>
</svg>\n`;
}

async function main() {
  const directory = join(process.cwd(), "public/seed");
  await mkdir(directory, { recursive: true });
  const files: [string, string][] = [];
  for (const product of demoProducts) {
    const dial = dials[product.dialColor] ?? product.brand.color;
    const dialAlt = dials[product.dialColorAlt] ?? product.brand.color;
    files.push([`${product.slug}.svg`, artwork(product.name, product.optionLabels[0] ?? product.brand.name, dial, { strap: product.strapType })]);
    files.push([`${product.slug}-detail.svg`, artwork(product.name, product.optionLabels[1] ?? product.brand.name, dialAlt, { detail: true, strap: product.strapTypeAlt })]);
  }
  for (const brand of demoBrands) {
    const slug = slugify(brand.name);
    files.push([`brand-${slug}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#eceeed"/><text x="400" y="210" text-anchor="middle" font-family="Georgia,serif" font-size="48" fill="#3b4653">${escapeXml(brand.name)}</text><path d="M370 252h60" stroke="#8f969e"/></svg>`]);
    files.push([`brand-${slug}-hero.svg`, artwork(brand.name, "Explore the collection", brand.color, { wide: true })]);
  }
  for (const [slug, title, subtitle, color] of [
    ["men", "For Him", "Field, diver and everyday watches", "#3f4a52"],
    ["women", "For Her", "Slim cases, dress dials and bracelets", "#9c7f74"],
    ["automatic", "Mechanical, Not Battery", "Self-winding movements with sweeping seconds", "#5b6657"],
    ["deals", "Everyday Discoveries", "Watches priced below demo retail", "#a07a4a"],
    ["hero-field", "Built for Every Wrist", "Case sizes from 34 to 46 mm", "#4d5a64"],
  ]) files.push([`${slug}.svg`, artwork(title, subtitle, color, { wide: true })]);

  await Promise.all(files.map(([name, svg]) => writeFile(join(directory, name), svg)));
  // Keep the fixture directory exactly reproducible: drop stale artwork from earlier catalogs.
  const keep = new Set(files.map(([name]) => name));
  for (const name of await readdir(directory)) {
    if (name.endsWith(".svg") && !keep.has(name)) await unlink(join(directory, name));
  }
  console.log(`Generated ${files.length} deterministic SVG fixtures in public/seed/.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
