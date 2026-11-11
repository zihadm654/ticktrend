"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  GripVertical,
  ImagePlus,
  Link2,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { saveProduct } from "@/lib/admin/actions";
import type { ActionResult, ProductInput } from "@/lib/admin/schema";
import { label as displayLabel } from "@/lib/catalog/labels";
import { formatMoney } from "@/lib/money";
import { slugify } from "@/lib/slug";
import {
  ChipChoice,
  FieldError,
  MarkdownField,
  Result,
  SwitchField,
  uploadImage,
  useUnsavedGuard,
} from "./fields";
import { Combobox } from "./combobox";
import type { Choices } from "./entity-editor";
import { PageHeader, Panel } from "./ui";
import { storeConfig } from "../../../store.config";
const blankVariant = () => ({
  sku: "",
  optionLabel: "",
  retailPrice: 0,
  price: 0,
  stockQuantity: 0,
  barcode: null as string | null,
  isDefault: false,
  isActive: true,
});
const empty: ProductInput = {
  name: "",
  slug: "",
  brandId: "",
  collectionName: null,
  description: "",
  gender: "unisex",
  condition: "new",
  movement: "quartz",
  style: null,
  caseSizeMm: null,
  caseMaterial: null,
  strapType: null,
  glass: null,
  waterResistanceM: null,
  dialColor: null,
  referenceNo: null,
  warrantyMonths: null,
  launchYear: null,
  countryOfOrigin: null,
  groundShippingOnly: false,
  isFeatured: false,
  isActive: true,
  variants: [{ ...blankVariant(), isDefault: true }],
  images: [],
  featureIds: [],
};
const TABS = ["Basics", "Options", "Images", "Features"] as const;
type Tab = (typeof TABS)[number];
const GENDERS = ["men", "women", "unisex"] as const;
const CONDITIONS = ["new", "open_box", "refurbished", "used"] as const;
const MOVEMENTS = [
  "quartz",
  "automatic",
  "mechanical",
  "solar",
  "digital",
  "smart",
] as const;
const STYLES = ["dress", "sport", "casual", "digital"] as const;
const CASE_MATERIALS = [
  "stainless_steel",
  "alloy",
  "titanium",
  "ceramic",
  "gold_plated",
  "plastic",
] as const;
const STRAPS = ["leather", "steel", "mesh", "rubber", "silicone", "fabric"] as const;
const GLASSES = ["mineral", "sapphire", "acrylic"] as const;
const FEATURE_GROUPS = [
  "display",
  "complications",
  "durability",
  "movement",
  "case",
  "strap",
] as const;
function slug(value: string) {
  try {
    return slugify(value);
  } catch {
    return "";
  }
}
function tabOf(key: string): Tab {
  if (key.startsWith("variants")) return "Options";
  if (key.startsWith("images")) return "Images";
  if (key.startsWith("featureIds")) return "Features";
  return "Basics";
}
export function ProductEditor({
  id,
  initial,
  choices,
}: {
  id?: string;
  initial?: ProductInput;
  choices: Choices;
}) {
  const [data, setData] = useState(initial ?? empty);
  const [saved, setSaved] = useState(() => JSON.stringify(initial ?? empty));
  const [tab, setTab] = useState<Tab>("Basics");
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(data) !== saved;
  useUnsavedGuard(dirty && !pending);
  const errors = result?.ok === false ? (result.errors ?? {}) : {};
  const errorTabs = new Set(Object.keys(errors).map(tabOf));
  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setData((d) => ({
      ...d,
      [key]: value,
      ...(key === "name" && !id && (!d.slug || d.slug === slug(d.name))
        ? { slug: slug(String(value)) }
        : {}),
    }));
  }
  function variant(index: number, key: string, value: unknown) {
    setData((d) => ({
      ...d,
      variants: d.variants.map((v, i) =>
        i === index
          ? { ...v, [key]: value }
          : key === "isDefault"
            ? { ...v, isDefault: false }
            : v,
      ),
    }));
  }
  function toggleFeature(featureId: string, on: boolean) {
    set(
      "featureIds",
      on
        ? [...data.featureIds.filter((v) => v !== featureId), featureId]
        : data.featureIds.filter((v) => v !== featureId),
    );
  }
  function moveImage(from: number, to: number) {
    if (to < 0 || to >= data.images.length) return;
    const rows = [...data.images];
    rows.splice(to, 0, rows.splice(from, 1)[0]);
    set("images", rows);
  }
  function save(overrides: Partial<ProductInput> = {}) {
    const payload = { ...data, ...overrides };
    setData(payload);
    start(async () => {
      try {
        const r = await saveProduct(id, payload);
        setResult(r);
        if (r.ok) {
          setSaved(JSON.stringify(payload));
          toast.success(r.message);
          router.replace(`/admin/products/${r.id}`);
          router.refresh();
        } else {
          toast.error(r.message);
          const first = Object.keys(r.errors ?? {})[0];
          if (first) setTab(tabOf(first));
        }
      } catch {
        setResult({ ok: false, message: "Unable to save. Try again." });
        toast.error("Unable to save. Try again.");
      }
    });
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [drag, setDrag] = useState<number>();
  const [uploading, setUploading] = useState(0);
  const uploader = useRef<HTMLInputElement>(null);
  async function addFiles(files: FileList | File[]) {
    const list = [...files];
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const url = await uploadImage(file);
        setData((d) => ({ ...d, images: [...d.images, { url, alt: d.name || "Product image" }] }));
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }
  const brand = choices.brands.find((b) => b.id === data.brandId);
  const activeVariants = data.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => v.price);
  const stock = activeVariants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
  const counts: Record<Tab, number | undefined> = {
    Basics: undefined,
    Options: data.variants.length,
    Images: data.images.length,
    Features: data.featureIds.length,
  };
  const currency = storeConfig.currency.symbol;
  const actions = (
    <>
      {id && initial && (
        <a className="admin-btn ghost" href={`/products/${initial.slug}`} target="_blank" rel="noreferrer">
          View <ArrowUpRight size={15} />
        </a>
      )}
      {id ? (
        <button className="admin-btn primary" disabled={pending} onClick={() => save()}>
          {pending && <LoaderCircle size={16} className="admin-spin" />}
          Save changes
        </button>
      ) : (
        <>
          <button className="admin-btn" disabled={pending} onClick={() => save({ isActive: false })}>
            Save draft
          </button>
          <button className="admin-btn primary" disabled={pending} onClick={() => save({ isActive: true })}>
            {pending && <LoaderCircle size={16} className="admin-spin" />}
            Publish
          </button>
        </>
      )}
    </>
  );
  return (
    <div className="admin-editor">
      <PageHeader
        crumbs={[["Products", "/admin/products"]]}
        title={id ? data.name || "Untitled product" : "Add new watch"}
        description={
          id ? (
            <span className="admin-inline">
              <span className="admin-tag" data-tone={data.isActive ? "good" : "neutral"}>
                {data.isActive ? "Visible in store" : "Hidden"}
              </span>
              {brand?.name}
            </span>
          ) : (
            "Fill in the basics, add at least one option, then publish."
          )
        }
        actions={actions}
      />
      <div className="admin-segments" role="tablist" aria-label="Product editor">
        {TABS.map((t) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls={`product-${t}`}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {counts[t] !== undefined && <span className="admin-count">{counts[t]}</span>}
            {errorTabs.has(t) && <span className="admin-error-dot" aria-label="has errors" />}
          </button>
        ))}
      </div>
      {result && !result.ok && <Result result={result} />}
      <div className="admin-editor-grid">
        <div className="admin-stack" id={`product-${tab}`} role="tabpanel">
          {tab === "Basics" && (
            <>
              <Panel title="Product details">
                <div className="admin-form">
                  <label className="admin-field">
                    <span>Product name</span>
                    <input
                      value={data.name}
                      maxLength={500}
                      placeholder="e.g. Harbor Meridian"
                      aria-invalid={Boolean(errors.name)}
                      onChange={(e) => set("name", e.target.value)}
                    />
                    <FieldError error={errors.name} />
                  </label>
                  <label className="admin-field">
                    <span>URL handle</span>
                    <span className="admin-input-affix">
                      <em>/products/</em>
                      <input
                        value={data.slug}
                        maxLength={160}
                        aria-invalid={Boolean(errors.slug)}
                        onChange={(e) => set("slug", e.target.value)}
                      />
                    </span>
                    <FieldError error={errors.slug} />
                  </label>
                  <MarkdownField
                    label="Description"
                    value={data.description}
                    onChange={(v) => set("description", v)}
                  />
                  <FieldError error={errors.description} />
                </div>
              </Panel>
              <Panel title="Specifications" description="Shoppers filter the catalog by these.">
                <div className="admin-form">
                  <ChipChoice label="Gender" value={data.gender} options={GENDERS} onChange={(v) => set("gender", v)} format={displayLabel} />
                  <ChipChoice label="Condition" value={data.condition} options={CONDITIONS} onChange={(v) => set("condition", v)} format={displayLabel} />
                  <ChipChoice label="Movement" value={data.movement} options={MOVEMENTS} onChange={(v) => set("movement", v)} format={displayLabel} />
                  <ChipChoice label="Style" value={data.style ?? STYLES[0]} options={STYLES} onChange={(v) => set("style", v)} format={displayLabel} />
                  <div className="admin-form-grid three">
                    <label className="admin-field">
                      <span>Case material</span>
                      <select
                        value={data.caseMaterial ?? ""}
                        aria-invalid={Boolean(errors.caseMaterial)}
                        onChange={(e) => set("caseMaterial", (e.target.value || null) as ProductInput["caseMaterial"])}
                      >
                        <option value="">Not set</option>
                        {CASE_MATERIALS.map((v) => (
                          <option key={v} value={v}>
                            {displayLabel(v)}
                          </option>
                        ))}
                      </select>
                      <FieldError error={errors.caseMaterial} />
                    </label>
                    <label className="admin-field">
                      <span>Strap</span>
                      <select
                        value={data.strapType ?? ""}
                        aria-invalid={Boolean(errors.strapType)}
                        onChange={(e) => set("strapType", (e.target.value || null) as ProductInput["strapType"])}
                      >
                        <option value="">Not set</option>
                        {STRAPS.map((v) => (
                          <option key={v} value={v}>
                            {displayLabel(v)}
                          </option>
                        ))}
                      </select>
                      <FieldError error={errors.strapType} />
                    </label>
                    <label className="admin-field">
                      <span>Glass</span>
                      <select
                        value={data.glass ?? ""}
                        aria-invalid={Boolean(errors.glass)}
                        onChange={(e) => set("glass", e.target.value || null)}
                      >
                        <option value="">Not set</option>
                        {GLASSES.map((v) => (
                          <option key={v} value={v}>
                            {displayLabel(v)}
                          </option>
                        ))}
                      </select>
                      <FieldError error={errors.glass} />
                    </label>
                  </div>
                  <div className="admin-form-grid four">
                    <label className="admin-field">
                      <span>Case size (mm)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={200}
                        value={data.caseSizeMm ?? ""}
                        aria-invalid={Boolean(errors.caseSizeMm)}
                        onChange={(e) => set("caseSizeMm", e.target.value ? Number(e.target.value) : null)}
                      />
                      <FieldError error={errors.caseSizeMm} />
                    </label>
                    <label className="admin-field">
                      <span>Water resistance (m)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={data.waterResistanceM ?? ""}
                        aria-invalid={Boolean(errors.waterResistanceM)}
                        onChange={(e) => set("waterResistanceM", e.target.value ? Number(e.target.value) : null)}
                      />
                      <FieldError error={errors.waterResistanceM} />
                    </label>
                    <label className="admin-field">
                      <span>Warranty (months)</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={data.warrantyMonths ?? ""}
                        aria-invalid={Boolean(errors.warrantyMonths)}
                        onChange={(e) => set("warrantyMonths", e.target.value ? Number(e.target.value) : null)}
                      />
                      <FieldError error={errors.warrantyMonths} />
                    </label>
                    <label className="admin-field">
                      <span>Launch year</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1700}
                        max={2200}
                        value={data.launchYear ?? ""}
                        aria-invalid={Boolean(errors.launchYear)}
                        onChange={(e) => set("launchYear", e.target.value ? Number(e.target.value) : null)}
                      />
                      <FieldError error={errors.launchYear} />
                    </label>
                  </div>
                  <div className="admin-form-grid three">
                    <label className="admin-field">
                      <span>Dial colour</span>
                      <input
                        value={data.dialColor ?? ""}
                        maxLength={500}
                        placeholder="e.g. Midnight blue"
                        aria-invalid={Boolean(errors.dialColor)}
                        onChange={(e) => set("dialColor", e.target.value || null)}
                      />
                      <FieldError error={errors.dialColor} />
                    </label>
                    <label className="admin-field">
                      <span>Reference number</span>
                      <input
                        value={data.referenceNo ?? ""}
                        maxLength={500}
                        placeholder="e.g. NW-4402-B"
                        aria-invalid={Boolean(errors.referenceNo)}
                        onChange={(e) => set("referenceNo", e.target.value || null)}
                      />
                      <FieldError error={errors.referenceNo} />
                    </label>
                    <label className="admin-field">
                      <span>Country of origin</span>
                      <input
                        value={data.countryOfOrigin ?? ""}
                        maxLength={500}
                        aria-invalid={Boolean(errors.countryOfOrigin)}
                        onChange={(e) => set("countryOfOrigin", e.target.value || null)}
                      />
                      <FieldError error={errors.countryOfOrigin} />
                    </label>
                  </div>
                </div>
              </Panel>
            </>
          )}

          {tab === "Options" && (
            <Panel
              title="Options, pricing & stock"
              description={`Dial and strap combinations, in whole ${storeConfig.currency.code} amounts. Stock is re-checked when you save, so concurrent orders are never overwritten.`}
            >
              <div className="admin-variants">
                {data.variants.map((v, i) => {
                  const off = v.retailPrice > 0 && v.price < v.retailPrice ? Math.round((1 - v.price / v.retailPrice) * 100) : 0;
                  const err = (key: string) => errors[`variants.${i}.${key}`];
                  return (
                    <fieldset key={v.id ?? i} className="admin-variant" data-inactive={!v.isActive || undefined}>
                      <legend className="admin-sr-only">Option {i + 1}</legend>
                      <div className="admin-variant-head">
                        <span className="admin-variant-title">
                          <strong>{v.optionLabel || `Option ${i + 1}`}</strong>
                          {off > 0 && <span className="admin-tag" data-tone="info">−{off}%</span>}
                        </span>
                        <label className="admin-radio-pill">
                          <input type="radio" name="default-variant" checked={v.isDefault} onChange={() => variant(i, "isDefault", true)} />
                          Default option
                        </label>
                        <label className="admin-switch-inline">
                          <input type="checkbox" role="switch" className="admin-switch" checked={v.isActive} onChange={(e) => variant(i, "isActive", e.target.checked)} />
                          Active
                        </label>
                        <button
                          type="button"
                          className="admin-btn icon sm ghost"
                          disabled={data.variants.length === 1}
                          aria-label={`Remove option ${i + 1}`}
                          onClick={() => set("variants", data.variants.filter((_, n) => n !== i))}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="admin-form-grid four">
                        <label className="admin-field span-2">
                          <span>Option label</span>
                          <input
                            value={v.optionLabel ?? ""}
                            maxLength={500}
                            placeholder="Black dial · steel bracelet"
                            aria-invalid={Boolean(err("optionLabel"))}
                            onChange={(e) => variant(i, "optionLabel", e.target.value || null)}
                          />
                          <FieldError error={err("optionLabel")} />
                        </label>
                        <label className="admin-field span-2">
                          <span>SKU</span>
                          <span className="admin-input-affix">
                            <input value={v.sku} onChange={(e) => variant(i, "sku", e.target.value)} aria-invalid={Boolean(err("sku"))} className="admin-mono" />
                            <button
                              type="button"
                              className="admin-affix-btn"
                              title="Suggest SKU"
                              aria-label="Suggest SKU"
                              onClick={() =>
                                variant(
                                  i,
                                  "sku",
                                  `${slug(brand?.name ?? "brand")}-${slug(data.name) || "watch"}-${slug(v.optionLabel ?? "") || `option-${i + 1}`}`.toUpperCase(),
                                )
                              }
                            >
                              <Sparkles size={15} />
                            </button>
                          </span>
                          <FieldError error={err("sku")} />
                        </label>
                        <label className="admin-field">
                          <span>Retail price</span>
                          <span className="admin-input-affix">
                            <em>{currency}</em>
                            <input type="number" inputMode="numeric" min={0} step={1} value={v.retailPrice} onChange={(e) => variant(i, "retailPrice", Number(e.target.value))} aria-invalid={Boolean(err("retailPrice"))} />
                          </span>
                          <FieldError error={err("retailPrice")} />
                        </label>
                        <label className="admin-field">
                          <span>Selling price</span>
                          <span className="admin-input-affix">
                            <em>{currency}</em>
                            <input type="number" inputMode="numeric" min={0} step={1} value={v.price} onChange={(e) => variant(i, "price", Number(e.target.value))} aria-invalid={Boolean(err("price"))} />
                          </span>
                          <FieldError error={err("price")} />
                        </label>
                        <label className="admin-field">
                          <span>In stock</span>
                          <input type="number" inputMode="numeric" min={0} step={1} value={v.stockQuantity} onChange={(e) => variant(i, "stockQuantity", Number(e.target.value))} aria-invalid={Boolean(err("stockQuantity"))} />
                          <FieldError error={err("stockQuantity")} />
                        </label>
                        <label className="admin-field">
                          <span>Barcode</span>
                          <input value={v.barcode ?? ""} maxLength={500} onChange={(e) => variant(i, "barcode", e.target.value || null)} className="admin-mono" aria-invalid={Boolean(err("barcode"))} />
                          <FieldError error={err("barcode")} />
                        </label>
                      </div>
                    </fieldset>
                  );
                })}
                <button type="button" className="admin-add-tile" onClick={() => set("variants", [...data.variants, blankVariant()])}>
                  <Plus size={16} /> Add another option
                </button>
              </div>
              <FieldError error={errors.variants} />
            </Panel>
          )}

          {tab === "Images" && (
            <Panel
              title="Images"
              description="The first image is the primary shot; the second shows on hover. Drag to reorder."
              actions={
                <button
                  type="button"
                  className="admin-btn sm"
                  onClick={() => set("images", [...data.images, { url: "", alt: data.name }])}
                >
                  <Link2 size={14} /> Add by URL
                </button>
              }
            >
              <div
                className="admin-gallery"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  if (drag === undefined && e.dataTransfer.files.length) {
                    e.preventDefault();
                    void addFiles(e.dataTransfer.files);
                  }
                }}
              >
                {data.images.map((image, i) => (
                  <figure
                    className="admin-gallery-item"
                    key={i}
                    draggable
                    data-dragging={drag === i || undefined}
                    onDragStart={() => setDrag(i)}
                    onDragEnd={() => setDrag(undefined)}
                    onDrop={(e) => {
                      if (drag === undefined) return;
                      e.preventDefault();
                      e.stopPropagation();
                      moveImage(drag, i);
                      setDrag(undefined);
                    }}
                  >
                    <div className="admin-gallery-media">
                      {image.url ? (
                        <Image unoptimized fill sizes="240px" src={image.url} alt={image.alt} />
                      ) : (
                        <span className="admin-muted">No image</span>
                      )}
                      {i < 2 && <span className="admin-gallery-badge">{i === 0 ? "Primary" : "Hover"}</span>}
                      <span className="admin-gallery-grip" aria-hidden>
                        <GripVertical size={14} />
                      </span>
                    </div>
                    <figcaption>
                      {!image.url.startsWith("/uploads/") && (
                        <input
                          value={image.url}
                          aria-label={`Image ${i + 1} URL`}
                          placeholder="https://… or /path.webp"
                          onChange={(e) => set("images", data.images.map((row, n) => (n === i ? { ...row, url: e.target.value } : row)))}
                        />
                      )}
                      <input
                        value={image.alt}
                        aria-label={`Image ${i + 1} alt text`}
                        placeholder="Describe the image"
                        onChange={(e) => set("images", data.images.map((row, n) => (n === i ? { ...row, alt: e.target.value } : row)))}
                      />
                      <FieldError error={errors[`images.${i}.url`] ?? errors[`images.${i}.alt`]} />
                      <div className="admin-gallery-actions">
                        <button type="button" className="admin-btn icon sm ghost" disabled={i === 0} aria-label={`Move image ${i + 1} earlier`} onClick={() => moveImage(i, i - 1)}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="admin-btn icon sm ghost" disabled={i === data.images.length - 1} aria-label={`Move image ${i + 1} later`} onClick={() => moveImage(i, i + 1)}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="admin-btn icon sm ghost danger-text" aria-label={`Remove image ${i + 1}`} onClick={() => set("images", data.images.filter((_, n) => n !== i))}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
                <button type="button" className="admin-gallery-add" onClick={() => uploader.current?.click()} disabled={uploading > 0}>
                  <span className="admin-icon-tile">
                    {uploading ? <LoaderCircle size={18} className="admin-spin" /> : <ImagePlus size={18} />}
                  </span>
                  <strong>{uploading ? `Uploading ${uploading}…` : "Add images"}</strong>
                  <small>Drop files here or browse · resized to WebP</small>
                </button>
              </div>
            </Panel>
          )}

          {tab === "Features" && (
            <Panel
              title="Features"
              description="Grouped features power the storefront filters, the product page chips and related-watch suggestions."
            >
              {choices.features.length ? (
                <div className="admin-form">
                  {FEATURE_GROUPS.map((group) => {
                    const options = choices.features.filter((f) => f.group === group);
                    if (!options.length) return null;
                    const picked = options.filter((f) => data.featureIds.includes(f.id)).length;
                    return (
                      <fieldset className="admin-choice-group" key={group}>
                        <legend>
                          {displayLabel(group)}
                          {picked > 0 && <span className="admin-count">{picked}</span>}
                        </legend>
                        <div className="admin-chips">
                          {options.map((f) => (
                            <label className="admin-chip" key={f.id}>
                              <input
                                type="checkbox"
                                checked={data.featureIds.includes(f.id)}
                                onChange={(e) => toggleFeature(f.id, e.target.checked)}
                              />
                              {f.name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              ) : (
                <p className="admin-callout" data-tone="info">
                  No features yet. Add them under Taxonomy, then attach them here.
                </p>
              )}
              <FieldError error={errors.featureIds} />
            </Panel>
          )}
        </div>

        <aside className="admin-stack admin-editor-rail">
          <Panel
            title="Media"
            actions={
              tab !== "Images" && (
                <button type="button" className="admin-btn sm ghost" onClick={() => setTab("Images")}>
                  Manage
                </button>
              )
            }
          >
            <div className="admin-media-preview">
              <button type="button" className="admin-media-main" onClick={() => setTab("Images")} aria-label="Manage images">
                {data.images[0]?.url ? (
                  <Image unoptimized fill sizes="320px" src={data.images[0].url} alt={data.images[0].alt} />
                ) : (
                  <span>
                    <ImagePlus size={22} />
                    Add a primary image
                  </span>
                )}
              </button>
              <div className="admin-media-thumbs">
                {data.images.slice(1, 3).map((img, i) => (
                  <button type="button" key={i} onClick={() => setTab("Images")} aria-label={`Image ${i + 2}`}>
                    {img.url && <Image unoptimized fill sizes="96px" src={img.url} alt="" />}
                  </button>
                ))}
                <button type="button" className="admin-media-add" onClick={() => { setTab("Images"); uploader.current?.click(); }} aria-label="Add images">
                  {data.images.length > 3 ? `+${data.images.length - 3}` : <Plus size={18} />}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="admin-form">
              <div className="admin-field">
                <Combobox
                  label="Brand"
                  value={data.brandId}
                  placeholder="Search brands"
                  options={choices.brands.map((b) => ({ value: b.id, label: b.name }))}
                  onSelect={(v) => set("brandId", v)}
                />
                <FieldError error={errors.brandId} />
              </div>
              <label className="admin-field">
                <span>Collection name</span>
                <input value={data.collectionName ?? ""} maxLength={500} placeholder="Optional model family" onChange={(e) => set("collectionName", e.target.value || null)} />
                <FieldError error={errors.collectionName} />
              </label>
            </div>
          </Panel>

          <Panel title="Visibility">
            <div className="admin-switch-list">
              {id && (
                <SwitchField label="Visible in store" description="Hidden watches can't be found or bought." checked={data.isActive} onChange={(v) => set("isActive", v)} />
              )}
              <SwitchField label="Featured" description="Eligible for featured carousels." checked={data.isFeatured} onChange={(v) => set("isFeatured", v)} />
              <SwitchField label="Ground shipping only" description="For heavy or bulky items that can't fly." checked={data.groundShippingOnly} onChange={(v) => set("groundShippingOnly", v)} />
            </div>
          </Panel>

          <Panel title="Summary">
            <dl className="admin-meta">
              <div>
                <dt>Price</dt>
                <dd>{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatMoney(prices[0]) : `${formatMoney(Math.min(...prices))} – ${formatMoney(Math.max(...prices))}`) : "—"}</dd>
              </div>
              <div>
                <dt>Stock</dt>
                <dd>{stock} units across {activeVariants.length} active {activeVariants.length === 1 ? "option" : "options"}</dd>
              </div>
              <div>
                <dt>Features</dt>
                <dd>{data.featureIds.length || "None"}</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>
      <input
        ref={uploader}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="admin-savebar" data-visible={dirty || undefined}>
        <span>
          <i aria-hidden /> Unsaved changes
          <kbd className="admin-hide-sm">⌘S</kbd>
        </span>
        <div>
          {id ? (
            <button className="admin-btn primary sm" disabled={pending} onClick={() => save()}>
              {pending && <LoaderCircle size={14} className="admin-spin" />}
              Save changes
            </button>
          ) : (
            <button className="admin-btn primary sm" disabled={pending} onClick={() => save({ isActive: true })}>
              Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
