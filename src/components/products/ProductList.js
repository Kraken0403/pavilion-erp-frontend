import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Checkbox, IconButton, Tooltip } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import Topbar from "../Topbar";
import UtilsBar from "../UtilsBar";
import PaginationBar from "../ui/PaginationBar";
import ConfirmDialog from "../ui/ConfirmDialog";
import NotificationSnackbar from "../ui/NotificationSnackbar";

import {
  fetchAllProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts
} from "../../services/productServices";

import AddProductDialog from "./AddProductDialog";
import { useSettings } from "../../context/SettingsContext";
import useAutoRefresh from "../../hooks/useAutoRefresh";

import "../../assets/styles/LeadsTable.scss"; // reuse Leads table styles

const PRODUCTS_PER_PAGE = 20;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDuplicateProductName = (sourceName, products) => {
  const normalizedName = String(sourceName || "").trim();
  const baseName = normalizedName.replace(/ Copy(?: \d+)?$/, "");
  const duplicatePattern = new RegExp(`^${escapeRegex(baseName)} Copy(?: (\\d+))?$`);

  const duplicateNumbers = products.reduce((acc, product) => {
    const productName = String(product?.name || "").trim();
    const match = productName.match(duplicatePattern);

    if (!match) return acc;

    acc.push(match[1] ? Number(match[1]) : 1);
    return acc;
  }, []);

  if (!duplicateNumbers.length) {
    return `${baseName} Copy`;
  }

  return `${baseName} Copy ${Math.max(...duplicateNumbers) + 1}`;
};

const visibleFields = [
  "name",
  "brand",
  "category_name",
  "type",
  "cost"
];

