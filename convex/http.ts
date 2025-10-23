import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

const ACCORDION_SETTINGS_KEY = "productAccordionItems";

type AccordionItem = {
  id: string;
  title: string;
  content: string;
};

const DEFAULT_ACCORDION_ITEMS: AccordionItem[] = [
  {
    id: "description",
    title: "Description",
    content:
      "<p>VPA Whey Isolate is Australia's leading Whey Protein Isolate; ultra-pure, fast-absorbing, low-carb, and high-protein. Ideal for lean muscle growth and recovery. No fillers. No hype. Just results.</p>",
  },
  {
    id: "nutrition",
    title: "Nutritional Facts &amp; Ingredients",
    content:
      '<div data-convex-base="https://useful-llama-278.convex.site"></div><script defer src="https://useful-llama-278.convex.site/embed.js?v=1234123432"></script>',
  },
  {
    id: "flavour",
    title: "Flavour Guarantee",
    content:
      "<p>At VPAr, we don't rush flavours. Every one is crafted in-house by our food technician with 15+ years' experience, then refined through months of blind taste testing with real customers.</p><p>The result? Flavours made for our community, by our community.</p><p>But if it's not your thing? No worries. We'll replace it with another flavour of your choice - <b>on the house</b>.</p><p><b>Satisfaction Guarantee:</b> <br />Not 100% happy? Return it with at least 90% remaining and we'll organise an exchange.</p>",
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

const accordionCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const accordionWidgetScript = [
  "(()=>{",
  "  const STYLE_ID='convex-accordion-widget-styles';",
  `  const CSS=${JSON.stringify(ACCORDION_STYLE.trim())};`,
  "  function injectStyles(){",
  "    if (typeof document==='undefined') return;",
  "    if (document.getElementById(STYLE_ID)) return;",
  "    const style=document.createElement('style');",
  "    style.id=STYLE_ID;",
  "    style.textContent=CSS;",
  "    document.head.appendChild(style);",
  "  }",
  "  function determineBase(scriptEl){",
  "    const defaultOrigin=(typeof window!=='undefined' && window.location)?window.location.origin:'';",
  "    if (!scriptEl) return defaultOrigin;",
  "    const attr=scriptEl.getAttribute('data-api-base');",
  "    if (attr) return attr;",
  "    if (scriptEl.src){",
  "      try {",
  "        const url=new URL(scriptEl.src, defaultOrigin || undefined);",
  "        return url.origin || defaultOrigin;",
  "      } catch {",
  "        return defaultOrigin;",
  "      }",
  "    }",
  "    return defaultOrigin;",
  "  }",
  "  function currentScript(){",
  "    if (typeof document==='undefined') return null;",
  "    if (document.currentScript) return document.currentScript;",
  "    const scripts=document.getElementsByTagName('script');",
  "    return scripts[scripts.length-1] || null;",
  "  }",
  "  function sanitizeItems(raw){",
  "    if (!Array.isArray(raw)) return [];",
  "    return raw.map((entry, index)=>{",
  "      const title=typeof entry?.title==='string' && entry.title.trim().length?entry.title.trim():`Accordion Item ${index+1}`;",
  "      const content=typeof entry?.content==='string'?entry.content:'';",
  "      return { title, content };",
  "    }).filter(item=>item.title.trim().length>0 || item.content.trim().length>0);",
  "  }",
  "  function attachBehaviors(root){",
  "    const items=Array.from(root.querySelectorAll('.rpg-accordion__item'));",
  "    items.forEach((item)=>{",
  "      const header=item.querySelector('.rpg-accordion__header');",
  "      const content=item.querySelector('.rpg-accordion__content');",
  "      if (!header || !content) return;",
  "      if (item.classList.contains('is-active')){",
  "        content.style.maxHeight=content.scrollHeight+'px';",
  "      }",
  "      header.addEventListener('click', ()=>{",
  "        const isActive=item.classList.contains('is-active');",
  "        items.forEach((other)=>{",
  "          if (other===item) return;",
  "          other.classList.remove('is-active');",
  "          const otherContent=other.querySelector('.rpg-accordion__content');",
  "          if (otherContent) otherContent.style.maxHeight=null;",
  "        });",
  "        if (isActive){",
  "          item.classList.remove('is-active');",
  "          content.style.maxHeight=null;",
  "        } else {",
  "          item.classList.add('is-active');",
  "          content.style.maxHeight=content.scrollHeight+'px';",
  "        }",
  "      });",
  "    });",
  "  }",
  "  function executeScripts(root){",
  "    if (!root) return;",
  "    const scripts=root.querySelectorAll('script');",
  "    scripts.forEach((oldScript)=>{",
  "      const parent=oldScript.parentNode;",
  "      if (!parent) return;",
  "      const newScript=document.createElement('script');",
  "      for (let i=0;i<oldScript.attributes.length;i++){",
  "        const attr=oldScript.attributes[i];",
  "        newScript.setAttribute(attr.name, attr.value);",
  "      }",
  "      if (oldScript.async) newScript.async=true;",
  "      if (oldScript.defer) newScript.defer=true;",
  "      newScript.type=oldScript.type || 'text/javascript';",
  "      const src=oldScript.getAttribute('src');",
  "      if (src) newScript.src=src;",
  "      if (!oldScript.src && oldScript.textContent){",
  "        newScript.textContent=oldScript.textContent;",
  "      }",
  "      parent.replaceChild(newScript, oldScript);",
  "    });",
  "  }",
  "  function renderAccordion(container, items){",
  "    container.innerHTML='';",
  "    const wrapper=document.createElement('div');",
  "    wrapper.className='rpg-accordion-root';",
  "    const accordion=document.createElement('div');",
  "    accordion.className='rpg-accordion';",
  "    wrapper.appendChild(accordion);",
  "    items.forEach((item, index)=>{",
  "      const itemEl=document.createElement('div');",
  "      itemEl.className='rpg-accordion__item';",
  "      if (index===0) itemEl.classList.add('is-active');",
  "      const header=document.createElement('button');",
  "      header.className='rpg-accordion__header';",
  "      header.type='button';",
  "      const titleSpan=document.createElement('span');",
  "      titleSpan.textContent=item.title || `Accordion Item ${index+1}`;",
  "      const iconSpan=document.createElement('span');",
  "      iconSpan.className='rpg-accordion__icon';",
  "      iconSpan.textContent='+';",
  "      header.appendChild(titleSpan);",
  "      header.appendChild(iconSpan);",
  "      const contentWrap=document.createElement('div');",
  "      contentWrap.className='rpg-accordion__content';",
  "      const contentInner=document.createElement('div');",
  "      contentInner.className='rpg-accordion__content-inner';",
  "      contentInner.innerHTML=item.content || '';",
  "      contentWrap.appendChild(contentInner);",
  "      itemEl.appendChild(header);",
  "      itemEl.appendChild(contentWrap);",
  "      accordion.appendChild(itemEl);",
  "    });",
  "    container.appendChild(wrapper);",
  "    requestAnimationFrame(()=>{",
  "      attachBehaviors(wrapper);",
  "      executeScripts(wrapper);",
  "    });",
  "  }",
  "  function showStatus(container, message){",
  "    if (!message || !message.trim()){",
  "      container.innerHTML='';",
  "      return;",
  "    }",
  "    container.innerHTML=`<div style=\"font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#4b5563;text-align:center;padding:12px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;\">${message}</div>`;",
  "  }",
  "  function resolveBase(container, fallback){",
  "    const attr=container.getAttribute('data-api-base') || container.getAttribute('data-accordion-api-base');",
  "    if (attr) return attr;",
  "    return fallback;",
  "  }",
  "  function normalizeBase(base){",
  "    const fallback=(base && base.length ? base : ((typeof window!=='undefined' && window.location)?window.location.origin:''));",
  "    if (!fallback) return '';",
  "    return fallback.replace(/\\/$/, '');",
  "  }",
  "  function fetchAccordion(container, base, scriptEl){",
  "    const rawKey=(container.getAttribute('data-accordion-key') || (scriptEl ? scriptEl.getAttribute('data-accordion-key') : '') || '');",
  "    const key=rawKey && rawKey.trim ? rawKey.trim() : rawKey;",
  "    const rawProductUrl=(container.getAttribute('data-product-url') || (scriptEl ? scriptEl.getAttribute('data-product-url') : '') || ((typeof window!=='undefined' && window.location) ? window.location.href : ''));",
  "    const rawSlug=(container.getAttribute('data-product-slug') || (scriptEl ? scriptEl.getAttribute('data-product-slug') : '') || '');",
  "    const apiBase=normalizeBase(base);",
  "    if (!apiBase){",
  "      showStatus(container, '');",
  "      return;",
  "    }",
  "    const params=new URLSearchParams();",
  "    if (key) params.set('key', key);",
  "    if (rawProductUrl) params.set('productUrl', rawProductUrl);",
  "    if (rawSlug) params.set('slug', rawSlug);",
  "    const query=params.toString();",
  "    const url=apiBase + '/api/accordion' + (query ? ('?' + query) : '');",
  "    showStatus(container, '');",
  "    fetch(url, { credentials:'omit' })",
  "      .then((res)=>{",
  "        if (!res.ok) throw new Error('HTTP ' + res.status);",
  "        return res.json();",
  "      })",
  "      .then((data)=>{",
  "        if (!data || !Array.isArray(data.items)) throw new Error('Invalid response');",
  "        const items=sanitizeItems(data.items);",
  "        if (!items.length){",
  "          container.innerHTML='';",
  "          return;",
  "        }",
  "        renderAccordion(container, items);",
  "      })",
  "      .catch((err)=>{",
  "        console.error('[Convex accordion widget]', err);",
  "        showStatus(container, '');",
  "      });",
  "  }",
  "  function init(){",
  "    injectStyles();",
  "    const scriptEl=currentScript();",
  "    const scriptBase=determineBase(scriptEl);",
  "    const containers=document.querySelectorAll('[data-accordion-widget]');",
  "    containers.forEach((container)=>{",
  "      const base=resolveBase(container, scriptBase);",
      "      fetchAccordion(container, base, scriptEl);",
  "    });",
  "  }",
  "  if (document.readyState==='loading'){",
  "    document.addEventListener('DOMContentLoaded', init);",
  "  } else {",
  "    init();",
  "  }",
  "})();",
].join("\n");

function defaultAccordionItems(): AccordionItem[] {
  return DEFAULT_ACCORDION_ITEMS.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
  }));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeAccordionItems(value: unknown): AccordionItem[] {
  if (!Array.isArray(value)) {
    return defaultAccordionItems();
  }

  const normalized = value
    .map((entry, index) => {
      const title =
        typeof entry?.title === "string" && entry.title.trim().length
          ? entry.title.trim()
          : `Accordion Item ${index + 1}`;
      const content =
        typeof entry?.content === "string" ? entry.content : "";
      const id =
        typeof entry?.id === "string" && entry.id.trim().length
          ? entry.id.trim()
          : `accordion-item-${index + 1}`;
      return { id, title, content };
    })
    .filter(
      (entry) =>
        entry.title.trim().length > 0 || entry.content.trim().length > 0
    );

  if (!normalized.length) {
    return defaultAccordionItems();
  }

  return normalized.map((entry) => ({
    id: entry.id,
    title: entry.title,
    content: entry.content,
  }));
}

