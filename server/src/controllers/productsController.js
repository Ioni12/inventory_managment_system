const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Employee = require("../models/Employee");
const { isValidAssetId, ensureUniqueAssetId } = require("../utils/assetId");
const {
  findOrCreateGroup,
  pruneEmptyGroups,
} = require("../utils/productGroups");
const { buildNePerdorimRows } = require("./nePerdorimController");

const NE_PERDORIM_COLUMNS = [
  { header: "Nr.", key: "nr", width: 6 },
  { header: "Emer Mbiemer", key: "emerMbiemer", width: 22 },
  { header: "Kompani", key: "kompani", width: 14 },
  { header: "Departamenti", key: "departamenti", width: 16 },
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Sasia", key: "sasia", width: 10 },
  { header: "Email ADC", key: "emailADC", width: 22 },
  { header: "Email Vodafone", key: "emailVodafone", width: 22 },
  { header: "Nr. telefoni", key: "nrTelefoni", width: 15 },
  { header: "Badge + QR Code", key: "badgeQr", width: 18 },
];

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

const STATUS_COLORS = {
  "Ne magazine": "FFE5E7EB",
  "Ne perdorim": "FFD1FAE5",
  "Ne riparim": "FFFEF3C7",
  "Jashte perdorimit": "FFFEE2E2",
};

const HEADER_FILL = "FF1F2937";
const HEADER_FONT_COLOR = "FFFFFFFF";
const STRIPE_FILL = "FFF9FAFB";

// One row per group (a status+holder bucket within a batch), not per unit.
const EXPORT_COLUMNS = [
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Kategoria", key: "categoryName", width: 16 },
  { header: "Marka/modeli", key: "name", width: 22 },
  { header: "Branding", key: "branding", width: 14 },
  { header: "Njesia", key: "unit", width: 10 },
  { header: "Furnitori", key: "supplierName", width: 16 },
  { header: "Cmimi i blerjes", key: "purchasePrice", width: 14 },
  { header: "Pershkrim (opsional)", key: "description", width: 26 },
  { header: "Statusi", key: "status", width: 16 },
  { header: "Mbajtesi", key: "holderName", width: 20 },
  { header: "Sasia", key: "quantity", width: 10 },
];

const IMPORT_SHEET_NAME = "Asete gjendje";

// GET /api/products/export
async function exportProducts(req, res) {
  try {
    const products = await Product.find()
      .populate("category supplier")
      .populate("groups.currentHolder");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asete gjendje");
    sheet.columns = EXPORT_COLUMNS;

    products.forEach((p) => {
      const batch = {
        assetId: p.assetId || "",
        categoryName: p.category?.name || "",
        name: p.name,
        branding: p.branding,
        unit: p.unit,
        supplierName: p.supplier?.name || "",
        purchasePrice: p.purchasePrice,
        description: p.description,
      };

      if (p.groups.length === 0) {
        sheet.addRow({ ...batch, status: "", holderName: "", quantity: 0 });
        return;
      }

      p.groups.forEach((g) => {
        const holder = g.currentHolder;
        sheet.addRow({
          ...batch,
          status: g.status,
          holderName: holder ? `${holder.firstName} ${holder.lastName}` : "",
          quantity: g.quantity,
        });
      });
    });

    // --- Styling ---
    const headerRow = sheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const statusColIndex =
      EXPORT_COLUMNS.findIndex((c) => c.key === "status") + 1;

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const isStripe = rowNum % 2 === 0;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (isStripe) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: STRIPE_FILL },
          };
        }
      });

      const statusCell = row.getCell(statusColIndex);
      const statusColor = STATUS_COLORS[statusCell.value];
      if (statusColor) {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColor },
        };
        statusCell.alignment = { horizontal: "center" };
      }
    }

    // --- Second sheet: "Ne Perdorim" (same derived query used by the
    // GET /api/products/ne-perdorim endpoint — implemented once, rendered
    // two ways, per spec). ---
    const nePerdorimRows = await buildNePerdorimRows();
    const npSheet = workbook.addWorksheet("Ne Perdorim");
    npSheet.columns = NE_PERDORIM_COLUMNS;
    nePerdorimRows.forEach((row) => npSheet.addRow(row));

    const npHeaderRow = npSheet.getRow(1);
    npHeaderRow.height = 22;
    npHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    npSheet.views = [{ state: "frozen", ySplit: 1 }];
    for (let rowNum = 2; rowNum <= npSheet.rowCount; rowNum++) {
      const row = npSheet.getRow(rowNum);
      if (rowNum % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: STRIPE_FILL },
          };
        });
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildColumnIndex(sheet) {
  const headerRow = sheet.getRow(1).values;
  const colIndex = {};
  headerRow.forEach((val, idx) => {
    if (!val) return;
    colIndex[String(val).trim().toLowerCase()] = idx;
  });
  return colIndex;
}

function cellGetter(colIndex) {
  return (row, label) => {
    const idx = colIndex[label.toLowerCase()];
    if (!idx) return undefined;
    const cell = row.getCell(idx).value;
    return cell === null || cell === undefined ? "" : String(cell).trim();
  };
}

async function resolveCategory(name) {
  if (!name) return null;
  let category = await Category.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!category) category = await Category.create({ name });
  return category._id;
}

