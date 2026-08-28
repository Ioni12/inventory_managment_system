// Same visual language as StatusBadge (bg-100/text-800 pill), kept separate
// because this covers Product.stock, a different domain than AssetUnit
// status. Currently only renders for the zero-stock case — nothing shown
// otherwise, so it's safe to drop into a row unconditionally.
export default function StockBadge({ stock }) {
  if (stock !== 0) return null;

  return (
    <span className="inline-flex items-center rounded-app px-2.5 py-0.5 text-meta font-medium bg-red-100 text-red-800">
      Nuk ka në stok
    </span>
  );
}
