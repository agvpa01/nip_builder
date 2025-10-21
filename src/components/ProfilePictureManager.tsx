import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

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

export function ProfilePictureManager() {
  const recentPictures = useQuery(api.profilePictures.listRecentProfilePictures, {
    limit: 25,
  });

  const baseUrl = useMemo(() => {
    if (configuredWidgetOrigin) {
      return normalizeOrigin(configuredWidgetOrigin);
    }

    if (typeof window === "undefined") {
      return "https://your-convex-deployment.convex.site";
    }

    return window.location.origin;
  }, []);

  const widgetSnippet = useMemo(
    () =>
      `<div data-profile-picture-widget data-customer-id=\"{{ customer.id }}\"></div>
<script async src=\"${baseUrl}/profile-picture-widget.js\" data-api-base=\"${baseUrl}\"></script>`,
    [baseUrl]
  );

  const fetchSnippet = useMemo(
    () =>
      `fetch('${baseUrl}/api/profile-picture?customerId={{ customer.id }}')
  .then((res) => res.json())
  .then((data) => {
    if (data.success && data.imageUrl) {
      // Use data.imageUrl in your Shopify template
    }
  });`,
    [baseUrl]
  );

  const handleCopy = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error("Failed to copy snippet", error);
      toast.error("Unable to copy. Please copy manually.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white shadow rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Profile Picture Embed</h3>
            <p className="text-gray-600 mt-1">
              Drop this widget on a Shopify customer account page. It renders an upload form bound
              to the Convex backend and stores the photo in Convex storage.
            </p>
          </div>
          <button
            onClick={() => handleCopy(widgetSnippet, "Widget snippet")}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Copy snippet
          </button>
        </div>
        <pre className="mt-4 bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto whitespace-pre">
          {widgetSnippet}
        </pre>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
          <li>
            Replace <code className="px-1 py-0.5 bg-gray-100 rounded">{"{{ customer.id }}"}</code>{" "}
            with the Shopify customer identifier you use in templates.
          </li>
          <li>
            The script automatically talks to <code>{baseUrl}</code>. Override with{" "}
            <code>data-api-base</code> if you serve from a different domain.
          </li>
          <li>
            Uploaded images are stored in Convex storage and linked to the supplied customer ID.
          </li>
        </ul>
      </section>

      <section className="bg-white shadow rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Fetch saved profile picture</h3>
            <p className="text-gray-600 mt-1">
              Retrieve the CDN URL for a customer's current profile picture anywhere in Shopify or
              a SPA.
            </p>
          </div>
          <button
            onClick={() => handleCopy(fetchSnippet, "Fetch snippet")}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Copy snippet
          </button>
        </div>
        <pre className="mt-4 bg-gray-900 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto whitespace-pre">
          {fetchSnippet}
        </pre>
        <p className="text-sm text-gray-600 mt-3">
          The API responds with <code>{"{ success: true, imageUrl: string }"}</code> when a photo is
          available. Cache headers are intentionally short so changes propagate quickly.
        </p>
      </section>

      <section className="bg-white shadow rounded-xl p-6 border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900">Recent profile pictures</h3>
        <p className="text-gray-600 mt-1">
          Latest 25 uploads across all customers. Use this list to verify data flowing from Shopify.
        </p>
        <div className="mt-4">
          {!recentPictures && (
            <div className="text-sm text-gray-500">Loading recent uploads...</div>
          )}
          {recentPictures && recentPictures.length === 0 && (
            <div className="text-sm text-gray-500">No profile pictures uploaded yet.</div>
          )}
          {recentPictures && recentPictures.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentPictures.map((picture) => (
                <div
                  key={picture.id}
                  className="flex items-center gap-4 border border-gray-200 rounded-lg p-4"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {picture.imageUrl ? (
                      <img
                        src={picture.imageUrl}
                        alt={`Profile for ${picture.customerId}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      Customer: {picture.customerId}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      Updated {new Date(picture.updatedAt).toLocaleString()}
                    </div>
                    {picture.imageUrl && (
                      <button
                        onClick={() => handleCopy(picture.imageUrl, "Image URL")}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        Copy image URL
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