function generateAccordionHtml(items: AccordionItem[]): string {
  const sanitized = items.length ? items : defaultAccordionItems();
  const itemsMarkup = sanitized
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
}

function accordionJsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      ...accordionCorsHeaders,
    },
  });
}

function sanitizeAccordionKey(raw: string | null): string {
  if (typeof raw !== "string") {
    return ACCORDION_SETTINGS_KEY;
  }
  const trimmed = raw.trim();
  if (!trimmed.length) {
    return ACCORDION_SETTINGS_KEY;
  }
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(trimmed)) {
    return ACCORDION_SETTINGS_KEY;
  }
  if (!trimmed.startsWith(ACCORDION_SETTINGS_KEY)) {
    return ACCORDION_SETTINGS_KEY;
  }
  return trimmed;
}

const profilePictureCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const profilePictureWidgetScript = [
  "(()=> {",
  "  const STYLE_ID = 'convex-profile-picture-styles';",
  "  const CSS = [",
  "    '.profile-picture-widget{font-family:system-ui,-apple-system,\"Segoe UI\",sans-serif;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:320px;margin:0 auto;}',",
  "    '.profile-picture-preview-wrapper{position:relative;display:inline-block;}',",
  "    '.profile-picture-preview{position:relative;width:133px;height:133px;border-radius:999px;border:2px solid #d1d5db;background:transparent;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;transition:border-color .2s;}',",
  "    '.profile-picture-preview:focus-visible{outline:2px solid #3B7538;outline-offset:4px;}',",
  "    '.profile-picture-preview::after{content:\"\";position:absolute;inset:0;border-radius:999px;background:rgba(59,117,56,0);transition:background .2s;pointer-events:none;}',",
  "    '.profile-picture-preview:hover::after{background:rgba(59,117,56,0.08);}',",
  "    '.profile-picture-placeholder{color:#9ca3af;font-size:13px;text-align:center;padding:0 12px;}',",
  "    '.profile-picture-display{position:absolute;inset:0;display:none;}',",
  "    '.profile-picture-display img{width:100%;height:100%;object-fit:cover;}',",
  "    '.profile-picture-cropper{position:absolute;inset:0;display:none;touch-action:none;cursor:grab;}',",
  "    '.profile-picture-cropper.dragging{cursor:grabbing;}',",
  "    '.profile-picture-cropper img{position:absolute;top:50%;left:50%;transform-origin:center center;will-change:transform;user-select:none;pointer-events:none;}',",
  "    '.profile-picture-edit-button{position:absolute;bottom:-6px;right:-6px;width:40px;height:40px;border-radius:999px;border:1px solid #3B7538;background:#ffffff;display:flex;align-items:center;justify-content:center;color:#3B7538;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.14);transition:transform .2s,box-shadow .2s;}',",
  "    '.profile-picture-edit-button:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,0.18);}',",
  "    '.profile-picture-edit-button:active{transform:scale(0.97);}',",
  "    '.profile-picture-edit-button:focus-visible{outline:2px solid #3B7538;outline-offset:2px;}',",
  "    '.profile-picture-edit-button svg{width:18px;height:18px;}',",
  "    '.profile-picture-form{width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;}',",
  "    '.profile-picture-save{border:1px solid #3B7538;background:transparent;color:#3B7538;padding:10px 22px;border-radius:999px;font-weight:600;font-size:14px;cursor:pointer;transition:background .2s,color .2s,transform .2s;display:none;}',",
  "    '.profile-picture-save:hover{background:rgba(59,117,56,0.08);}',",
  "    '.profile-picture-save:active{transform:translateY(1px);}',",
  "    '.profile-picture-save:disabled{opacity:.6;cursor:not-allowed;transform:none;}',",
  "    '.profile-picture-status{font-size:13px;min-height:18px;color:#374151;text-align:center;}',",
  "    '.profile-picture-status.error{color:#b91c1c;}',",
  "    '.profile-picture-status.success{color:#047857;}'",
  "  ].join('');",
  "",
  "  function injectStyles(){",
  "    if (typeof document === 'undefined') return;",
  "    if (document.getElementById(STYLE_ID)) return;",
  "    const style=document.createElement('style');",
  "    style.id=STYLE_ID;",
  "    style.textContent=CSS;",
  "    document.head.appendChild(style);",
  "  }",
  "",
  "  function ensureEndpoint(container, base){",
  "    const dataset=container.dataset||{};",
  "    if (dataset.profileEndpoint) return dataset.profileEndpoint;",
  "    return base.replace(/\\/$/, '') + '/api/profile-picture';",
  "  }",
  "",
  "  function determineBase(scriptEl){",
  "    const defaultOrigin=(typeof window!=='undefined' && window.location)?window.location.origin:'';",
  "    if (!scriptEl) return defaultOrigin;",
  "    const attr=scriptEl.getAttribute('data-api-base');",
  "    if (attr) return attr;",
  "    if (scriptEl.src){",
  "      try {",
  "        const url=new URL(scriptEl.src, defaultOrigin || undefined);",
  "        return url.origin || defaultOrigin;",
  "      } catch {",
  "        return defaultOrigin;",
  "      }",
  "    }",
  "    return defaultOrigin;",
  "  }",
  "",
  "  function currentScript(){",
  "    if (typeof document==='undefined') return null;",
  "    if (document.currentScript) return document.currentScript;",
  "    const scripts=document.getElementsByTagName('script');",
  "    return scripts[scripts.length-1] || null;",
  "  }",
  "",
  "  function setStatus(el, message, type){",
  "    if (!el) return;",
  "    el.textContent=message||'';",
  "    el.className='profile-picture-status'+(type?(' '+type):'');",
  "  }",
  "",
  "  function render(container, endpoint, fetchEndpoint){",
  "    if (!container || container.getAttribute('data-profile-picture-ready')==='true') return;",
  "    container.setAttribute('data-profile-picture-ready','true');",
  "    injectStyles();",
  "    const dataset=container.dataset||{};",
  "    const requiredCustomerId=(dataset.customerId || dataset.profileCustomerId || '').trim();",
  "",
  "    container.innerHTML=[",
  "      '<div class=\"profile-picture-widget\">',",
  "        '<div class=\"profile-picture-preview-wrapper\">',",
  "          '<div class=\"profile-picture-preview\" data-role=\"preview\" role=\"button\" tabindex=\"0\" aria-label=\"Upload profile photo\">',",
  "            '<div class=\"profile-picture-placeholder\" data-role=\"placeholder\">No photo</div>',",
  "            '<div class=\"profile-picture-display\" data-role=\"display\">',",
  "              '<img data-role=\"display-image\" alt=\"Current profile photo\" />',",
  "            '</div>',",
  "            '<div class=\"profile-picture-cropper\" data-role=\"cropper\">',",
  "              '<img data-role=\"crop-image\" alt=\"Selected photo\" />',",
  "            '</div>',",
  "          '</div>',",
  "          '<button type=\"button\" class=\"profile-picture-edit-button\" data-role=\"edit\" aria-label=\"Change photo\">',",
  "            '<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\" focusable=\"false\">',",
  "              '<path fill=\"currentColor\" d=\"M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zm9.7-8.2 1.5-1.5a1 1 0 0 1 1.4 1.4l-1.5 1.5-1.4-1.4z\"/>',",
  "            '</svg>',",
  "          '</button>',",
  "        '</div>',",
  "        '<form class=\"profile-picture-form\" novalidate>',",
  "          '<input type=\"hidden\" name=\"customerId\" value=\"'+requiredCustomerId.replace(/\"/g,'&quot;')+'\" />',",
  "          '<input type=\"file\" name=\"photo\" accept=\"image/*\" style=\"display:none;\" />',",
  "          '<button type=\"button\" class=\"profile-picture-save\" data-role=\"save\">Save photo</button>',",
  "          '<div class=\"profile-picture-status\" data-role=\"status\"></div>',",
  "        '</form>',",
  "      '</div>'",
  "    ].join('');",
  "",
  "    const form=container.querySelector('.profile-picture-form');",
  "    const fileInput=form?.querySelector('input[type=\"file\"]');",
  "    const customerInput=form?.querySelector('input[name=\"customerId\"]');",
  "    const preview=container.querySelector('[data-role=\"preview\"]');",
  "    const placeholder=container.querySelector('[data-role=\"placeholder\"]');",
  "    const displayWrapper=container.querySelector('[data-role=\"display\"]');",
  "    const displayImage=container.querySelector('[data-role=\"display-image\"]');",
  "    const cropper=container.querySelector('[data-role=\"cropper\"]');",
  "    const cropImage=container.querySelector('[data-role=\"crop-image\"]');",
  "    const statusEl=container.querySelector('[data-role=\"status\"]');",
  "    const saveButton=container.querySelector('[data-role=\"save\"]');",
  "    const editButton=container.querySelector('[data-role=\"edit\"]');",
  "",
  "    if (form) form.addEventListener('submit',(event)=>event.preventDefault());",
  "    if (customerInput) customerInput.value=requiredCustomerId;",
  "",
  "    function triggerFileSelection(){",
  "      if (!fileInput) return;",
  "      suppressNextFileOpen=false;",
  "      fileInput.click();",
  "    }",
  "",
  "    if (preview instanceof HTMLElement){",
  "      preview.addEventListener('click', (event)=>{",
  "        if (!fileInput) return;",
  "        if (suppressNextFileOpen){",
  "          suppressNextFileOpen=false;",
  "          return;",
  "        }",
  "        triggerFileSelection();",
  "      });",
  "      preview.addEventListener('keydown', (event)=>{",
  "        if (event.key==='Enter' || event.key===' '){",
  "          event.preventDefault();",
  "          triggerFileSelection();",
  "        }",
  "      });",
  "    }",
  "    editButton?.addEventListener('click', (event)=>{",
  "      event.preventDefault();",
  "      suppressNextFileOpen=false;",
  "      triggerFileSelection();",
  "    });",
  "",
  "    const cropState={",
  "      image:null,",
  "      scale:1,",
  "      minScale:1,",
  "      maxScale:3,",
  "      offsetX:0,",
  "      offsetY:0,",
  "      viewportSize:preview?(preview.getBoundingClientRect().width||133):133,",
  "    };",
  "",
  "    let dragPointer=null;",
  "    let dragStart={x:0,y:0};",
  "    let suppressNextFileOpen=false;",
  "",
  "    function toggleSaveButton(show){",
  "      if (!saveButton) return;",
  "      saveButton.style.display=show?'inline-flex':'none';",
  "      if (!show){",
  "        saveButton.disabled=false;",
  "        saveButton.textContent='Save photo';",
  "      }",
  "    }",
  "",
  "    function showPlaceholder(){",
  "      if (placeholder) placeholder.style.display='flex';",
  "      if (displayWrapper) displayWrapper.style.display='none';",
  "      if (cropper) cropper.style.display='none';",
  "      toggleSaveButton(false);",
  "    }",
  "",
  "    function showDisplayImage(url){",
  "      if (!displayWrapper || !displayImage) return;",
  "      if (!url){",
  "        displayWrapper.style.display='none';",
  "        displayImage.removeAttribute('src');",
  "        if (placeholder) placeholder.style.display='flex';",
  "        return;",
  "      }",
  "      if (placeholder) placeholder.style.display='none';",
  "      if (cropper) cropper.style.display='none';",
  "      displayImage.src=url;",
  "      displayWrapper.style.display='block';",
  "      toggleSaveButton(false);",
  "    }",
  "",
  "    function prepareCropper(){",
  "      if (placeholder) placeholder.style.display='none';",
  "      if (displayWrapper) displayWrapper.style.display='none';",
  "      if (cropper){",
  "        cropper.style.display='block';",
  "      }",
  "    }",
  "",
  "    function resetCropperState(showPlaceholderView=true){",
  "      cropState.image=null;",
  "      cropState.scale=1;",
  "      cropState.minScale=1;",
  "      cropState.maxScale=3;",
  "      cropState.offsetX=0;",
  "      cropState.offsetY=0;",
  "      suppressNextFileOpen=false;",
  "      cropState.viewportSize=preview?(preview.getBoundingClientRect().width||133):133;",
  "      dragPointer=null;",
  "      if (cropper){",
  "        cropper.classList.remove('dragging');",
  "        cropper.style.display='none';",
  "      }",
  "      if (cropImage){",
  "        cropImage.removeAttribute('src');",
  "        cropImage.style.transform='';",
  "      }",
  "      if (showPlaceholderView){",
  "        if (displayWrapper) displayWrapper.style.display='none';",
  "        if (placeholder) placeholder.style.display='flex';",
  "      }",
  "      toggleSaveButton(false);",
  "    }",
  "",
  "    function clampOffsets(){",
  "      if (!cropState.image || !cropper) return;",
  "      const viewport=cropState.viewportSize||cropper.getBoundingClientRect().width||133;",
  "      cropState.viewportSize=viewport;",
  "      const imgW=cropState.image.naturalWidth*cropState.scale;",
  "      const imgH=cropState.image.naturalHeight*cropState.scale;",
  "      const maxX=Math.max(0,(imgW-viewport)/2);",
  "      const maxY=Math.max(0,(imgH-viewport)/2);",
  "      cropState.offsetX=Math.min(maxX, Math.max(-maxX, cropState.offsetX));",
  "      cropState.offsetY=Math.min(maxY, Math.max(-maxY, cropState.offsetY));",
  "    }",
  "",
  "    function applyCropTransform(){",
  "      if (!cropImage || !cropState.image) return;",
  "      clampOffsets();",
  "      cropImage.style.transform='translate(-50%, -50%) translate('+cropState.offsetX+'px,'+cropState.offsetY+'px) scale('+cropState.scale+')';",
  "    }",
  "",
  "    function drawToCanvas(canvas,size){",
  "      if (!cropState.image || !preview) return false;",
  "      const ctx=canvas.getContext('2d');",
  "      if (!ctx) return false;",
  "      const viewport=cropState.viewportSize||preview.getBoundingClientRect().width||size;",
  "      cropState.viewportSize=viewport;",
  "      ctx.clearRect(0,0,size,size);",
  "      ctx.fillStyle='#ffffff';",
  "      ctx.fillRect(0,0,size,size);",
  "      ctx.save();",
  "      ctx.beginPath();",
  "      ctx.arc(size/2,size/2,size/2,0,Math.PI*2);",
  "      ctx.closePath();",
  "      ctx.clip();",
  "      const scaleFactor=size/viewport;",
  "      ctx.translate(size/2 + cropState.offsetX*scaleFactor, size/2 + cropState.offsetY*scaleFactor);",
  "      ctx.scale(cropState.scale*scaleFactor, cropState.scale*scaleFactor);",
  "      ctx.translate(-cropState.image.naturalWidth/2, -cropState.image.naturalHeight/2);",
  "      ctx.drawImage(cropState.image,0,0);",
  "      ctx.restore();",
  "      return true;",
  "    }",
  "",
  "    function getCroppedDataUrl(size=133){",
  "      const canvas=document.createElement('canvas');",
  "      canvas.width=size;",
  "      canvas.height=size;",
  "      return drawToCanvas(canvas,size)?canvas.toDataURL('image/png'):null;",
  "    }",
  "",
  "    async function createCroppedBlob(){",
  "      const size=512;",
  "      const canvas=document.createElement('canvas');",
  "      canvas.width=size;",
  "      canvas.height=size;",
  "      if (!drawToCanvas(canvas,size)) return null;",
  "      return await new Promise((resolve)=>canvas.toBlob((blob)=>resolve(blob),'image/png',0.95));",
  "    }",
  "",
  "    async function performUpload(){",
  "      if (!fileInput || !saveButton) return;",
  "      const customerId=(customerInput?.value || '').trim();",
  "      if (!customerId){",
  "        setStatus(statusEl, 'Missing customer identifier.', 'error');",
  "        toggleSaveButton(false);",
  "        return;",
  "      }",
  "      if (!cropState.image && !(fileInput.files && fileInput.files[0])){",
  "        setStatus(statusEl, 'Please choose an image first.', 'error');",
  "        toggleSaveButton(false);",
  "        return;",
  "      }",
  "",
  "      setStatus(statusEl, '', '');",
  "      saveButton.disabled=true;",
  "      saveButton.textContent='Uploading...';",
  "",
  "      try {",
  "        const formData=new FormData();",
  "        formData.append('customerId', customerId);",
  "        let uploadFile=null;",
  "        let uploadName='profile-picture.png';",
  "        let previewDataUrl=null;",
  "",
  "        if (cropState.image){",
  "          previewDataUrl=getCroppedDataUrl(133);",
  "          const blob=await createCroppedBlob();",
  "          if (!blob){",
  "            setStatus(statusEl, 'Unable to process image. Try another file.', 'error');",
  "            return;",
  "          }",
  "          if (typeof File==='function'){",
  "            uploadFile=new File([blob], 'profile-picture.png', { type:'image/png' });",
  "          } else {",
  "            uploadFile=blob;",
  "          }",
  "        } else if (fileInput.files && fileInput.files[0]){",
  "          uploadFile=fileInput.files[0];",
  "          uploadName=uploadFile.name || uploadName;",
  "        }",
  "",
  "        if (!uploadFile){",
  "          setStatus(statusEl, 'Please choose an image first.', 'error');",
  "          saveButton.disabled=false;",
  "          saveButton.textContent='Save photo';",
  "          return;",
  "        }",
  "",
  "        formData.append('photo', uploadFile, uploadName);",
  "        const response=await fetch(endpoint, { method:'POST', body: formData, mode:'cors' });",
  "        const data=await response.json().catch(()=>null);",
  "        if (!response.ok || !data || data.success!==true){",
  "          const message=(data && data.error) || 'Upload failed. Please try again.';",
  "          setStatus(statusEl, message, 'error');",
  "          return;",
  "        }",
  "",
  "        setStatus(statusEl, 'Profile picture updated.', 'success');",
  "        resetCropperState(false);",
  "        if (fileInput) fileInput.value='';",
  "        const imageUrl=data.imageUrl;",
  "        if (imageUrl){",
  "          showDisplayImage(imageUrl);",
  "        } else if (previewDataUrl){",
  "          showDisplayImage(previewDataUrl);",
  "        } else {",
  "          showPlaceholder();",
  "        }",
  "        toggleSaveButton(false);",
  "      } catch (error){",
  "        console.error('Profile picture upload encountered an error:', error);",
  "        setStatus(statusEl, 'Network error. Please try again.', 'error');",
  "      } finally {",
  "        if (saveButton){",
  "          saveButton.disabled=false;",
  "          saveButton.textContent='Save photo';",
  "        }",
  "      }",
  "    }",
  "",
  "    async function loadExisting(){",
  "      resetCropperState();",
  "      if (!fetchEndpoint || !customerInput || !customerInput.value.trim()){",
  "        if (!requiredCustomerId){",
  "          setStatus(statusEl, 'Set data-customer-id on the container to enable uploads.', 'error');",
  "        }",
  "        return;",
  "      }",
  "      try {",
  "        const qs=new URLSearchParams({ customerId: customerInput.value.trim() });",
  "        const res=await fetch(fetchEndpoint+'?'+qs.toString(), { method:'GET', mode:'cors' });",
  "        if (!res.ok) return;",
  "        const data=await res.json().catch(()=>null);",
  "        if (data && data.imageUrl){",
  "          showDisplayImage(data.imageUrl);",
  "        }",
  "      } catch (error){",
  "        console.error('Failed to fetch existing profile picture:', error);",
  "      }",
  "    }",
  "",
  "    fileInput?.addEventListener('change', (event)=>{",
  "      if (!fileInput) return;",
  "      setStatus(statusEl, '', '');",
  "      resetCropperState();",
  "      const file=(event.target && event.target.files && event.target.files[0]) || null;",
  "      if (!file){",
  "        showPlaceholder();",
  "        return;",
  "      }",
  "      const reader=new FileReader();",
  "      reader.onload=function(e){",
  "        const result=(e.target && e.target.result);",
  "        if (typeof result!=='string'){",
  "          setStatus(statusEl, 'Unable to read that image. Try a different file.', 'error');",
  "          return;",
  "        }",
  "        const img=new Image();",
  "        img.onload=function(){",
  "          cropState.image=img;",
  "          cropState.viewportSize=preview?(preview.getBoundingClientRect().width||133):133;",
  "          const minScale=Math.max(",
  "            cropState.viewportSize/img.naturalWidth,",
  "            cropState.viewportSize/img.naturalHeight",
  "          );",
  "          cropState.scale=minScale;",
  "          cropState.minScale=minScale;",
  "          cropState.maxScale=minScale*3;",
  "          cropState.offsetX=0;",
  "          cropState.offsetY=0;",
  "          if (cropImage){",
  "            cropImage.src=result;",
  "            cropImage.style.width=img.naturalWidth+'px';",
  "            cropImage.style.height=img.naturalHeight+'px';",
  "          }",
  "          prepareCropper();",
  "          applyCropTransform();",
  "          toggleSaveButton(true);",
  "          setStatus(statusEl, 'Drag to reposition. Use scroll to zoom. Save when ready.', '');",
  "        };",
  "        img.onerror=function(){",
  "          resetCropperState();",
  "          setStatus(statusEl, 'Unable to read that image. Try a different file.', 'error');",
  "        };",
  "        img.src=result;",
  "      };",
  "      reader.readAsDataURL(file);",
  "    });",
  "",
  "    saveButton?.addEventListener('click', ()=>{",
  "      performUpload();",
  "    });",
  "",
  "    cropper?.addEventListener('pointerdown', (event)=>{",
  "      if (!cropState.image) return;",
  "      dragPointer=event.pointerId;",
  "      dragStart={ x: event.clientX, y: event.clientY };",
  "      cropper.setPointerCapture(event.pointerId);",
  "      cropper.classList.add('dragging');",
  "      event.preventDefault();",
  "    });",
  "",
  "    cropper?.addEventListener('pointermove', (event)=>{",
  "      if (!cropState.image || dragPointer===null || event.pointerId!==dragPointer) return;",
  "      const dx=event.clientX-dragStart.x;",
  "      const dy=event.clientY-dragStart.y;",
  "      dragStart={ x: event.clientX, y: event.clientY };",
  "      cropState.offsetX+=dx;",
  "      cropState.offsetY+=dy;",
  "      suppressNextFileOpen=true;",
  "      applyCropTransform();",
  "      event.preventDefault();",
  "    });",
  "",
  "    function endDrag(event){",
  "      if (dragPointer===null || event.pointerId!==dragPointer) return;",
  "      cropper?.classList.remove('dragging');",
  "      if (cropper && typeof cropper.hasPointerCapture==='function' && cropper.hasPointerCapture(event.pointerId)){",
  "        cropper.releasePointerCapture(event.pointerId);",
  "      }",
  "      dragPointer=null;",
  "    }",
  "",
  "    cropper?.addEventListener('pointerup', endDrag);",
  "    cropper?.addEventListener('pointercancel', endDrag);",
  "    cropper?.addEventListener('pointerleave', (event)=>{",
  "      if (dragPointer===null) return;",
  "      endDrag(event);",
  "    });",
  "",
  "    cropper?.addEventListener('wheel', (event)=>{",
  "      if (!cropState.image) return;",
  "      event.preventDefault();",
  "      const delta=Math.sign(event.deltaY);",
  "      const factor=delta>0?0.94:1.06;",
  "      let newScale=cropState.scale*factor;",
  "      newScale=Math.min(cropState.maxScale, Math.max(cropState.minScale, newScale));",
  "      const ratio=newScale/cropState.scale;",
  "      cropState.scale=newScale;",
  "      cropState.offsetX*=ratio;",
  "      cropState.offsetY*=ratio;",
  "      applyCropTransform();",
  "    }, { passive:false });",
  "",
  "    resetCropperState();",
  "    loadExisting();",
  "  }",
  "",
  "  function init(){",
  "    if (typeof document==='undefined') return;",
  "    const scriptEl=currentScript();",
  "    const base=determineBase(scriptEl);",
  "    const containers=document.querySelectorAll('[data-profile-picture-widget]');",
  "    if (!containers.length) return;",
  "    containers.forEach((container)=>{",
  "      const customEndpoint=ensureEndpoint(container, base);",
  "      const fetchEndpoint=(container.dataset && container.dataset.profileFetchEndpoint) || customEndpoint;",
  "      render(container, customEndpoint, fetchEndpoint);",
  "    });",
  "  }",
  "",
  "  if (typeof document!=='undefined'){",
  "    if (document.readyState==='loading'){",
  "      document.addEventListener('DOMContentLoaded', init, { once:true });",
  "    } else {",
  "      init();",
  "    }",
  "  }",
  "})();",
].join("\n");