async function resolveSupplier(name) {
  if (!name) return null;
  let supplier = await Supplier.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!supplier) supplier = await Supplier.create({ name });
  return supplier._id;
}

async function resolveHolder(fullName, email) {
  if (!fullName) return null;

  if (email) {
    const byEmail = await Employee.findOne({ email });
    if (byEmail) return byEmail._id;
  }

  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "(unknown)";

  let employee = await Employee.findOne({
    firstName: new RegExp(`^${firstName}$`, "i"),
    lastName: new RegExp(`^${lastName}$`, "i"),
  });

  if (!employee) {
    employee = await Employee.create({
      firstName,
      lastName,
      email: email || undefined,
    });
  }

  return employee._id;
}

function resolveStatus(raw) {
  if (!raw) return undefined;
  return STATUS_VALUES.find((v) => v.toLowerCase() === raw.toLowerCase());
}

// POST /api/products/import
// Rows are grouped by Asset ID into one Product; within that Product,
// rows are merged into groups keyed by (status, currentHolder) using the
// same findOrCreateGroup logic used at runtime (rule: import must use the
// same merge-safety as live requests).
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, skipped: [] };
  const newBatchByKey = new Map(); // `${name}|${category}` -> assetId, for this run only

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet =
      workbook.getWorksheet(IMPORT_SHEET_NAME) || workbook.worksheets[0];
    const colIndex = buildColumnIndex(sheet);
    const get = cellGetter(colIndex);

    const touchedProductIds = new Set();

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name = get(row, "Marka/modeli") || get(row, "Name");
      const rawAssetId = get(row, "Asset ID");

      if (!name) {
        results.skipped.push({ row: rowNum, reason: "Missing product name" });
        continue;
      }

      if (rawAssetId && !isValidAssetId(rawAssetId)) {
        results.skipped.push({
          row: rowNum,
          reason: `Invalid Asset ID "${rawAssetId}" (failed check digit)`,
        });
        continue;
      }

      const categoryName = get(row, "Kategoria") || get(row, "Category");
      const supplierName = get(row, "Furnitori") || get(row, "Supplier");
      const categoryId = categoryName
        ? await resolveCategory(categoryName)
        : null;
      const supplierId = supplierName
        ? await resolveSupplier(supplierName)
        : null;

      const statusRaw = get(row, "Statusi") || get(row, "Status");
      let status = "Ne magazine";
      if (statusRaw) {
        const resolved = resolveStatus(statusRaw);
        if (!resolved) {
          results.skipped.push({
            row: rowNum,
            reason: `Invalid Statusi value "${statusRaw}" (must be one of: ${STATUS_VALUES.join(", ")})`,
          });
          continue;
        }
        status = resolved;
      }

      const holderName = get(row, "Mbajtesi") || get(row, "Emer Mbiemer");
      const holderEmail = get(row, "Email");
      const holderId = holderName
        ? await resolveHolder(holderName, holderEmail)
        : null;

      const quantityRaw = get(row, "Sasia") || get(row, "Quantity");
      const quantity =
        quantityRaw !== undefined && quantityRaw !== ""
          ? Number(quantityRaw)
          : 1;
      if (!quantity || quantity <= 0) {
        results.skipped.push({
          row: rowNum,
          reason: "Sasia must be a positive number",
        });
        continue;
      }

      const batchFields = {};
      if (categoryId) batchFields.category = categoryId;
      if (supplierId) batchFields.supplier = supplierId;
      const branding = get(row, "Branding");
      if (branding) batchFields.branding = branding;
      const unit = get(row, "Njesia") || get(row, "Unit");
      if (unit) batchFields.unit = unit;
      const description =
        get(row, "Pershkrim (opsional)") || get(row, "Description");
      if (description) batchFields.description = description;
      const purchasePriceRaw =
        get(row, "Cmimi i blerjes") || get(row, "Purchase Price");
      if (purchasePriceRaw !== undefined && purchasePriceRaw !== "") {
        batchFields.purchasePrice = Number(purchasePriceRaw) || 0;
      }

      let product;

      if (rawAssetId) {
        product = await Product.findOne({ assetId: rawAssetId.toUpperCase() });
        if (!product) {
          results.skipped.push({
            row: rowNum,
            reason: `Asset ID "${rawAssetId}" not found — cannot update a non-existent item`,
          });
          continue;
        }
        Object.assign(product, batchFields);
      } else {
        const key = `${name.toLowerCase()}|${categoryId}`;
        const existingNewAssetId = newBatchByKey.get(key);

        if (existingNewAssetId) {
          product = await Product.findOne({ assetId: existingNewAssetId });
        } else {
          if (!categoryId) {
            results.skipped.push({
              row: rowNum,
              reason: "No category resolved for new item",
            });
            continue;
          }
          const assetId = await ensureUniqueAssetId(Product, "assetId");
          product = new Product({
            name,
            category: categoryId,
            assetId,
            ...batchFields,
          });
          newBatchByKey.set(key, assetId);
        }
      }

      // Merge this row's units into the matching group, same rule as live requests.
      const group = findOrCreateGroup(product, status, holderId);
      group.quantity += quantity;
      pruneEmptyGroups(product);

      const isNewProduct = product.isNew;
      await product.save();

      if (!touchedProductIds.has(String(product._id))) {
        touchedProductIds.add(String(product._id));
        if (isNewProduct) results.created += 1;
        else results.updated += 1;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
