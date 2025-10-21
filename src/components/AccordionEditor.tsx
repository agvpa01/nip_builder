import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionEditorProps {
  products?: any[] | undefined;
}

const ACCORDION_SETTINGS_KEY = "productAccordionItems";
const DEFAULT_SCOPE_TOKEN = "__default__";

const DEFAULT_ACCORDION_ITEMS: AccordionItem[] = [
  {
    id: "description",
    title: "Description",
    content:
      "<p>VPA Whey Isolate is Australia's leading Whey Protein Isolate; ultra-pure, fast-absorbing, low-carb, and high-protein. Ideal for lean muscle growth and recovery. No fillers. No hype. Just results.</p>",
  },
  {
    id: "flavour",
    title: "Flavour Guarantee",
    content:
      "<p>At VPA®, we don’t rush flavours. Every one is crafted in-house by our food technician with 15+ years’ experience, then refined through months of blind taste testing with real customers.</p><p>The result? Flavours made for our community, by our community.</p><p>But if it’s not your thing? No worries. We’ll replace it with another flavour of your choice — <b>on the house</b>.</p><p><b>Satisfaction Guarantee:</b> <br />Not 100% happy? Return it with at least 90% remaining and we’ll organise an exchange.</p>",
  },
  {
    id: "nutrition",
    title: "Nutritional Facts &amp; Ingredients",
    content:
      '<div data-convex-base="https://useful-llama-278.convex.site"></div><script async src="https://useful-llama-278.convex.site/embed.js?v=1234123432"></script>',
  },
];

const ACCORDION_STYLE = `
  .rpg-accordion-root,
  .rpg-accordion-root * {
    box-sizing: border-box;
  }

  .rpg-accordion-root {
    margin-top: 15px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    padding: 8px 30px;
    line-height: 1.6;
    background-color: #f5f5f5;
    border-radius: 8px;
  }

  .rpg-accordion {
    max-width: 600px;
    margin: 0 auto;
  }

  .rpg-accordion__item {
    border-bottom: 1px solid #e0ddd8;
  }

  .rpg-accordion__item:last-child {
    border-bottom: none;
  }

  .rpg-accordion__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 2px;
    color: #1a1a1a;
    text-transform: uppercase;
    transition: color 0.2s ease;
  }

  .rpg-accordion__icon {
    font-size: 18px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 300;
    line-height: 1;
  }

  .rpg-accordion__item.is-active .rpg-accordion__icon {
    transform: rotate(45deg);
  }

  .rpg-accordion__content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .rpg-accordion__content-inner {
    color: #1a1a1a;
    font-size: 14px;
    line-height: 1.7;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s;
  }

  .rpg-accordion__item.is-active .rpg-accordion__content-inner {
    opacity: 1;
    transform: translateY(0);
  }

  .rpg-accordion__content-inner h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #1a1a1a;
  }

  .rpg-accordion__content-inner p {
    margin-bottom: 16px;
  }

  .rpg-accordion__content-inner ul {
    margin-left: 20px;
    margin-top: 12px;
  }

  .rpg-accordion__content-inner li {
    margin-bottom: 8px;
  }
`;

const ACCORDION_SCRIPT = `
  document.querySelectorAll(".rpg-accordion").forEach((accordion) => {
    const items = accordion.querySelectorAll(".rpg-accordion__item");
    const headers = accordion.querySelectorAll(".rpg-accordion__header");

    headers.forEach((header) => {
      header.addEventListener("click", () => {
        const item = header.closest(".rpg-accordion__item");
        if (!item) {
          return;
        }

        const wasActive = item.classList.contains("is-active");

        items.forEach((accordionItem) => {
          accordionItem.classList.remove("is-active");
          const content = accordionItem.querySelector(".rpg-accordion__content");
          if (content) {
            content.style.maxHeight = null;
          }
        });

        if (!wasActive) {
          item.classList.add("is-active");
          const content = item.querySelector(".rpg-accordion__content");
          if (content) {
            content.style.maxHeight = content.scrollHeight + "px";
          }
        }
      });
    });

    const activeItem = accordion.querySelector(".rpg-accordion__item.is-active");
    if (activeItem) {
      const content = activeItem.querySelector(".rpg-accordion__content");
      if (content) {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    }
  });
`;

