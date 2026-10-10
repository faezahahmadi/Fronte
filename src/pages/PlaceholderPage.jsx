import { ArrowRight } from "lucide-react";

// Route is reserved, but its feature is delivered in a later sprint.
export default function PlaceholderPage() {
  return (
    <section className="page">
      <div className="empty-state">
        <h2>Coming soon</h2>
        <p className="mb-5">This page is not part of the current release.</p>
        <a href="#/products" className="text-btn text-sm">
          Browse products <ArrowRight size={14} />
        </a>
      </div>
    </section>
  );
}
