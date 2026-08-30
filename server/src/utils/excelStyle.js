const HEADER_FILL = "FF1F2937";
const HEADER_FONT_COLOR = "FFFFFFFF";
const STRIPE_FILL = "FFF9FAFB";

function applyHeaderStyle(sheet) {
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
}

/**
 * Zebra-stripes even data rows. `withBorders` adds a thin bottom border
 * to every cell — matches the original Products export ("Asete gjendje")
 * sheet, which had borders; the "Ne Perdorim" sheet historically did not,
 * so it defaults to false to preserve that existing look.
 */
function applyZebraStripes(sheet, { withBorders = false } = {}) {
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const isStripe = rowNum % 2 === 0;

    row.eachCell({ includeEmpty: true }, (cell) => {
      if (withBorders) {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      }
      if (isStripe) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STRIPE_FILL },
        };
      }
    });
  }
}

/**
 * Colors the status column's cells based on a status->color map.
 * Only applied to sheets that have a status column (Products export).
 */
function applyStatusColors(sheet, statusColIndex, statusColors) {
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const statusCell = row.getCell(statusColIndex);
    const color = statusColors[statusCell.value];
    if (color) {
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
      statusCell.alignment = { horizontal: "center" };
    }
  }
}

/**
 * Convenience wrapper applying the standard header + frozen row + zebra
 * stripes combo used by every export sheet in this app. Pass
 * `statusColIndex`/`statusColors` for sheets that also need per-status
 * cell coloring (only Products export uses this today).
 */
function applyStandardSheetStyle(sheet, opts = {}) {
  applyHeaderStyle(sheet);
  applyZebraStripes(sheet, { withBorders: opts.withBorders });
  if (opts.statusColIndex && opts.statusColors) {
    applyStatusColors(sheet, opts.statusColIndex, opts.statusColors);
  }
}

module.exports = {
  HEADER_FILL,
  HEADER_FONT_COLOR,
  STRIPE_FILL,
  applyHeaderStyle,
  applyZebraStripes,
  applyStatusColors,
  applyStandardSheetStyle,
};