const configuredWidgetOrigin = (() => {
  const explicit =
    (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ||
    (import.meta.env.VITE_PROFILE_WIDGET_BASE_URL as string | undefined);

  if (explicit && explicit.length > 0) {
    return explicit;
  }

  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!convexUrl) {
    return undefined;
  }

  try {
    const url = new URL(convexUrl);
    if (url.hostname.endsWith(".convex.cloud")) {
      url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
      url.port = "";
      return url.origin;
    }
    return url.origin;
  } catch {
    return convexUrl;
  }
})();

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

const executeScriptsInElement = (root: HTMLElement) => {
  const scripts = root.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const parent = oldScript.parentNode;
    if (!parent) {
      return;
    }
    const newScript = document.createElement("script");
    for (const attr of Array.from(oldScript.attributes)) {
      newScript.setAttribute(attr.name, attr.value);
    }
    newScript.async = oldScript.async;
    newScript.defer = oldScript.defer;
    newScript.type = oldScript.type || "text/javascript";
    const src = oldScript.getAttribute("src");
    if (src) {
      newScript.src = src;
    }
    if (!oldScript.src) {
      newScript.textContent = oldScript.textContent ?? "";
    }
    parent.replaceChild(newScript, oldScript);
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const generateId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const normalizeItems = (value: unknown): AccordionItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((entry, index) => {
      const title =
        typeof entry?.title === "string" && entry.title.trim().length
          ? entry.title
          : `Accordion Item ${index + 1}`;
      const content =
        typeof entry?.content === "string" ? entry.content : "";
      const id =
        typeof entry?.id === "string" && entry.id.trim().length
          ? entry.id
          : generateId();
      return { id, title, content };
    })
    .filter((entry) => entry.title.trim().length > 0 || entry.content.trim().length > 0);
};

const generateAccordionHtml = (items: AccordionItem[]): string => {
  const sanitizedItems = items.length ? items : DEFAULT_ACCORDION_ITEMS;
  const itemsMarkup = sanitizedItems
    .map((item, index) => {
      const activeClass = index === 0 ? " is-active" : "";
      return `
    <div class="rpg-accordion__item${activeClass}">
      <button class="rpg-accordion__header">
        <span>${escapeHtml(item.title || "Accordion Item")}</span>
        <span class="rpg-accordion__icon">+</span>
      </button>
      <div class="rpg-accordion__content">
        <div class="rpg-accordion__content-inner">
          ${item.content || ""}
        </div>
      </div>
    </div>`;
    })
    .join("\n");

  return `
<style>
${ACCORDION_STYLE.trim()}
</style>

<div class="rpg-accordion-root">
  <div class="rpg-accordion">
${itemsMarkup}
  </div>
</div>

<script>
${ACCORDION_SCRIPT.trim()}
</script>
`.trim();
};

