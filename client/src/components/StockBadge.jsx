// Same visual language as StatusBadge (bg-100/text-800 pill). Checks
// availableStock (unassigned, Ne magazine units) — NOT total stock, since
// a batch can have plenty of total units but none actually available if
// they're all assigned/in repair/decommissioned.
export default function StockBadge({ availableStock }) {
  if (availableStock !== 0) return null;

  return (
    <span className="inline-flex items-center rounded-app px-2.5 py-0.5 text-meta font-medium bg-red-100 text-red-800">
      Nuk ka në stok
    </span>
  );
}
