import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { SignOutButton } from "./SignOutButton";
import { NipBuilder } from "./components/NipBuilder";
import { ProteinPowderTemplate } from "./components/ProteinPowderTemplate";
import { SupplementsTemplate } from "./components/SupplementsTemplate";
import { ComplexSupplementsTemplate } from "./components/ComplexSupplementsTemplate";
import { USNutritionFactsTemplate } from "./components/USNutritionFactsTemplate";
import { Id } from "../convex/_generated/dataModel";

// Component to show public NIP link
function PublicNipLink({ productId }: { productId: Id<"products"> }) {
  const nips = useQuery(api.nips.getNipsByProduct, { productId });

  // Get the most recently updated NIP with an htmlFileId (fallback to creation time)
  const firstNip = nips
    ?.filter((nip) => nip.htmlFileId)
    .sort((a, b) => {
      // Prioritize updatedAt if available, otherwise use _creationTime
      const aTime = a.updatedAt || a.createdAt;
      const bTime = b.updatedAt || b.createdAt;
      return bTime - aTime;
    })[0];

  const publicUrl = useQuery(
    api.nips.getNipPublicUrl,
    firstNip ? { productId, variantId: firstNip.variantId } : "skip"
  );

  if (!publicUrl || !firstNip) {
    return null;
  }

  return (
    <a
      href={publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
    >
      View Public NIP →
    </a>
  );
}

// New: Dropdown to view AU or US public NIP (latest per type)
function PublicNipDropdown({ productId }: { productId: Id<"products"> }) {
  const nips = useQuery(api.nips.getNipsByProduct, { productId });
  const auTypes = ["protein_powder", "complex_supplements", "supplements"];

  const auLatest = nips
    ?.filter((n: any) => auTypes.includes(n.templateType) && n.htmlFileId)
    .sort((a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
  const usLatest = nips
    ?.filter((n: any) => n.templateType === "us_nutrition_facts" && n.htmlFileId)
    .sort((a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];

  const auUrl = useQuery(
    api.nips.getNipPublicUrlById as any,
    auLatest ? { nipId: auLatest._id } : "skip"
  );
  const usUrl = useQuery(
    api.nips.getNipPublicUrlById as any,
    usLatest ? { nipId: usLatest._id } : "skip"
  );

  if (!nips || (!auLatest && !usLatest)) return null;

  return (
    <div className="relative inline-block text-left">
      <details className="group">
        <summary className="list-none cursor-pointer text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 bg-purple-50 rounded hover:bg-purple-100 transition-colors inline-flex items-center gap-1">
          View Public NIP
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.25 7.5L10 12.25 14.75 7.5z"/></svg>
        </summary>
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow-lg z-10 py-1">
          <button
            disabled={!auUrl}
            onClick={() => auUrl && window.open(auUrl, "_blank")}
            className={`w-full text-left px-3 py-1 text-xs ${auUrl ? "hover:bg-gray-50 text-gray-800" : "text-gray-400 cursor-not-allowed"}`}
          >
            AU Version {auUrl ? "" : "(none)"}
          </button>
          <button
            disabled={!usUrl}
            onClick={() => usUrl && window.open(usUrl, "_blank")}
            className={`w-full text-left px-3 py-1 text-xs ${usUrl ? "hover:bg-gray-50 text-gray-800" : "text-gray-400 cursor-not-allowed"}`}
          >
            US Version {usUrl ? "" : "(none)"}
          </button>
        </div>
      </details>
    </div>
  );
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.admin.getUsersWithAdminStatus);
  const products = useQuery(api.products.getAllProducts);
  const dashboardStats = useQuery(api.dashboard.getDashboardStats);
  const deleteUser = useMutation(api.admin.deleteUser);
  const syncProducts = useAction(api.products.syncProducts);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const deleteAllNipsForProduct = useMutation(api.nips.deleteAllNipsForProduct);
  const [isSyncing, setIsSyncing] = useState(false);

  // Products state
  const [productSearch, setProductSearch] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // NIPs state
  const [nipsSearch, setNipsSearch] = useState("");
  const [nipsTypeFilter, setNipsTypeFilter] = useState("");
  const [nipsStatusFilter, setNipsStatusFilter] = useState(""); // "has_nips", "no_nips", or ""
  const [nipsDisplayedCount, setNipsDisplayedCount] = useState(12);
  const [nipsLoading, setNipsLoading] = useState(false);
  const [hasMoreNips, setHasMoreNips] = useState(true);

  // NIP Builder state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [showNipBuilder, setShowNipBuilder] = useState(false);
  const [currentNip, setCurrentNip] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // NIP queries
  const allNips = useQuery(api.nips.getAllNips);
  const checkNipExists = useQuery(
    api.nips.checkNipExists,
    selectedProduct && selectedVariant
      ? { productId: selectedProduct._id, variantId: selectedVariant._id }
      : selectedProduct
        ? { productId: selectedProduct._id }
        : "skip"
  );

  // Combined NIP state
  const [showCombinedNip, setShowCombinedNip] = useState(false);
  const [combinedNipProduct, setCombinedNipProduct] = useState<any>(null);

  // Tabbed NIP state
  const [showTabbedNip, setShowTabbedNip] = useState(false);
  const [tabbedNipProduct, setTabbedNipProduct] = useState<any>(null);
  const combinedNipData = useQuery(
    api.nips.generateCombinedProductHtml,
    combinedNipProduct ? { productId: combinedNipProduct._id } : "skip"
  );

  const tabbedNipData = useQuery(
    api.nips.generateTabbedProductHtml,
    tabbedNipProduct ? { productId: tabbedNipProduct._id } : "skip"
  );

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteUser({ userId: userId as any });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
      console.error(error);
    }
  };

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    try {
      const result = await syncProducts();
      toast.success(
        `Sync completed! ${result.syncedCount} products added, ${result.skippedCount} skipped.`
      );
    } catch (error) {
      toast.error("Failed to sync products");
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteProduct({ productId: productId as any });
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  // NIP Selection Handler
  const handleProductSelection = useCallback(
    async (product: any, variant?: any) => {
      setSelectedProduct(product);
      // Auto-select first variant if no specific variant is provided and product has variants
      const selectedVar =
        variant ||
        (product.variants && product.variants.length > 0
          ? product.variants[0]
          : null);
      setSelectedVariant(selectedVar);
      // Reset states to ensure clean transition
      setCurrentNip(null);
      setSelectedTemplate(null);
      setShowTemplateSelection(false);
      setShowNipBuilder(false);
      setShowRegionPicker(true);
    },
    []
  );

  // Effect to handle NIP existence check after product selection
  useEffect(() => {
    // After selecting a product, first ask AU vs US regardless of existing NIPs
    if (selectedProduct) {
      setShowRegionPicker(true);
    }
  }, [selectedProduct]);

  const handleTemplateSelection = (templateType: string) => {
    setShowTemplateSelection(false);
    setShowNipBuilder(true);
    setActiveTab("nip-builder");
    setSelectedTemplate(templateType);

    // Initialize new NIP with selected template
    setCurrentNip({
      templateType,
      content: {
        sections: [],
        customFields: [],
      },
      htmlOutput: "",
    });
  };

  // Region picker helpers
  const auTemplateTypes = [
    "protein_powder",
    "complex_supplements",
    "supplements",
  ];
  const getVariantForRegion = () => selectedVariant || selectedProduct?.variants?.[0];
  const hasNipFor = (templateType: string) =>
    allNips?.some(
      (n: any) =>
        n.productId === selectedProduct?._id &&
        (!getVariantForRegion() || n.variantId === getVariantForRegion()._id) &&
        n.templateType === templateType
    ) || false;
  const hasAnyAu = allNips?.some(
    (n: any) =>
      n.productId === selectedProduct?._id &&
      (!getVariantForRegion() || n.variantId === getVariantForRegion()._id) &&
      auTemplateTypes.includes(n.templateType)
  );
  const hasUs = hasNipFor("us_nutrition_facts");

  const chooseRegion = (region: "AU" | "US") => {
    setShowRegionPicker(false);
    if (region === "AU") {
      // If an AU template already exists for this variant, load the most recent automatically
      const v = getVariantForRegion();
      const auExisting = (allNips || []).filter(
        (n: any) =>
          n.productId === selectedProduct?._id &&
          (!v || n.variantId === v._id) &&
          auTemplateTypes.includes(n.templateType)
      );
      if (auExisting.length > 0) {
        const latest = auExisting.sort(
          (a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
        )[0];
        setCurrentNip(latest);
        setSelectedTemplate(latest.templateType);
        setShowNipBuilder(true);
        setActiveTab("nip-builder");
      } else {
        // No AU template yet; go to AU template selection
        setShowTemplateSelection(true);
        setActiveTab("template-selection");
      }
    } else {
      // US Nutrition Facts builder
      const existing = allNips?.find(
        (n: any) =>
          n.productId === selectedProduct?._id &&
          (!getVariantForRegion() || n.variantId === getVariantForRegion()._id) &&
          n.templateType === "us_nutrition_facts"
      );
      setCurrentNip(existing || null);
      setSelectedTemplate("us_nutrition_facts");
      setShowNipBuilder(true);
      setActiveTab("nip-builder");
    }
  };

  const handleBackToNips = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setShowTemplateSelection(false);
    setShowNipBuilder(false);
    setCurrentNip(null);
    setSelectedTemplate(null);
    setActiveTab("nips");
  };

  // Handle combined NIP viewing
  const handleViewCombinedNip = (product: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the product selection
    setCombinedNipProduct(product);
    setShowCombinedNip(true);
  };

  const handleCloseCombinedNip = () => {
    setShowCombinedNip(false);
    setCombinedNipProduct(null);
  };

  // Handle tabbed NIP viewing
  const handleViewTabbedNip = (product: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the product selection
    setTabbedNipProduct(product);
    setShowTabbedNip(true);
  };

  const handleCloseTabbedNip = () => {
    setShowTabbedNip(false);
    setTabbedNipProduct(null);
  };

  // Handle delete all NIPs for product
  const handleDeleteAllNips = async (product: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the product selection

    const confirmed = window.confirm(
      `Are you sure you want to delete ALL NIPs for "${product.title}"?\n\n` +
        `⚠️ WARNING: This action cannot be undone!\n` +
        `• This will remove NIPs for ALL variants of this product\n` +
        `• All associated HTML files will be permanently deleted\n` +
        `• You will need to recreate NIPs from scratch\n\n` +
        `Type "DELETE" in the next prompt to confirm.`
    );

    if (!confirmed) return;

    const confirmText = window.prompt(
      `To confirm deletion of all NIPs for "${product.title}", type "DELETE" (case-sensitive):`
    );

    if (confirmText !== "DELETE") {
      toast.error("Deletion cancelled - confirmation text did not match");
      return;
    }

    try {
      const result = await deleteAllNipsForProduct({ productId: product._id });

      if (result.success) {
        toast.success(
          `Successfully deleted ${result.deletedCount} NIP(s) for "${product.title}"`
        );
      } else {
        toast.error("Failed to delete NIPs");
      }
    } catch (error) {
      console.error("Error deleting NIPs:", error);
      toast.error("An error occurred while deleting NIPs");
    }
  };

  // Filter and paginate products
  const filteredAndPaginatedProducts = useMemo(() => {
    if (!products)
      return { filteredProducts: [], totalPages: 0, totalItems: 0 };

    // Filter products
    let filtered = products.filter((product: any) => {
      const matchesSearch =
        productSearch === "" ||
        product.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.onlineStoreUrl
          .toLowerCase()
          .includes(productSearch.toLowerCase());

      const matchesType =
        productTypeFilter === "" || product.productType === productTypeFilter;

      return matchesSearch && matchesType;
    });

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filtered.slice(startIndex, endIndex);

    return {
      filteredProducts: paginatedProducts,
      totalPages,
      totalItems,
      allFilteredProducts: filtered,
    };
  }, [products, productSearch, productTypeFilter, currentPage, itemsPerPage]);

  // Filter products for NIPs with infinite scroll
  const filteredNipsProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products.filter((product: any) => {
      const matchesSearch =
        nipsSearch === "" ||
        product.title.toLowerCase().includes(nipsSearch.toLowerCase()) ||
        product.onlineStoreUrl.toLowerCase().includes(nipsSearch.toLowerCase());

      const matchesType =
        nipsTypeFilter === "" || product.productType === nipsTypeFilter;

      // Check NIP status filter
      let matchesNipStatus = true;
      if (nipsStatusFilter && allNips) {
        const hasNip = allNips.some(
          (nip: any) => nip.productId === product._id
        );
        if (nipsStatusFilter === "has_nips") {
          matchesNipStatus = hasNip;
        } else if (nipsStatusFilter === "no_nips") {
          matchesNipStatus = !hasNip;
        }
      }

      return matchesSearch && matchesType && matchesNipStatus;
    });

    const displayed = filtered.slice(0, nipsDisplayedCount);
    setHasMoreNips(displayed.length < filtered.length);
    return displayed;
  }, [
    products,
    nipsSearch,
    nipsTypeFilter,
    nipsStatusFilter,
    nipsDisplayedCount,
    allNips,
  ]);

  // Get unique product types for filter dropdown
  const productTypes = useMemo(() => {
    if (!products) return [];
    const types = [
      ...new Set(products.map((product: any) => product.productType)),
    ];
    return types.sort();
  }, [products]);

  // Reset pagination when filters change
  const handleSearchChange = (value: string) => {
    setProductSearch(value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setProductTypeFilter(value);
    setCurrentPage(1);
  };

  // NIPs filter handlers
  const handleNipsSearchChange = (search: string) => {
    setNipsSearch(search);
    setNipsDisplayedCount(12); // Reset to initial count when search changes
  };

  const handleNipsTypeFilterChange = (type: string) => {
    setNipsTypeFilter(type);
    setNipsDisplayedCount(12); // Reset to initial count when filter changes
  };

  const handleNipsStatusFilterChange = (status: string) => {
    setNipsStatusFilter(status);
    setNipsDisplayedCount(12); // Reset to initial count when filter changes
  };

  // Load more products for infinite scroll
  const loadMoreNipsProducts = useCallback(() => {
    if (nipsLoading || !hasMoreNips) return;

    setNipsLoading(true);
    setTimeout(() => {
      setNipsDisplayedCount((prev) => prev + 12);
      setNipsLoading(false);
    }, 500); // Simulate loading delay
  }, [nipsLoading, hasMoreNips]);

  // Scroll detection for infinite scroll
  useEffect(() => {
    if (activeTab !== "nips") return;

    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user scrolls to 80% of the page
      if (scrollTop + windowHeight >= documentHeight * 0.8) {
        loadMoreNipsProducts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, loadMoreNipsProducts]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {loggedInUser?.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="fixed left-0 top-16 w-64 bg-white shadow-sm h-[calc(100vh-4rem)] border-r z-10">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "dashboard"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Dashboard
                  </div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("nips")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "nips"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    NIPs
                  </div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("products")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "products"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    Products
                  </div>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "users"
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                    Users
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          {activeTab === "users" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  User Management
                </h2>
                <p className="text-gray-600">Manage all users in the system</p>
              </div>

              {users === undefined ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {user.name?.charAt(0) ||
                                    user.email?.charAt(0) ||
                                    "U"}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || "No name"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.email || "No email"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.isAdmin
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {user.isAdmin ? "Admin" : "User"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user._creationTime).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user._id !== loggedInUser?._id && (
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                            {user._id === loggedInUser?._id && (
                              <span className="text-gray-400">You</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No users found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Product Management
                  </h2>
                  <p className="text-gray-600">
                    Sync and manage products from external API
                  </p>
                </div>
                <button
                  onClick={handleSyncProducts}
                  disabled={isSyncing}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Sync Products
                    </>
                  )}
                </button>
              </div>

              {/* Filter and Search Controls */}
              <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Products
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by title or URL..."
                        value={productSearch}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <select
                      value={productTypeFilter}
                      onChange={(e) => handleTypeFilterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      {productTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Items per page
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                  <div>
                    Showing{" "}
                    {filteredAndPaginatedProducts.filteredProducts.length} of{" "}
                    {filteredAndPaginatedProducts.totalItems} products
                    {(productSearch || productTypeFilter) && (
                      <span className="ml-2">
                        (filtered from {products?.length || 0} total)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {productSearch && (
                      <button
                        onClick={() => handleSearchChange("")}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                      >
                        Clear search
                      </button>
                    )}
                    {productTypeFilter && (
                      <button
                        onClick={() => handleTypeFilterChange("")}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {products === undefined ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Synced
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndPaginatedProducts.filteredProducts.map(
                        (product: any) => (
                          <tr key={product._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {product.variants[0]?.imageUrl && (
                                  <img
                                    src={product.variants[0].imageUrl}
                                    alt={product.title}
                                    className="h-10 w-10 rounded-lg object-cover mr-4"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {product.onlineStoreUrl}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                {product.productType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-wrap gap-1">
                                {product.variants
                                  .slice(0, 3)
                                  .map((variant: any, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                                    >
                                      {variant.title}
                                    </span>
                                  ))}
                                {product.variants.length > 3 && (
                                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                    +{product.variants.length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(product.syncedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {filteredAndPaginatedProducts.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Page {currentPage} of{" "}
                          {filteredAndPaginatedProducts.totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          {/* Page numbers */}
                          <div className="flex space-x-1">
                            {Array.from(
                              {
                                length: Math.min(
                                  5,
                                  filteredAndPaginatedProducts.totalPages
                                ),
                              },
                              (_, i) => {
                                let pageNum;
                                if (
                                  filteredAndPaginatedProducts.totalPages <= 5
                                ) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (
                                  currentPage >=
                                  filteredAndPaginatedProducts.totalPages - 2
                                ) {
                                  pageNum =
                                    filteredAndPaginatedProducts.totalPages -
                                    4 +
                                    i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-1 text-sm border rounded-md ${
                                      currentPage === pageNum
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "border-gray-300 hover:bg-gray-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                            )}
                          </div>

                          <button
                            onClick={() =>
                              setCurrentPage(
                                Math.min(
                                  filteredAndPaginatedProducts.totalPages,
                                  currentPage + 1
                                )
                              )
                            }
                            disabled={
                              currentPage ===
                              filteredAndPaginatedProducts.totalPages
                            }
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty States */}
                  {products && products.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No products
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by syncing products from the API.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={handleSyncProducts}
                          disabled={isSyncing}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSyncing ? "Syncing..." : "Sync Products"}
                        </button>
                      </div>
                    </div>
                  )}

                  {products &&
                    products.length > 0 &&
                    filteredAndPaginatedProducts.totalItems === 0 && (
                      <div className="text-center py-12">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No products found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Try adjusting your search or filter criteria.
                        </p>
                        <div className="mt-6 space-x-2">
                          {productSearch && (
                            <button
                              onClick={() => handleSearchChange("")}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                            >
                              Clear Search
                            </button>
                          )}
                          {productTypeFilter && (
                            <button
                              onClick={() => handleTypeFilterChange("")}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {activeTab === "nips" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  NIPs - Nutritional Information Panel
                </h2>
                <p className="text-gray-600">
                  View nutritional information and details for all products
                </p>
              </div>

              {/* Filter Controls */}
              {products && products.length > 0 && (
                <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search Input */}
                    <div>
                      <label
                        htmlFor="nips-search"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Search Products
                      </label>
                      <input
                        id="nips-search"
                        type="text"
                        placeholder="Search by product name..."
                        value={nipsSearch}
                        onChange={(e) => handleNipsSearchChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Product Type Filter */}
                    <div>
                      <label
                        htmlFor="nips-type-filter"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Product Type
                      </label>
                      <select
                        id="nips-type-filter"
                        value={nipsTypeFilter}
                        onChange={(e) =>
                          handleNipsTypeFilterChange(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Types</option>
                        {productTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* NIP Status Filter */}
                    <div>
                      <label
                        htmlFor="nips-status-filter"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        NIP Status
                      </label>
                      <select
                        id="nips-status-filter"
                        value={nipsStatusFilter}
                        onChange={(e) =>
                          handleNipsStatusFilterChange(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Products</option>
                        <option value="has_nips">Has NIPs</option>
                        <option value="no_nips">No NIPs</option>
                      </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          handleNipsSearchChange("");
                          handleNipsTypeFilterChange("");
                          handleNipsStatusFilterChange("");
                        }}
                        className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Showing {filteredNipsProducts.length} of{" "}
                      {products?.filter((product: any) => {
                        const matchesSearch =
                          nipsSearch === "" ||
                          product.title
                            .toLowerCase()
                            .includes(nipsSearch.toLowerCase()) ||
                          product.onlineStoreUrl
                            .toLowerCase()
                            .includes(nipsSearch.toLowerCase());
                        const matchesType =
                          nipsTypeFilter === "" ||
                          product.productType === nipsTypeFilter;

                        // Check NIP status filter
                        let matchesNipStatus = true;
                        if (nipsStatusFilter && allNips) {
                          const hasNip = allNips.some(
                            (nip: any) => nip.productId === product._id
                          );
                          if (nipsStatusFilter === "has_nips") {
                            matchesNipStatus = hasNip;
                          } else if (nipsStatusFilter === "no_nips") {
                            matchesNipStatus = !hasNip;
                          }
                        }

                        return matchesSearch && matchesType && matchesNipStatus;
                      }).length || 0}{" "}
                      products
                    </span>
                    {(nipsSearch || nipsTypeFilter) && (
                      <button
                        onClick={() => {
                          handleNipsSearchChange("");
                          handleNipsTypeFilterChange("");
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              {products === undefined ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {products && products.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No products available
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Sync products first to view nutritional information.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => setActiveTab("products")}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Go to Products
                        </button>
                      </div>
                    </div>
                  ) : filteredNipsProducts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No products found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {nipsSearch || nipsTypeFilter
                          ? "Try adjusting your search or filters."
                          : "No products match your criteria."}
                      </p>
                      {(nipsSearch || nipsTypeFilter) && (
                        <div className="mt-6">
                          <button
                            onClick={() => {
                              handleNipsSearchChange("");
                              handleNipsTypeFilterChange("");
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Clear Filters
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNipsProducts.map((product: any) => (
                          <div
                            key={product._id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-blue-300 hover:scale-[1.02]"
                            onClick={() => handleProductSelection(product)}
                          >
                            {/* Product Header */}
                            <div className="p-4 border-b border-gray-100">
                              <div className="flex items-start space-x-3">
                                {product.variants[0]?.imageUrl && (
                                  <img
                                    src={product.variants[0].imageUrl}
                                    alt={product.title}
                                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                                    {product.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {product.productType}
                                  </p>
                                  <div className="flex items-center mt-2">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      {product.variants.length} variant
                                      {product.variants.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Nutritional Information Panel */}
                            {/* <div className="p-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">
                                Nutritional Information
                              </h4>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-center text-gray-500 text-sm">
                                  <svg
                                    className="mx-auto h-8 w-8 text-gray-400 mb-2"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  <p>Nutritional data not available</p>
                                  <p className="text-xs mt-1">
                                    Connect to nutrition API to display detailed
                                    information
                                  </p>
                                </div>
                              </div>
                            </div> */}

                            {/* Product Variants */}
                            <div className="p-4 border-t border-gray-100">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Available Variants
                              </h4>
                              <div className="space-y-2">
                                {product.variants
                                  .slice(0, 3)
                                  .map((variant: any, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center space-x-2"
                                    >
                                      {variant.imageUrl && (
                                        <img
                                          src={variant.imageUrl}
                                          alt={variant.title}
                                          className="h-6 w-6 rounded object-cover"
                                        />
                                      )}
                                      <span className="text-sm text-gray-600 truncate">
                                        {variant.title}
                                      </span>
                                    </div>
                                  ))}
                                {product.variants.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{product.variants.length - 3} more variants
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Product Footer */}
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                              <div className="flex justify-between items-center">
                                {/* <span className="text-xs text-gray-500">
                                  Synced:{" "}
                                  {new Date(
                                    product.syncedAt
                                  ).toLocaleDateString()}
                                </span> */}
                                <div className="flex items-center space-x-2">
                                  {/* {product.variants.length > 1 && (
                                    <>
                                      <button
                                        onClick={(e) =>
                                          handleViewTabbedNip(product, e)
                                        }
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                      >
                                        Tabbed NIP
                                      </button>
                                      <button
                                        onClick={(e) =>
                                          handleViewCombinedNip(product, e)
                                        }
                                        className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 bg-green-50 rounded hover:bg-green-100 transition-colors"
                                      >
                                        Combined NIP
                                      </button>
                                    </>
                                  )} */}
                                  <PublicNipDropdown productId={product._id} />
                                  {/* Delete NIPs button - only show if product has NIPs */}
                                  {allNips &&
                                    allNips.some(
                                      (nip: any) =>
                                        nip.productId === product._id
                                    ) && (
                                      <button
                                        onClick={(e) =>
                                          handleDeleteAllNips(product, e)
                                        }
                                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                        title="Delete all NIPs for this product (irreversible)"
                                      >
                                        Delete NIPs
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Loading indicator and Load More */}
                      <div className="mt-8 text-center">
                        {nipsLoading && (
                          <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                            <span className="text-gray-600">
                              Loading more products...
                            </span>
                          </div>
                        )}

                        {!nipsLoading && hasMoreNips && (
                          <button
                            onClick={loadMoreNipsProducts}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                          >
                            Load More Products
                          </button>
                        )}

                        {!hasMoreNips && filteredNipsProducts.length > 12 && (
                          <p className="text-gray-500 text-sm py-4">
                            You've reached the end of the list
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "template-selection" && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Select NIP Template
                    </h2>
                    <p className="text-gray-600">
                      Choose a template for {selectedProduct?.title}
                    </p>
                  </div>
                  <button
                    onClick={handleBackToNips}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to NIPs
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Protein Powder Template */}
                <div
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                  onClick={() => handleTemplateSelection("protein_powder")}
                >
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Protein Powder Template Preview
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Protein Powder
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Optimized layout for protein powder products with serving
                      information, amino acid profiles, and usage instructions.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Recommended
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Select Template →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Complex Supplements Template */}
                <div
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                  onClick={() => handleTemplateSelection("complex_supplements")}
                >
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Complex Supplements Template Preview
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Complex Supplements
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Detailed layout for multi-ingredient supplements with
                      comprehensive ingredient breakdowns and benefits.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Advanced
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Select Template →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Basic Supplements Template */}
                <div
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
                  onClick={() => handleTemplateSelection("supplements")}
                >
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Basic Supplements Template Preview
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Basic Supplements
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Simple, clean layout for basic supplements with essential
                      nutritional information and dosage guidelines.
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Simple
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Select Template →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-blue-400 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Template Selection Guide
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Choose the template that best matches your product type:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          <strong>Protein Powder:</strong> Best for protein
                          supplements with detailed amino acid profiles
                        </li>
                        <li>
                          <strong>Complex Supplements:</strong> Ideal for
                          multi-ingredient formulas with detailed breakdowns
                        </li>
                        <li>
                          <strong>Basic Supplements:</strong> Perfect for
                          single-ingredient or simple supplements
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "nip-builder" &&
            selectedProduct &&
            (selectedTemplate === "protein_powder" ? (
              <ProteinPowderTemplate
                product={selectedProduct}
                variant={selectedVariant}
                currentNip={currentNip}
                onSave={(nip) => {
                  if (nip === null) {
                    handleBackToNips();
                  } else {
                    setCurrentNip(nip);
                    // Allow user to continue editing other variants
                  }
                }}
                onCancel={handleBackToNips}
              />
            ) : selectedTemplate === "complex_supplements" ? (
              <ComplexSupplementsTemplate
                product={selectedProduct}
                variant={selectedVariant}
                currentNip={currentNip}
                onSave={(nip) => {
                  if (nip === null) {
                    handleBackToNips();
                  } else {
                    setCurrentNip(nip);
                    // Allow user to continue editing other variants
                  }
                }}
                onCancel={handleBackToNips}
              />
            ) : selectedTemplate === "supplements" ? (
              <SupplementsTemplate
                product={selectedProduct}
                variant={selectedVariant}
                currentNip={currentNip}
                onSave={(nip) => {
                  if (nip === null) {
                    handleBackToNips();
                  } else {
                    setCurrentNip(nip);
                    // Allow user to continue editing other variants
                  }
                }}
                onCancel={handleBackToNips}
              />
            ) : selectedTemplate === "us_nutrition_facts" ? (
              <USNutritionFactsTemplate
                product={selectedProduct}
                variant={selectedVariant}
                currentNip={currentNip}
                onSave={(nip) => {
                  if (nip === null) {
                    handleBackToNips();
                  } else {
                    setCurrentNip(nip);
                  }
                }}
                onCancel={handleBackToNips}
              />
            ) : (
              <NipBuilder
                product={selectedProduct}
                variant={selectedVariant}
                currentNip={currentNip}
                onSave={(nip) => {
                  if (nip === null) {
                    handleBackToNips();
                  } else {
                    setCurrentNip(nip);
                    // Allow user to continue editing other variants
                  }
                }}
                onCancel={handleBackToNips}
              />
            ))}

          {activeTab === "dashboard" && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Dashboard Overview
                </h2>
                <p className="text-gray-600">System statistics and overview</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Users
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardStats?.totalUsers || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dashboardStats?.totalAdmins || 0} admins,{" "}
                        {dashboardStats?.totalRegularUsers || 0} regular
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <svg
                        className="w-6 h-6 text-orange-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Products
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardStats?.totalProducts || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dashboardStats?.productsWithNips || 0} with NIPs,{" "}
                        {dashboardStats?.productsWithoutNips || 0} without
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total NIPs
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardStats?.totalNips || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dashboardStats?.monthlyStats?.nipsCreatedThisMonth ||
                          0}{" "}
                        this month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg
                        className="w-6 h-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        This Month
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {(dashboardStats?.monthlyStats?.nipsCreatedThisMonth ||
                          0) +
                          (dashboardStats?.monthlyStats
                            ?.productsAddedThisMonth || 0) +
                          (dashboardStats?.monthlyStats?.usersJoinedThisMonth ||
                            0)}
                      </p>
                      <p className="text-xs text-gray-500">New activities</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {dashboardStats?.recentActivity &&
                    dashboardStats.recentActivity.length > 0 ? (
                      dashboardStats.recentActivity.map((activity, index) => {
                        const getActivityIcon = (type: string) => {
                          switch (type) {
                            case "nip_created":
                              return (
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <svg
                                    className="w-4 h-4 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </div>
                              );
                            case "product_added":
                              return (
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <svg
                                    className="w-4 h-4 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                  </svg>
                                </div>
                              );
                            case "user_joined":
                              return (
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <svg
                                    className="w-4 h-4 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                </div>
                              );
                            default:
                              return (
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <svg
                                    className="w-4 h-4 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                              );
                          }
                        };

                        return (
                          <div
                            key={index}
                            className="flex items-start space-x-3"
                          >
                            {getActivityIcon(activity.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  activity.timestamp
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  activity.timestamp
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Template Statistics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">
                          Protein Powder
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {dashboardStats?.templateTypeStats?.proteinPowder || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">
                          Supplements
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {dashboardStats?.templateTypeStats?.supplements || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">
                          Complex Supplements
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {dashboardStats?.templateTypeStats
                          ?.complexSupplements || 0}
                      </span>
                    </div>

                    {dashboardStats?.totalNips &&
                      dashboardStats.totalNips > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-2">
                            Template Distribution
                          </div>
                          <div className="flex space-x-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            {dashboardStats.templateTypeStats.proteinPowder >
                              0 && (
                              <div
                                className="bg-blue-500"
                                style={{
                                  width: `${(dashboardStats.templateTypeStats.proteinPowder / dashboardStats.totalNips) * 100}%`,
                                }}
                              ></div>
                            )}
                            {dashboardStats.templateTypeStats.supplements >
                              0 && (
                              <div
                                className="bg-green-500"
                                style={{
                                  width: `${(dashboardStats.templateTypeStats.supplements / dashboardStats.totalNips) * 100}%`,
                                }}
                              ></div>
                            )}
                            {dashboardStats.templateTypeStats
                              .complexSupplements > 0 && (
                              <div
                                className="bg-purple-500"
                                style={{
                                  width: `${(dashboardStats.templateTypeStats.complexSupplements / dashboardStats.totalNips) * 100}%`,
                                }}
                              ></div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {showCombinedNip && combinedNipProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Combined NIP - {combinedNipProduct.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    All variants compiled into a single nutritional information
                    panel
                  </p>
                </div>
                <button
                  onClick={handleCloseCombinedNip}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {combinedNipData ? (
                  combinedNipData.success ? (
                    <div>
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 text-sm font-medium">
                          ✓ {combinedNipData.message}
                        </p>
                      </div>
                      <div
                        className="border border-gray-200 rounded-lg p-4 bg-white"
                        dangerouslySetInnerHTML={{
                          __html: combinedNipData.html,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <svg
                          className="mx-auto h-12 w-12 text-yellow-400 mb-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <h3 className="text-lg font-medium text-yellow-800 mb-2">
                          No NIPs Available
                        </h3>
                        <p className="text-yellow-700">
                          {combinedNipData.message}
                        </p>
                        <p className="text-yellow-600 text-sm mt-2">
                          Create NIPs for the product variants first, then view
                          the combined output.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600">
                      Generating combined NIP...
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {combinedNipData?.success && (
                    <span>
                      Combined {combinedNipData.variantCount} variant(s)
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  {combinedNipData?.success && (
                    <button
                      onClick={() => {
                        const printWindow = window.open("", "_blank");
                        if (printWindow) {
                          printWindow.document.write(`
                          <html>
                            <head>
                              <title>Combined NIP - ${combinedNipProduct.title}</title>
                              <style>
                                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                                @media print { body { margin: 0; } }
                              </style>
                            </head>
                            <body>
                              ${combinedNipData.html}
                            </body>
                          </html>
                        `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Print/Export
                    </button>
                  )}
                  <button
                    onClick={handleCloseCombinedNip}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabbed NIP Modal */}
        {showTabbedNip && tabbedNipProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Tabbed NIP - {tabbedNipProduct.title}
                </h2>
                <button
                  onClick={handleCloseTabbedNip}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {tabbedNipData?.success ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">
                        {tabbedNipData.message}
                      </p>
                    </div>
                    <div
                      className="border border-gray-200 rounded-lg overflow-hidden"
                      style={{ minHeight: "600px" }}
                    >
                      <iframe
                        srcDoc={tabbedNipData.html}
                        className="w-full h-full"
                        style={{ minHeight: "600px" }}
                        title={`Tabbed NIP - ${tabbedNipProduct.title}`}
                      />
                    </div>
                  </div>
                ) : tabbedNipData?.success === false ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{tabbedNipData.message}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">
                      Generating tabbed NIP...
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {tabbedNipData?.success && (
                    <span>
                      Interactive tabbed view with {tabbedNipData.variantCount}{" "}
                      variant(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  {tabbedNipData?.success && (
                    <button
                      onClick={() => {
                        const newWindow = window.open("", "_blank");
                        if (newWindow) {
                          newWindow.document.write(tabbedNipData.html);
                          newWindow.document.close();
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Open in New Tab
                    </button>
                  )}
                  <button
                    onClick={handleCloseTabbedNip}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Region Picker Modal */}
      {showRegionPicker && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Choose NIP Version</h2>
              <button
                onClick={() => setShowRegionPicker(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => chooseRegion("AU")}
                className="border rounded-lg p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Australian (AU)</div>
                    <div className="text-xs text-gray-600">Protein Powder, Complex, Supplements</div>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[11px] ${hasAnyAu ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {hasAnyAu ? "Exists" : "None"}
                  </span>
                </div>
              </button>
              <button
                onClick={() => chooseRegion("US")}
                className="border rounded-lg p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">United States (US)</div>
                    <div className="text-xs text-gray-600">Nutrition Facts</div>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[11px] ${hasUs ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {hasUs ? "Exists" : "None"}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
