// Shimmering placeholders shown while products load.
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-line bg-white p-3 sm:p-4"
        >
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="skeleton mt-4 h-3 w-1/3" />
          <div className="skeleton mt-3 h-5 w-4/5" />
          <div className="skeleton mt-5 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