export function AccordionEditor({ products: initialProducts }: AccordionEditorProps) {
  const savedItems = useQuery(api.settings.getSetting as any, {
    key: ACCORDION_SETTINGS_KEY,
  } as any) as AccordionItem[] | null | undefined;
  const setSetting = useMutation(api.settings.setSetting as any);
  const productsFromQuery = useQuery(
    api.products.getAllProducts as any,
    initialProducts ? "skip" : {}
  ) as any[] | undefined;

  const products = useMemo(
    () => initialProducts ?? productsFromQuery ?? [],
    [initialProducts, productsFromQuery]
  );
  const productsLoading =
    !initialProducts && productsFromQuery === undefined;

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [items, setItems] = useState<AccordionItem[]>(DEFAULT_ACCORDION_ITEMS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const productAccordion = useQuery(
    api.accordions.getProductAccordion as any,
    selectedProductId ? ({ productId: selectedProductId } as any) : "skip"
  ) as
    | {
        hasOverride: boolean;
        items: AccordionItem[] | null;
        productSlug: string | null;
        productTitle: string | null;
        updatedAt: number | null;
        updatedBy: string | null;
      }
    | null
    | undefined;

  const saveProductAccordion = useMutation(
    api.accordions.saveProductAccordion as any
  );
  const clearProductAccordion = useMutation(
    api.accordions.clearProductAccordion as any
  );

  const defaultNormalized = useMemo(() => {
    if (savedItems === undefined) {
      return undefined;
    }
    const normalized = normalizeItems(savedItems);
    return normalized && normalized.length
      ? normalized
      : DEFAULT_ACCORDION_ITEMS;
  }, [savedItems]);

  const filteredProducts = useMemo(() => {
    if (!productFilter.trim()) {
      return products;
    }
    const queryText = productFilter.trim().toLowerCase();
    return products.filter((product: any) => {
      const title = (product?.title || "").toString().toLowerCase();
      const slug = (product?.onlineStoreUrl || "").toString().toLowerCase();
      return title.includes(queryText) || slug.includes(queryText);
    });
  }, [products, productFilter]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) {
      return null;
    }
    return (
      products.find((product: any) => product?._id === selectedProductId) ??
      null
    );
  }, [products, selectedProductId]);

  const productOverrideItems = useMemo(() => {
    if (!selectedProductId || !productAccordion || !productAccordion?.items) {
      return null;
    }
    const normalized = normalizeItems(productAccordion.items);
    return normalized && normalized.length ? normalized : null;
  }, [selectedProductId, productAccordion]);

  useEffect(() => {
    if (selectedProductId) {
      if (productAccordion === undefined) {
        return;
      }
      if (loadedScope === selectedProductId && hasUnsavedChanges) {
        return;
      }
      const nextItems =
        productOverrideItems && productOverrideItems.length
          ? productOverrideItems
          : defaultNormalized ?? DEFAULT_ACCORDION_ITEMS;
      setItems(nextItems);
      setHasLoadedSettings(true);
      setHasUnsavedChanges(false);
      setLoadedScope(selectedProductId);
      return;
    }

    if (defaultNormalized === undefined) {
      return;
    }
    if (loadedScope === DEFAULT_SCOPE_TOKEN && hasUnsavedChanges) {
      return;
    }
    setItems(defaultNormalized);
    setHasLoadedSettings(true);
    setHasUnsavedChanges(false);
    setLoadedScope(DEFAULT_SCOPE_TOKEN);
  }, [
    selectedProductId,
    productAccordion,
    productOverrideItems,
    defaultNormalized,
    hasUnsavedChanges,
    loadedScope,
  ]);

  const generatedHtml = useMemo(() => generateAccordionHtml(items), [items]);

  const editingDefault = !selectedProductId;
  const hasOverride = !!(selectedProductId && productAccordion?.hasOverride);
  const productSlug =
    productAccordion?.productSlug ||
    (selectedProduct?.onlineStoreUrl
      ? selectedProduct.onlineStoreUrl
      : null);
  const productUpdatedAt =
    productAccordion?.updatedAt && productAccordion.updatedAt > 0
      ? new Date(productAccordion.updatedAt).toLocaleString()
      : null;

  const baseUrl = useMemo(() => {
    if (configuredWidgetOrigin) {
      return normalizeOrigin(configuredWidgetOrigin);
    }

    if (typeof window === "undefined") {
      return "https://your-convex-deployment.convex.site";
    }

    return window.location.origin;
  }, []);

  const widgetSnippet = useMemo(() => {
    const attributes: string[] = [];
    if (!editingDefault && productSlug) {
      attributes.push(` data-product-slug="${productSlug}"`);
    }
    return `<div data-accordion-widget${attributes.join("")}></div>
<script async src="${baseUrl}/accordion-widget.js" data-api-base="${baseUrl}"></script>`;
  }, [baseUrl, editingDefault, productSlug]);

  const fetchSnippet = useMemo(
    () =>
      `fetch('${baseUrl}/api/accordion?productUrl=' + encodeURIComponent(window.location.href))
  .then((res) => res.json())
  .then((data) => {
    if (data.success && Array.isArray(data.items)) {
      // Render accordion items here
    }
  });`,
    [baseUrl]
  );

  const copyToClipboard = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(successMessage);
      } catch (error) {
        console.error(error);
        toast.error("Unable to copy. Please copy manually.");
      }
    },
    []
  );

  const handleCopyHtml = useCallback(() => {
    void copyToClipboard(generatedHtml, "Accordion HTML copied to clipboard");
  }, [copyToClipboard, generatedHtml]);

  const loading =
    !hasLoadedSettings ||
    (selectedProductId
      ? productAccordion === undefined
      : defaultNormalized === undefined);

  const handleScopeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextValue = event.target.value;
      const normalizedNext = nextValue
        ? (nextValue as Id<"products">)
        : null;
      const currentValue = selectedProductId ?? "";
      if (
        hasUnsavedChanges &&
        (normalizedNext ?? "") !== currentValue
      ) {
        const shouldSwitch = window.confirm(
          "You have unsaved changes. Switch products and discard them?"
        );
        if (!shouldSwitch) {
          if (selectRef.current) {
            selectRef.current.value = currentValue;
          }
          return;
        }
      }
      setSelectedProductId(normalizedNext);
      setHasUnsavedChanges(false);
      setHasLoadedSettings(false);
      setLoadedScope(null);
    },
    [hasUnsavedChanges, selectedProductId]
  );

  const handleFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setProductFilter(event.target.value);
    },
    []
  );

  const handleClearOverride = useCallback(async () => {
    if (!selectedProductId) {
      return;
    }
    if (
      !window.confirm(
        "Remove the saved override for this product? It will fall back to the global default content."
      )
    ) {
      return;
    }
    try {
      await clearProductAccordion(
        { productId: selectedProductId } as any
      );
      toast.success("Product override cleared");
      setHasUnsavedChanges(false);
      setHasLoadedSettings(false);
      setLoadedScope(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear product override");
    }
  }, [selectedProductId, clearProductAccordion]);

  const handleApplyGlobalDefault = useCallback(() => {
    if (!defaultNormalized) {
      toast.error("Global default content is still loading.");
      return;
    }
    setItems(defaultNormalized);
    setHasUnsavedChanges(true);
  }, [defaultNormalized]);

  const updateItem = (id: string, updates: Partial<AccordionItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setHasUnsavedChanges(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: generateId(),
        title: `Accordion Item ${prev.length + 1}`,
        content: "",
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setHasUnsavedChanges(true);
  };

  const resetToDefaults = () => {
    if (
      !window.confirm(
        "Reset accordion items to the base template? Unsaved changes will be lost."
      )
    ) {
      return;
    }
    setItems(DEFAULT_ACCORDION_ITEMS);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = items.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
      }));

      if (selectedProductId) {
        await saveProductAccordion({
          productId: selectedProductId,
          items: payload,
        } as any);
        toast.success(
          `Accordion saved for ${
            selectedProduct?.title || "selected product"
          }`
        );
        setLoadedScope(selectedProductId);
      } else {
        await setSetting({
          key: ACCORDION_SETTINGS_KEY,
          value: payload,
        } as any);
        toast.success("Default accordion items saved");
        setLoadedScope(DEFAULT_SCOPE_TOKEN);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save accordion items");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-6 w-6 border-b-2 border-blue-600 rounded-full animate-spin" />
          <span>Loading accordion settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Choose accordion scope
            </h2>
            <p className="text-sm text-gray-600">
              Select a product to override its accordion or edit the global
              default used when no override exists.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Editing scope
            </label>
            <select
              ref={selectRef}
              value={selectedProductId ?? ""}
              onChange={handleScopeChange}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={productsLoading}
            >
              <option value="">Global default (fallback)</option>
              {filteredProducts.map((product: any) => (
                <option key={product._id} value={product._id}>
                  {product.title || "Untitled product"}
                  {product.onlineStoreUrl
                    ? ` (${product.onlineStoreUrl})`
                    : ""}
                </option>
              ))}
            </select>
            {productsLoading && (
              <p className="text-xs text-gray-500 mt-1">
                Loading products...
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Filter products
            </label>
            <input
              type="text"
              value={productFilter}
              onChange={handleFilterChange}
              placeholder="Search by title or slug"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={productsLoading}
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {editingDefault
            ? "Editing the global default accordion. Products without overrides will render this content."
            : `Editing ${selectedProduct?.title || "selected product"}${
                productSlug ? ` (${productSlug})` : ""
              }.`}
        </div>
        {!editingDefault && !hasOverride && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            No override saved yet for this product. Save changes to create one.
          </div>
        )}
        {!editingDefault && hasOverride && productUpdatedAt && (
          <div className="text-xs text-gray-500">
            Last updated {productUpdatedAt}.
          </div>
        )}
        {!editingDefault && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleApplyGlobalDefault}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Copy global default
            </button>
            {hasOverride && (
              <button
                type="button"
                onClick={handleClearOverride}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
              >
                Clear override
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Embed accordion widget
            </h2>
            <p className="text-sm text-gray-600">
              Drop this snippet anywhere in Shopify or another storefront to
              render the latest accordion configuration from Convex.
            </p>
          </div>
          <button
            onClick={() =>
              void copyToClipboard(
                widgetSnippet,
                "Accordion widget snippet copied"
              )
            }
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Copy snippet
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto whitespace-pre">
          {widgetSnippet}
        </pre>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>
            Loads the default accordion configuration (
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              {ACCORDION_SETTINGS_KEY}
            </code>
            ). Add{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              data-accordion-key
            </code>{" "}
            to the container or script only when targeting an alternative saved
            set.
          </li>
          <li>
            Embed on non-product pages by setting{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              data-product-url
            </code>{" "}
            or{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              data-product-slug
            </code>
            . Otherwise the widget reads the current browser URL.
          </li>
          <li>
            Override{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              data-api-base
            </code>{" "}
            if the widget should call a different Convex deployment.
          </li>
          <li>
            The script fetches accordion data from{" "}
            <code className="px-1 py-0.5 bg-gray-100 rounded">
              {baseUrl}/api/accordion
            </code>{" "}
            and renders it with the bundled styles and interactions.
          </li>
        </ul>
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Fetch accordion JSON
              </h3>
              <p className="text-sm text-gray-600">
                Use the public endpoint when you want to render the accordion
                yourself in a Liquid template or SPA.
              </p>
            </div>
            <button
              onClick={() =>
                void copyToClipboard(
                  fetchSnippet,
                  "Accordion fetch snippet copied"
                )
              }
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Copy fetch snippet
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto whitespace-pre">
            {fetchSnippet}
          </pre>
          <p className="text-sm text-gray-600">
            API responses look like{" "}
            <code>{"{ success: boolean, items: AccordionItem[], html: string }"}</code>{" "}
            so you can render or transform the data however you need.
          </p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Accordion Content
            </h2>
            <p className="text-sm text-gray-600">
              Add, remove, or reorder accordion panels. Content supports HTML.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !items.length}
              className={`px-4 py-2 text-sm font-medium rounded text-white ${
                isSaving || !items.length
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        {hasUnsavedChanges && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            You have unsaved changes.
          </div>
        )}
        <div className="space-y-6">
          {items.length === 0 && (
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
              No accordion items. Click &quot;Add item&quot; to create one.
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Item {index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="px-2 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600">
                    Title
                  </span>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateItem(item.id, { title: event.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border rounded bg-white"
                    placeholder="Accordion item title"
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-600">
                    Content
                  </span>
                  <RichTextEditor
                    value={item.content}
                    onChange={(next) => updateItem(item.id, { content: next })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="px-3 py-2 text-sm bg-white border border-dashed border-gray-400 rounded hover:bg-gray-100"
        >
          Add item
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <p className="text-sm text-gray-600">
                Interacts like the live accordion.
              </p>
            </div>
          </div>
          <AccordionPreview items={items} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Generated HTML
              </h3>
              <p className="text-sm text-gray-600">
                Copy and embed where needed.
              </p>
            </div>
            <button
              onClick={handleCopyHtml}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copy HTML
            </button>
          </div>
          <textarea
            readOnly
            value={generatedHtml}
            className="flex-1 font-mono text-xs bg-gray-50 border border-gray-200 rounded p-3"
          />
        </div>
      </div>
    </div>
  );
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const supportsExec = typeof document !== "undefined" && !!document.execCommand;

  useEffect(() => {
    if (mode !== "visual") {
      return;
    }
    const el = editorRef.current;
    if (!el) {
      return;
    }
    const next = value && value.length ? value : "<p></p>";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value, mode]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) {
      return;
    }
    onChange(el.innerHTML);
  }, [onChange]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (!supportsExec) {
        return;
      }
      const el = editorRef.current;
      if (!el) {
        return;
      }
      el.focus();
      document.execCommand(command, false, commandValue);
      handleInput();
    },
    [handleInput, supportsExec]
  );

  const ensureParagraph = useCallback(() => {
    runCommand("formatBlock", "p");
  }, [runCommand]);

  const clearFormatting = useCallback(() => {
    if (!supportsExec) {
      return;
    }
    const el = editorRef.current;
    if (!el) {
      return;
    }
    el.focus();
    document.execCommand("removeFormat");
    // Remove headings/lists by wrapping in paragraph
    runCommand("formatBlock", "p");
  }, [runCommand, supportsExec]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "visual" ? "html" : "visual"));
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          {mode === "visual" && (
            <>
              <ToolbarButton onClick={() => runCommand("bold")} label="Bold" />
              <ToolbarButton onClick={() => runCommand("italic")} label="Italic" />
              <ToolbarButton onClick={() => runCommand("underline")} label="Underline" />
              <ToolbarButton onClick={ensureParagraph} label="Paragraph" />
              <ToolbarButton onClick={() => runCommand("formatBlock", "h3")} label="Heading" />
              <ToolbarButton onClick={() => runCommand("insertUnorderedList")} label="Bullets" />
              <ToolbarButton onClick={() => runCommand("insertOrderedList")} label="Numbered" />
              <ToolbarButton onClick={clearFormatting} label="Clear" />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={toggleMode}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200"
        >
          {mode === "visual" ? "Switch to HTML" : "Back to visual editor"}
        </button>
      </div>
      {mode === "visual" ? (
        <>
          <div
            className={`border rounded bg-white transition-shadow ${
              isFocused ? "border-blue-400 shadow-sm" : "border-gray-300"
            }`}
          >
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[160px] px-3 py-2 focus:outline-none text-sm leading-relaxed"
              onInput={handleInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
          <p className="text-xs text-gray-500">
            Use the toolbar to format text. Content is saved as HTML automatically.
          </p>
        </>
      ) : (
        <>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-[180px] w-full font-mono text-xs bg-white border border-gray-300 rounded px-3 py-2 leading-relaxed"
            spellCheck={false}
          />
          <p className="text-xs text-gray-500">
            HTML mode keeps advanced markup (including scripts). Scripts will not execute in the preview
            but are included in the generated accordion markup.
          </p>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200"
    >
      {label}
    </button>
  );
}

function AccordionPreview({ items }: { items: AccordionItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    items.length ? 0 : null
  );
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(null);
      return;
    }
    if (activeIndex === null || activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [items, activeIndex]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) {
      return;
    }
    executeScriptsInElement(container);
  }, [items]);

  if (!items.length) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
        Add an accordion item to see the live preview.
      </div>
    );
  }

  return (
    <div ref={previewRef} className="rpg-accordion-preview">
      <style>{ACCORDION_STYLE}</style>
      <div className="rpg-accordion-root">
        <div className="rpg-accordion">
          {items.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <div
                key={item.id}
                className={`rpg-accordion__item${isActive ? " is-active" : ""}`}
              >
                <button
                  type="button"
                  className="rpg-accordion__header"
                  onClick={() =>
                    setActiveIndex(isActive ? null : index)
                  }
                >
                  <span>{item.title || `Accordion Item ${index + 1}`}</span>
                  <span className="rpg-accordion__icon">+</span>
                </button>
                <div
                  className="rpg-accordion__content"
                  style={{ maxHeight: isActive ? "1200px" : "0px" }}
                >
                  <div
                    className="rpg-accordion__content-inner"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive
                        ? "translateY(0)"
                        : "translateY(-10px)",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: item.content || "<p></p>",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
