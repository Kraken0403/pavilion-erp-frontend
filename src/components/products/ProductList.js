import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { Checkbox } from "@mui/material";
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

import "../../assets/styles/LeadsTable.scss"; // reuse Leads table styles

const PRODUCTS_PER_PAGE = 20;

const visibleFields = [
  "name",
  "brand",
  "vendor_name",
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

  useEffect(() => {
    loadProducts();
  }, []);

  /* ================= FILTER + SORT ================= */

  const processedProducts = useMemo(() => {
    let data = [...products];

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
  }, [products, searchQuery, sortValue]);

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

  const askSingleDelete = (id) => {
    setProductToDelete(id);
    setConfirmOpen(true);
  };

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
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }

      await loadProducts();
      setOpen(false);
      setEditingProduct(null);

      setNotification({
        open: true,
        message: "✅ Product saved!",
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
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <Checkbox checked={selectAll} onChange={toggleSelectAll} />
              </th>
              <th>NAME</th>
              <th>BRAND</th>
              <th>VENDOR</th>
              <th>CATEGORY</th>
              <th>TYPE</th>
              {/* <th>COST</th> */}
              <th>SELLING PRICE</th>
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
                <td><span className="cell-text">{p.vendor_name || "—"}</span></td>
                <td><span className="cell-text">{p.category_name || "—"}</span></td>
                <td>{p.type}</td>
                <td>
                  {currency} {p.selling_price}
                  {p.selling_price_unit && <small> / {p.selling_price_unit}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        onClose={() => { setOpen(false); setEditingProduct(null); }}
        onAddProduct={handleAddProduct}
        productToEdit={editingProduct}
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
