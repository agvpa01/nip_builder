import React, { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"

export function EmbedInstructions() {
  const defaultBase = useMemo(() => {
    try {
      const o = window.location.origin
      return /convex\.site$/.test(new URL(o).hostname) ? o : "https://YOUR-CONVEX.convex.site"
    } catch {
      return "https://YOUR-CONVEX.convex.site"
    }
  }, [])

  const [convexBase, setConvexBase] = useState<string>(defaultBase)
  const [productUrl, setProductUrl] = useState<string>("")
  const [templateType, setTemplateType] = useState<string>("")
  const [regionOverride, setRegionOverride] = useState<string>("")

  const encodedProductUrl = useMemo(() => encodeURIComponent(productUrl || ""), [productUrl])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {}
  }

  // Load/save default Convex Base URL from admin settings
  const savedBase = useQuery(api.settings.getSetting as any, { key: "embedConvexBaseUrl" } as any) as string | null | undefined
  const setSetting = useMutation(api.settings.setSetting as any)

  useEffect(() => {
    if (savedBase && typeof savedBase === "string") {
      setConvexBase(savedBase)
    }
  }, [savedBase])

  const oneTag = useMemo(() => {
    const attrs: string[] = []
    if (productUrl) attrs.push(`data-product-url="${productUrl}"`)
    if (regionOverride) attrs.push(`data-nip-region="${regionOverride}"`)
    if (templateType) attrs.push(`data-nip-template="${templateType}"`)
    return `<script defer src="${convexBase}/embed.js" ${attrs.join(" ")}></script>`
  }, [convexBase, productUrl, regionOverride, templateType])

  const containerEmbed = useMemo(() => {
    return `<div data-convex-base="${convexBase}"${regionOverride ? ` data-nip-region="${regionOverride}"` : ""}${
      templateType ? ` data-nip-template="${templateType}"` : ""
    }${productUrl ? ` data-product-url="${productUrl}"` : ""}></div>\n<script defer src="${convexBase}/embed.js"></script>`
  }, [convexBase, productUrl, regionOverride, templateType])

  const iframeEmbed = useMemo(() => {
    const qp = new URLSearchParams()
    if (productUrl) qp.set("productUrl", productUrl)
    if (regionOverride) qp.set("region", regionOverride)
    if (templateType) qp.set("templateType", templateType)
    return `<iframe src="${convexBase}/embed?${qp.toString()}" width="100%" height="900" style="border:0" loading="lazy"></iframe>`
  }, [convexBase, productUrl, regionOverride, templateType])

  const shopifyLiquid = useMemo(() => {
    return `{% if product %}\n<script defer src="${convexBase}/embed.js" data-product-url="{{ shop.url }}{{ product.url }}"$${
      regionOverride ? ` data-nip-region=\"${regionOverride}\"` : ""
    }${templateType ? ` data-nip-template=\"${templateType}\"` : ""}></script>\n{% endif %}`
  }, [convexBase, regionOverride, templateType])

  const shogunHtml = useMemo(() => {
    return `<div data-convex-base="${convexBase}"${productUrl ? ` data-product-url="${productUrl}"` : ""}$${
      regionOverride ? ` data-nip-region=\"${regionOverride}\"` : ""
    }${templateType ? ` data-nip-template=\"${templateType}\"` : ""}></div>\n<script defer src="${convexBase}/embed.js"></script>`
  }, [convexBase, productUrl, regionOverride, templateType])

  const ssrPhp = useMemo(() => {
    return `<?php\n  $convex = '${convexBase}';\n  $url = isset($product) ? (getenv('SHOP_URL') . $product->url) : '${productUrl}';\n  $api = $convex . '/embed.json?productUrl=' . urlencode($url)${
      regionOverride ? ` . '&region=' . urlencode('${regionOverride}')` : ""
    }${templateType ? ` . '&templateType=' . urlencode('${templateType}')` : ""};\n  $resp = @file_get_contents($api);\n  if ($resp !== false) { $data = json_decode($resp, true); if (!empty($data['html'])) { echo $data['html']; } }\n?>`
  }, [convexBase, productUrl, regionOverride, templateType])

  const testLinks = useMemo(() => {
    const jsonUrl = `${convexBase}/embed.json?${productUrl ? `productUrl=${encodedProductUrl}` : ""}${
      regionOverride ? `&region=${encodeURIComponent(regionOverride)}` : ""
    }${templateType ? `&templateType=${encodeURIComponent(templateType)}` : ""}`
    const htmlUrl = `${convexBase}/embed?${productUrl ? `productUrl=${encodedProductUrl}` : ""}${
      regionOverride ? `&region=${encodeURIComponent(regionOverride)}` : ""
    }${templateType ? `&templateType=${encodeURIComponent(templateType)}` : ""}`
    return { jsonUrl, htmlUrl }
  }, [convexBase, productUrl, encodedProductUrl, regionOverride, templateType])

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Embed NIPs on VPA Websites</h2>
        <p className="text-gray-600 text-sm">Use the fields to generate ready‑to‑paste snippets. Default behavior auto‑detects region (AU vs US) and product slug from the URL.</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Convex Base URL</label>
            <div className="flex gap-2 items-center mt-1">
              <input value={convexBase} onChange={(e)=>setConvexBase(e.target.value)} placeholder="https://YOUR-CONVEX.convex.site" className="w-full px-3 py-2 border rounded" />
              <button
                onClick={async ()=>{ await setSetting({ key: "embedConvexBaseUrl", value: convexBase }); }}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >Save</button>
            </div>
            <div className="text-xs text-gray-500 mt-1">This saves the default embed base URL in Convex for all admins.</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Page URL (optional)</label>
            <input value={productUrl} onChange={(e)=>setProductUrl(e.target.value)} placeholder="https://www.vpa.com.au/products/handle" className="mt-1 w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Region Override (optional)</label>
            <select value={regionOverride} onChange={(e)=>setRegionOverride(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded">
              <option value="">Auto</option>
              <option value="AU">AU</option>
              <option value="US">US</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Template (optional)</label>
            <input value={templateType} onChange={(e)=>setTemplateType(e.target.value)} placeholder="protein_powder, supplements, ..." className="mt-1 w-full px-3 py-2 border rounded" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SnippetCard title="One‑tag (auto‑detect)" code={oneTag} onCopy={() => copy(oneTag)} note="Best for product pages. If no URL provided, the script uses the current page URL." />
        <SnippetCard title="Explicit container" code={containerEmbed} onCopy={() => copy(containerEmbed)} note="Good for page builders (Shogun)." />
        <SnippetCard title="Shopify Liquid (product template)" code={shopifyLiquid} onCopy={() => copy(shopifyLiquid)} note="Renders on product pages using shop.url + product.url." />
        <SnippetCard title="Iframe (quick check)" code={iframeEmbed} onCopy={() => copy(iframeEmbed)} note="Not SEO‑beneficial. Use only if needed." />
        <SnippetCard title="SSR example (PHP)" code={ssrPhp} onCopy={() => copy(ssrPhp)} note="Server‑rendered for best SEO." />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700 font-medium">Test Links</div>
            <div className="text-xs text-gray-500">Open in new tab to verify output</div>
          </div>
          <div className="flex gap-2">
            <a className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200" target="_blank" href={testLinks.htmlUrl} rel="noreferrer">/embed (HTML)</a>
            <a className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200" target="_blank" href={testLinks.jsonUrl} rel="noreferrer">/embed.json (JSON)</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function SnippetCard({ title, code, onCopy, note }: { title: string; code: string; onCopy: () => void; note?: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-900 text-sm">{title}</div>
        <button onClick={onCopy} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Copy</button>
      </div>
      {note && <div className="text-xs text-gray-500 mb-2">{note}</div>}
      <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto"><code>{code}</code></pre>
    </div>
  )
}