function ProductList() {
  const { settings } = useSettings();
  const currency = settings?.currency_code || "INR";
  const fileInputRef = useRef(null);


  const [products, setProducts] = useState([]);

  /* ---------- ADD / EDIT ---------- */
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");

  /* ---------- FILTERS ---------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("latest");
  const [dateFilter, setDateFilter] = useState({});

  /* ---------- PAGINATION ---------- */
  const [currentPage, setCurrentPage] = useState(1);

  /* ---------- SELECTION ---------- */
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  /* ---------- DELETE ---------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null); // id | "BULK"

  /* ---------- SNACKBAR ---------- */
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  const clickTimerRef = useRef(null);


  const triggerBulkImport = () => {
    fileInputRef.current?.click();
  };


  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-uploaded
    e.target.value = '';

    try {
      const result = await bulkImportProducts(file);

      await loadProducts();

      if (result.failed > 0) {
        setNotification({
          open: true,
          severity: 'warning',
          message: `⚠️ Imported ${result.success}/${result.total} products. ${result.failed} failed.`
        });

        console.table(result.errors);
      } else {
        setNotification({
          open: true,
          severity: 'success',
          message: `✅ Successfully imported ${result.success} products`
        });
      }
    } catch {
      setNotification({
        open: true,
        severity: 'error',
        message: '❌ Bulk import failed'
      });
    }
  };


  /* ================= FETCH ================= */

  const loadProducts = async () => {
    try {
      const res = await fetchAllProducts();
      setProducts(Array.isArray(res) ? res : []);
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to load products.",
        severity: "error"
      });
    }
  };

  useAutoRefresh(loadProducts, { intervalMs: 20000 });

  /* ================= FILTER + SORT ================= */

  const processedProducts = useMemo(() => {
    let data = [...products];

    if (dateFilter?.startDate) {
      data = data.filter(
        (p) => p.created_at && new Date(p.created_at) >= new Date(dateFilter.startDate)
      );
    }

    if (dateFilter?.endDate) {
      const end = new Date(dateFilter.endDate);
      end.setHours(23, 59, 59, 999);
      data = data.filter(
        (p) => p.created_at && new Date(p.created_at) <= end
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((p) =>
        visibleFields.some((f) =>
          String(p[f] || "").toLowerCase().includes(q)
        )
      );
    }

    switch (sortValue) {
      case "latest":
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "oldest":
        data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "az":
        data.sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        );
        break;
      case "za":
        data.sort((a, b) =>
          String(b.name || "").localeCompare(String(a.name || ""))
        );
        break;
      default:
        break;
    }

    return data;
  }, [products, searchQuery, sortValue, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortValue]);

  /* ================= PAGINATION ================= */

  const indexOfLast = currentPage * PRODUCTS_PER_PAGE;
  const indexOfFirst = indexOfLast - PRODUCTS_PER_PAGE;
  const currentProducts = processedProducts.slice(indexOfFirst, indexOfLast);

  /* ================= ROW CLICK ================= */

  const handleRowClick = async (product) => {
    if (clickTimerRef.current) return;

    clickTimerRef.current = setTimeout(async () => {
      try {
        const fullProduct = await fetchProductById(product.id);
        setDialogMode("edit");
        setEditingProduct(fullProduct);
        setOpen(true);
      } catch {
        setNotification({
          open: true,
          message: "❌ Failed to load product details.",
          severity: "error"
        });
      }
      clickTimerRef.current = null;
    }, 220);
  };

  const handleDuplicateClick = async (event, product) => {
    event.stopPropagation();

    try {
      const fullProduct = await fetchProductById(product.id);

      setDialogMode("duplicate");
      setEditingProduct({
        ...fullProduct,
        name: getDuplicateProductName(fullProduct.name, products),
        sku: "",
        variants: Array.isArray(fullProduct.variants)
          ? fullProduct.variants.map((variant) => ({
            ...variant,
            sku: ""
          }))
          : []
      });
      setOpen(true);
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to prepare product duplicate.",
        severity: "error"
      });
    }
  };

  /* ================= SELECTION ================= */

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setSelectedProducts(next ? processedProducts.map(p => p.id) : []);
  };

  const toggleSelectProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  /* ================= DELETE ================= */

  const askBulkDelete = () => {
    if (!selectedProducts.length) return;
    setProductToDelete("BULK");
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (productToDelete === "BULK") {
        await Promise.all(
          selectedProducts.map((id) => deleteProduct(id))
        );

        setSelectedProducts([]);
        setSelectAll(false);

        setNotification({
          open: true,
          message: `🗑️ ${selectedProducts.length} products deleted`,
          severity: "success"
        });
      } else {
        await deleteProduct(productToDelete);

        setNotification({
          open: true,
          message: "🗑️ Product deleted!",
          severity: "success"
        });
      }

      await loadProducts();
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to delete product(s).",
        severity: "error"
      });
    } finally {
      setConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  /* ================= SAVE ================= */

  const handleAddProduct = async (productData) => {
    try {
      if (dialogMode === "edit" && editingProduct?.id) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }

      await loadProducts();
      setOpen(false);
      setEditingProduct(null);
      setDialogMode("create");

      setNotification({
        open: true,
        message: dialogMode === "duplicate" ? "✅ Product duplicated!" : "✅ Product saved!",
        severity: "success"
      });
    } catch {
      setNotification({
        open: true,
        message: "❌ Failed to save product.",
        severity: "error"
      });
    }
  };

  /* ================= UI ================= */

  return (
    <div className="leads-table-container">
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={handleBulkFileChange}
      />

      <Topbar />

      <UtilsBar
        buttonLabel="Add Product"
        onButtonClick={() => {
          setDialogMode("create");
          setEditingProduct(null);
          setOpen(true);
        }}
        selectedCount={selectedProducts.length}
        onDeleteSelected={askBulkDelete}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        sortValue={sortValue}
        onSortChange={setSortValue}
        onDateFilterChange={setDateFilter}
        onImportBulk={triggerBulkImport}
      />

      <div className="table-container">
        {currentProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No products found</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Add a new product to get started</p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>
                  <Checkbox checked={selectAll} onChange={toggleSelectAll} />
                </th>
                <th>NAME</th>
                <th>BRAND</th>
                <th>CATEGORY</th>
                <th>TYPE</th>
                <th>STATUS</th>
                {/* <th>COST</th> */}
                <th>SELLING PRICE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {currentProducts.map((p) => (
                <tr
                  key={p.id}
                  className="clickable-row"
                  onClick={() => handleRowClick(p)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => toggleSelectProduct(p.id)}
                    />
                  </td>

                  <td><span className="cell-text">{p.name}</span></td>
                  <td><span className="cell-text">{p.brand || "—"}</span></td>
                  <td><span className="cell-text">{p.category_name || "—"}</span></td>
                  <td>{p.type}</td>
                  <td>{Number(p.is_active || 0) === 1 ? 'Active' : 'Inactive'}</td>
                  <td>
                    {currency} {p.selling_price}
                    {p.selling_price_unit && <small> / {p.selling_price_unit}</small>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Duplicate product">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateClick(e, p)}
                        aria-label="Create Duplicate"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "transparent",
                          border: "none",
                          color: "#1976d2",
                          cursor: "pointer",
                          padding: 0,
                          font: "inherit"
                        }}
                      >
                        <IconButton
                          size="small"
                          component="span"
                          disableRipple
                          sx={{ p: 0, color: "inherit" }}
                        >
                          <ContentCopyOutlinedIcon fontSize="small" />
                        </IconButton>
                        <span>Create Duplicate</span>
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalItems={processedProducts.length}
        itemsPerPage={PRODUCTS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* ADD / EDIT */}
      <AddProductDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingProduct(null);
          setDialogMode("create");
        }}
        onAddProduct={handleAddProduct}
        productToEdit={editingProduct}
        mode={dialogMode}
      />

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Product"
        message={
          productToDelete === "BULK"
            ? `Delete ${selectedProducts.length} selected products? This cannot be undone.`
            : "Are you sure you want to delete this product?"
        }
        confirmText="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      {/* SNACKBAR */}
      <NotificationSnackbar
        {...notification}
        onClose={() =>
          setNotification((prev) => ({ ...prev, open: false }))
        }
      />
    </div>
  );
}

export default ProductList;
