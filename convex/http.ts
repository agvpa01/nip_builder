import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Public embed routes for NIPs
// Helper to extract slug and infer region from a full product URL
function deriveFromProductUrl(raw: string | null): {
  slug?: string;
  regionHint?: string;
} {
  if (!raw) return {};
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const regionHint =
      host.endsWith(".com.au") || host.endsWith(".au") ? "AU" : "US";
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    const slug = decodeURIComponent(last);
    return { slug, regionHint };
  } catch {
    // Not a full URL; treat as slug
    return { slug: raw };
  }
}
http.route({
  path: "/embed.js",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const js = `(()=>{
  function parseInputUrl(input){
    try{
      const u=new URL(input);
      const host=u.hostname.toLowerCase();
      const region=(host.endsWith('.com.au')||host.endsWith('.au'))?'AU':'US';
      const parts=u.pathname.split('/').filter(Boolean);
      const last=parts[parts.length-1]||'';
      return {slug:decodeURIComponent(last),region};
    }catch{ return {slug:input}; }
  }
  function mountNip(mount, base, slug, regionOpt, template){
    const region = regionOpt || ((location.hostname.endsWith('.com.au')||location.hostname.endsWith('.au'))?'AU':'US');
    const qs=new URLSearchParams({onlineStoreUrl:slug,region:region});
    if (template) qs.set('templateType', template);
    fetch(base + '/embed.json?' + qs.toString(), {credentials:'omit'})
      .then(r=> r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(data=>{
        if(!data||!data.html) return;
        const doc=new DOMParser().parseFromString(data.html,'text/html');
        doc.head.querySelectorAll('style').forEach(st=>document.head.appendChild(st.cloneNode(true)));
        const contentsEls=[...doc.querySelectorAll('.tab-content')];
        const container=document.createElement('div');
        container.className='tab-container';
        const selectFromDoc = doc.getElementById('variantSelect');

        if (selectFromDoc) {
          // Clone dropdown UI and wire events
          const row=document.createElement('div');
          row.className='selector-row';
          const label=document.createElement('label');
          label.htmlFor='variantSelect';
          label.textContent='Select Variant:';
          const select=document.createElement('select');
          select.id='variantSelect';
          [...selectFromDoc.options].forEach((opt,i)=>{
            const o=document.createElement('option');
            o.value= opt.value; o.textContent= opt.textContent || ('Variant ' + (i+1));
            if (opt.selected) o.selected = true;
            select.appendChild(o);
          });
          row.appendChild(label); row.appendChild(select);
          container.appendChild(row);

          // Panels
          contentsEls.forEach((el,i)=>{
            const panel=document.createElement('div');
            panel.className = 'tab-content' + (i===0?' active':'');
            panel.dataset.index = String(i);
            panel.innerHTML = el.innerHTML;
            panel.id = el.id || ('variant-' + i);
            container.appendChild(panel);
          });

          const syncToSelect = ()=>{
            const val = select.value;
            // Hide all
            container.querySelectorAll('.tab-content.active').forEach(el=>el.classList.remove('active'));
            const show = container.querySelector('#' + CSS.escape(val));
            if (show) show.classList.add('active');
            else {
              // Fallback to first
              const first = container.querySelector('.tab-content');
              if (first) first.classList.add('active');
            }
          };
          // Initialize and bind
          syncToSelect();
          select.addEventListener('change', syncToSelect);
        } else {
          // Fallback to legacy tab buttons if dropdown not present
          const labels=[...doc.querySelectorAll('.tab-buttons .tab-button')].map(b=> (b.textContent||'').trim());
          const bar=document.createElement('div');
          bar.className='tab-buttons';
          labels.forEach((label,i)=>{
            const btn=document.createElement('button');
            btn.className='tab-button' + (i===0?' active':'');
            btn.textContent= label || ('Variant ' + (i+1));
            btn.dataset.index= String(i);
            bar.appendChild(btn);
          });
          container.appendChild(bar);
          contentsEls.forEach((el,i)=>{
            const panel=document.createElement('div');
            panel.id='variant-' + i;
            panel.className='tab-content' + (i===0?' active':'');
            panel.dataset.index= String(i);
            panel.innerHTML= el.innerHTML;
            container.appendChild(panel);
          });
          container.addEventListener('click', (ev)=>{
            const t = ev.target && ev.target.closest ? ev.target.closest('.tab-button') : null;
            const btn = t as any;
            if(!btn) return;
            ev.preventDefault();
            const idx = btn.dataset.index;
            container.querySelectorAll('.tab-button.active').forEach(el=>el.classList.remove('active'));
            container.querySelectorAll('.tab-content.active').forEach(el=>el.classList.remove('active'));
            btn.classList.add('active');
            const panel = container.querySelector('.tab-content[data-index="' + idx + '"]');
            if(panel) panel.classList.add('active');
          });
        }

        const footer=doc.querySelector('.footer');
        if (footer) container.appendChild(footer.cloneNode(true));
        mount.innerHTML='';
        mount.appendChild(container);
      })
      .catch(err=>{ console.error('[NIP embed]', err); mount.textContent='Nutritional panel unavailable.'; });
  }
  function init(){
    const scriptEmbeds=[...document.querySelectorAll('script[src*="/embed.js"],script[data-nip-slug],script[data-product-url]')];
    scriptEmbeds.forEach(s=>{
      const base = s.dataset.convexBase || new URL(s.src, location.href).origin;
      let region = s.dataset.nipRegion || '';
      let slug = s.dataset.nipSlug || '';
      const prodUrl = s.dataset.productUrl || s.getAttribute('data-product-url');
      if(!slug && prodUrl){ const d=parseInputUrl(prodUrl); slug=d.slug; if(!region) region=d.region||''; }
      if(!slug) return;
      let mount = null; const sel = s.dataset.mount || s.getAttribute('data-mount');
      mount = sel ? document.querySelector(sel) : null;
      if(!mount){ mount=document.createElement('div'); s.parentNode.insertBefore(mount, s); }
      mountNip(mount, base, slug, region, s.dataset.nipTemplate || '');
    });
    [...document.querySelectorAll('[data-convex-base][data-nip-slug], [data-convex-base][data-product-url]')].forEach(el=>{
      const base = el.dataset.convexBase;
      let region = el.dataset.nipRegion || '';
      let slug = el.dataset.nipSlug || '';
      const prodUrl = el.dataset.productUrl || '';
      if(!slug && prodUrl){ const d=parseInputUrl(prodUrl); slug=d.slug; if(!region) region=d.region||''; }
      if(!slug) return;
      mountNip(el, base, slug, region, el.dataset.nipTemplate || '');
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();`;
    return new Response(js, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  }),
});
http.route({
  path: "/embed",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const productUrlParam =
      url.searchParams.get("productUrl") || url.searchParams.get("url");
    const onlineStoreUrlParam = url.searchParams.get("onlineStoreUrl");
    const { slug: derivedSlug, regionHint } =
      deriveFromProductUrl(productUrlParam);
    const onlineStoreUrl = derivedSlug || onlineStoreUrlParam;
    let region = (url.searchParams.get("region") || regionHint || undefined) as
      | string
      | undefined;
    const templateType = url.searchParams.get("templateType") || undefined;

    if (!onlineStoreUrl) {
      return new Response(
        "Missing product identifier (onlineStoreUrl or productUrl)",
        { status: 400 }
      );
    }

    // Optional region inference from Referer host when not provided
    if (!region) {
      const referer = req.headers.get("referer") || req.headers.get("referrer");
      if (referer) {
        try {
          const rh = new URL(referer).hostname.toLowerCase();
          if (rh.endsWith(".com.au") || rh.endsWith(".au")) region = "AU";
          else region = "US";
        } catch {}
      }
    }

    const product = await ctx.runQuery(
      api.products.getProductByOnlineStoreUrlPublic,
      {
        onlineStoreUrl,
      }
    );
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    const result = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
      productId: product._id,
      region,
      templateType,
    });

    if (!result.success) {
      return new Response(result.message, { status: 404 });
    }

    return new Response(result.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        // Allow embedding (tighten to allowlist domains if needed)
        "Content-Security-Policy": "frame-ancestors *;",
        // Encourage indexing of the embed URL itself
        "X-Robots-Tag": "index, follow",
      },
    });
  }),
});

http.route({
  path: "/embed.json",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const productUrlParam =
      url.searchParams.get("productUrl") || url.searchParams.get("url");
    const onlineStoreUrlParam = url.searchParams.get("onlineStoreUrl");
    const { slug: derivedSlug, regionHint } =
      deriveFromProductUrl(productUrlParam);
    const onlineStoreUrl = derivedSlug || onlineStoreUrlParam;
    const region = (url.searchParams.get("region") ||
      regionHint ||
      undefined) as string | undefined;
    const templateType = url.searchParams.get("templateType") || undefined;

    if (!onlineStoreUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing product identifier (onlineStoreUrl or productUrl)",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const product = await ctx.runQuery(
      api.products.getProductByOnlineStoreUrlPublic,
      {
        onlineStoreUrl,
      }
    );
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const result = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
      productId: product._id,
      region,
      templateType,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Optionally include basic metadata for SEO consumers
    const body = {
      html: result.html,
      title: product.title,
      variantCount: result.variantCount,
    };

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;