const MAX_PROFILE_PICTURE_BYTES = 6 * 1024 * 1024;
const profilePictureAllowedTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function sanitizeProfileField(value: any, maxLength = 180): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function profileJsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...profilePictureCorsHeaders,
    },
  });
}

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
        // Copy all styles (head and body) so custom dropdown styling is available
        doc.querySelectorAll('style').forEach(st=>document.head.appendChild(st.cloneNode(true)));
        const hasTabElements = doc.querySelector('.tab-content') || doc.getElementById('variantSelect') || doc.querySelector('.dropdown-menu .tab-button') || doc.querySelector('.tab-buttons .tab-button');
        if(!hasTabElements){
          const fragment = doc.body ? doc.body.innerHTML : data.html;
          if(!fragment) return;
          const plainContainer=document.createElement('div');
          plainContainer.className='nip-plain-container';
          plainContainer.style.cssText='width:100%;margin:0;padding:0;box-sizing:border-box;';
          plainContainer.innerHTML = fragment;
          const scripts = Array.from(plainContainer.querySelectorAll('script'));
          scripts.forEach((script) => {
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }
          });
          mount.innerHTML='';
          mount.appendChild(plainContainer);
          scripts.forEach((script) => {
            const replacement=document.createElement('script');
            if (script.type) replacement.type = script.type;
            if (script.src) {
              replacement.src = script.src;
            } else {
              replacement.text = script.text || script.textContent || '';
            }
            plainContainer.appendChild(replacement);
          });
          return;
        }
        (function(){
          if(!document.getElementById('nip-embed-visibility')){
            var st=document.createElement('style'); st.id='nip-embed-visibility';
            st.textContent='.tab-container > .tab-content{display:none !important;} .tab-container > .tab-content.active{display:block !important;}';
            document.head.appendChild(st);
          }
        })();
        const contentsEls=[...doc.querySelectorAll('.tab-content')];
        const container=document.createElement('div');
        container.className='tab-container';
        container.style.cssText='width:100%;margin:0;padding:0;box-sizing:border-box;';
        const selectFromDoc = doc.getElementById('variantSelect');
        const dropdownBtnsFromDoc = [...doc.querySelectorAll('.dropdown-menu .tab-button')];

        if (dropdownBtnsFromDoc.length) {
          // Build dropdown menu UI using labels from the generated HTML
          const bar=document.createElement('div');
          bar.className='tab-buttons';
          const toggle=document.createElement('button');
          toggle.className='dropdown-toggle';
          const labelSpan=document.createElement('span');
          labelSpan.className='dropdown-label';
          labelSpan.textContent=(dropdownBtnsFromDoc[0].textContent||'Select Variant').trim();
          const caretSpan=document.createElement('span');
          caretSpan.className='caret';
          caretSpan.textContent='▾';
          toggle.appendChild(labelSpan); toggle.appendChild(caretSpan);
          toggle.addEventListener('click', function(){ bar.classList.toggle('open'); });

          const menu=document.createElement('div');
          menu.className='dropdown-menu';
          bar.appendChild(toggle);
          bar.appendChild(menu);
          container.appendChild(bar);

          // Panels
          contentsEls.forEach(function(el,i){
            const panel=document.createElement('div');
            panel.className = 'tab-content' + (i===0?' active':'');
            panel.dataset.index = String(i);
            panel.innerHTML = el.innerHTML;
            panel.id = el.id || ('variant-' + i);
            container.appendChild(panel);
          });

          const getPanels=function(){ return Array.from(container.children).filter(function(el){ return el.classList && el.classList.contains('tab-content'); }); };
          const showPanel=function(panel){ if(!panel) return; panel.classList.add('active'); panel.style.display='block'; };
          const hidePanels=function(panels){ panels.forEach(function(p){ p.classList.remove('active'); p.style.display='none'; }); };

          dropdownBtnsFromDoc.forEach(function(srcBtn, i){
            const b=document.createElement('button');
            b.className='tab-button' + (i===0?' active':'');
            b.textContent=(srcBtn.textContent||('Variant ' + (i+1)));
            b.dataset.index=String(i);
            b.addEventListener('click', function(){
              // activate
              menu.querySelectorAll('.tab-button.active').forEach(function(el){ el.classList.remove('active'); });
              b.classList.add('active');
              var panels=getPanels(); hidePanels(panels);
              var panel=panels[i]; if(panel) showPanel(panel);
              labelSpan.textContent=(b.textContent||'').trim();
              bar.classList.remove('open');
            });
            menu.appendChild(b);
          });

          // Initialize visibility
          (function(){ var panels=getPanels(); hidePanels(panels); if(panels[0]) showPanel(panels[0]); })();

          // Close when clicking outside
          document.addEventListener('click', function(e){ if(!bar.contains(e.target)){ bar.classList.remove('open'); }});
        } else if (selectFromDoc) {
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

          const getPanels = ()=> Array.from(container.children).filter(function(el){ return el.classList && el.classList.contains('tab-content'); });
          const applyVisibility = function(panels){
            panels.forEach(function(p){ p.style.display = 'none'; p.classList.remove('active'); });
          };
          const showPanel = function(panel){ if(!panel) return; panel.classList.add('active'); };
          const syncToSelect = ()=>{
            var panels = getPanels();
            panels.forEach(function(p){ p.classList.remove('active'); });
            const val = select.value;
            // Prefer matching by id (value is variant id), fallback to index
            var target = val ? container.querySelector('#' + CSS.escape(val)) : null;
            if (target) {
              showPanel(target);
              return;
            }
            var idx = Math.max(0, Math.min(select.selectedIndex, panels.length - 1));
            showPanel(panels[idx]);
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
            panel.innerHTML= el.innerHTML; panel.style.display = (i===0?'block':'none');\n            container.appendChild(panel);
          });
          container.addEventListener('click', (ev)=>{
            const t = ev.target && ev.target.closest ? ev.target.closest('.tab-button') : null;
            const btn = t;
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
    const readMountData = (el, key) => {
      if (!el) return "";
      const datasetKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const dsVal = el.dataset ? el.dataset[datasetKey] : undefined;
      if (dsVal && dsVal.trim() !== "") return dsVal;
      const attrName = key.startsWith("data-") ? key : 'data-' + key;
      if (typeof (el.getAttribute) === "function") {
        const attrVal = el.getAttribute(attrName);
        if (attrVal && attrVal.trim() !== "") return attrVal;
      }
      return "";
    };

    scriptEmbeds.forEach(s=>{
      const base = s.dataset.convexBase || new URL(s.src, location.href).origin;
      const scriptSlugAttr = s.getAttribute('data-nip-slug') || '';
      const scriptRegionAttr = s.getAttribute('data-nip-region') || '';
      const scriptTemplateAttr = s.getAttribute('data-nip-template') || '';
      let region = scriptRegionAttr.trim();
      let slug = scriptSlugAttr.trim();
      let template = scriptTemplateAttr.trim();
      const prodUrl = s.dataset.productUrl || s.getAttribute('data-product-url') || ((typeof window!=='undefined' && window.location) ? window.location.href : '');
      if(!slug && prodUrl){ const d=parseInputUrl(prodUrl); slug=d.slug; if(!region) region=d.region||''; }
      let mount = null; const sel = s.dataset.mount || s.getAttribute('data-mount');
      mount = sel ? document.querySelector(sel) : null;
      if(!mount){
        const prev = s.previousElementSibling;
        if(prev && prev.dataset && prev.dataset.convexBase){
          mount = prev;
        }
      }
      if(!mount){
        mount=document.createElement('div');
        s.parentNode.insertBefore(mount, s);
      }
      if (mount) {
        if (!slug) {
          const mountProduct = readMountData(mount, "product-url") || readMountData(mount, "online-store-url") || readMountData(mount, "nip-slug");
          if (mountProduct) {
            const derived = parseInputUrl(mountProduct);
            slug = derived.slug || mountProduct;
            if (!region && derived.region) region = derived.region;
          }
        } else if (!scriptSlugAttr) {
          const mountProduct = readMountData(mount, "product-url") || readMountData(mount, "online-store-url") || readMountData(mount, "nip-slug");
          if (mountProduct) {
            const derived = parseInputUrl(mountProduct);
            slug = derived.slug || mountProduct;
            if (!region && derived.region) region = derived.region;
          }
        }
        if (!region) {
          const mountRegion = readMountData(mount, "nip-region") || readMountData(mount, "region");
          if (mountRegion) region = mountRegion;
        } else if (!scriptRegionAttr) {
          const mountRegion = readMountData(mount, "nip-region") || readMountData(mount, "region");
          if (mountRegion) region = mountRegion;
        }
        if (!template) {
          const mountTemplate = readMountData(mount, "nip-template");
          if (mountTemplate) template = mountTemplate;
        } else if (!scriptTemplateAttr) {
          const mountTemplate = readMountData(mount, "nip-template");
          if (mountTemplate) template = mountTemplate;
        }
      }
      if(!slug) return;
      if(mount && mount.dataset){
        mount.dataset.nipMounted='1';
        if(!mount.dataset.convexBase && base) mount.setAttribute('data-convex-base', base);
      }
      mountNip(mount, base, slug, region, template);
    });
    [...document.querySelectorAll('[data-convex-base]')].forEach(el=>{
      if(!el) return;
      const ds = el.dataset || {};
      if(ds.nipMounted === '1') return;
      const base = ds.convexBase;
      let region = ds.nipRegion || '';
      let slug = ds.nipSlug || '';
      const prodUrl = ds.productUrl || ((typeof window!=='undefined' && window.location) ? window.location.href : '');
      if(!slug && prodUrl){ const d=parseInputUrl(prodUrl); slug=d.slug; if(!region) region=d.region||''; }
      if(!slug) return;
      ds.nipMounted = '1';
      mountNip(el, base, slug, region, ds.nipTemplate || '');
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

// Public API route to expose NIP content for a product
http.route({
  path: "/api/nips",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const productUrlParam =
      url.searchParams.get("productUrl") || url.searchParams.get("url");
    const onlineStoreUrlParam = url.searchParams.get("onlineStoreUrl");
    const { slug: derivedSlug } = deriveFromProductUrl(productUrlParam);
    const onlineStoreUrl = onlineStoreUrlParam || derivedSlug;

    if (!onlineStoreUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing onlineStoreUrl",
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

    const nips = await ctx.runQuery(api.nips.getNipsByProduct, {
      productId: product._id,
    });

    const responseBody = {
      product: {
        _id: product._id,
        title: product.title,
        onlineStoreUrl: product.onlineStoreUrl,
      },
      nips: nips.map((nip) => ({
        _id: nip._id,
        templateType: nip.templateType,
        region: nip.region ?? null,
        variantId: nip.variantId ?? null,
        variantName: nip.variantName ?? null,
        content: nip.content,
        htmlContent: nip.htmlContent,
        createdAt: nip.createdAt,
        updatedAt: nip.updatedAt,
      })),
    };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/accordion-widget.js",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(accordionWidgetScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/api/accordion",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: accordionCorsHeaders,
    });
  }),
});

http.route({
  path: "/api/accordion",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const keyParam = sanitizeAccordionKey(url.searchParams.get("key"));
    const productUrlParam =
      url.searchParams.get("productUrl") || url.searchParams.get("url");
    const slugParam =
      url.searchParams.get("slug") || url.searchParams.get("productSlug");

    const { slug: derivedSlug } = deriveFromProductUrl(productUrlParam);
    const candidateSlug = slugParam || derivedSlug || null;

    let items: AccordionItem[] | null = null;
    let resolvedSlug: string | null = null;
    let source: "product" | "default" | "none" = "default";

    try {
      if (candidateSlug) {
        const productResult = await ctx.runQuery(
          api.accordions.getProductAccordionPublic,
          { slug: candidateSlug }
        );

        if (
          productResult?.items &&
          Array.isArray(productResult.items) &&
          productResult.items.length
        ) {
          items = normalizeAccordionItems(productResult.items);
          resolvedSlug = productResult.slug ?? candidateSlug;
          source = "product";
        } else {
          resolvedSlug = productResult?.slug ?? candidateSlug;
          source = "none";
        }
      }
    } catch (error) {
      console.error("Accordion product lookup failed:", error);
    }

    try {
      const result = await ctx.runQuery(
        (api.settings as any).getAccordionSettingPublic,
        { key: keyParam }
      );

      const resolvedKey =
        typeof result?.key === "string" && result.key.length
          ? result.key
          : keyParam;

      let fallbackItems: AccordionItem[];
      let html: string;

      if (items) {
        fallbackItems = items;
        html = generateAccordionHtml(fallbackItems);
      } else if (candidateSlug) {
        fallbackItems = [];
        html = "";
      } else {
        fallbackItems = normalizeAccordionItems(result?.value);
        html = generateAccordionHtml(fallbackItems);
      }

      return accordionJsonResponse({
        success: true,
        key: resolvedKey,
        productSlug: resolvedSlug,
        source,
        items: fallbackItems,
        html,
        count: fallbackItems.length,
      });
    } catch (error) {
      console.error("Accordion API error:", error);
      return accordionJsonResponse(
        { success: false, error: "Failed to load accordion content." },
        500
      );
    }
  }),
});

http.route({
  path: "/profile-picture-widget.js",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(profilePictureWidgetScript, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/api/profile-picture",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: profilePictureCorsHeaders,
    });
  }),
});

http.route({
  path: "/api/profile-picture",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const customerIdParam = sanitizeProfileField(
      url.searchParams.get("customerId")
    );

    if (!customerIdParam) {
      return profileJsonResponse(
        { success: false, error: "Missing customerId query parameter." },
        400
      );
    }

    try {
      const record = await ctx.runQuery(
        api.profilePictures.getProfilePictureByCustomer,
        { customerId: customerIdParam }
      );

      if (!record || !record.imageUrl) {
        return profileJsonResponse(
          { success: false, error: "Profile picture not found." },
          404
        );
      }

      return profileJsonResponse(
        {
          success: true,
          imageUrl: record.imageUrl,
          updatedAt: record.updatedAt,
        },
        200
      );
    } catch (error) {
      console.error("Failed to fetch profile picture:", error);
      return profileJsonResponse(
        { success: false, error: "Failed to load profile picture." },
        500
      );
    }
  }),
});

http.route({
  path: "/api/profile-picture",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const formData = await req.formData();
      const customerIdRaw = formData.get("customerId");
      const photo = formData.get("photo");

      const customerId = sanitizeProfileField(customerIdRaw, 180);
      if (!customerId) {
        return profileJsonResponse(
          { success: false, error: "Customer ID is required." },
          400
        );
      }

      if (!(photo instanceof File)) {
        return profileJsonResponse(
          { success: false, error: "Upload must include a photo file." },
          400
        );
      }

      if (
        (photo.type &&
          !profilePictureAllowedTypes.includes(photo.type.toLowerCase())) ||
        (!photo.type && !/\.(jpe?g|png|gif|webp)$/i.test(photo.name || ""))
      ) {
        return profileJsonResponse(
          { success: false, error: "Unsupported image type." },
          400
        );
      }

      if (photo.size > MAX_PROFILE_PICTURE_BYTES) {
        return profileJsonResponse(
          { success: false, error: "Image exceeds maximum size of 6MB." },
          400
        );
      }

      const storageId = await ctx.storage.store(photo);
      const identity = await ctx.auth.getUserIdentity();
      const uploadedBy = identity?.subject ?? undefined;

      const { imageUrl } = await ctx.runMutation(
        api.profilePictures.saveProfilePicture,
        {
          customerId,
          storageId,
          fileName: photo.name || "profile-picture",
          contentType: photo.type || "application/octet-stream",
          size: photo.size,
          uploadedBy,
        }
      );

      return profileJsonResponse(
        { success: true, imageUrl: imageUrl ?? null },
        201
      );
    } catch (error) {
      console.error("Profile picture upload failed:", error);
      return profileJsonResponse(
        { success: false, error: "Unexpected error during upload." },
        500
      );
    }
  }),
});


export default http;


