import { Leaf } from "lucide-react";

export default function Brand({ className = "text-[27px]", light = false }) {
  return (
    <a
      href="#/"
      aria-label="Fresh Mart home"
      className={`group flex items-center gap-2.5 font-display font-bold leading-[1.1] tracking-[-1px] ${
        light ? "text-white" : "text-forest"
      } ${className}`}
    >
      <span
        className={`grid size-[1.6em] place-items-center rounded-[0.55em] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 ${
          light
            ? "bg-lime text-forest"
            : "bg-linear-to-br from-leaf-500 to-leaf-800 text-white shadow-[0_6px_14px_-6px_rgba(20,83,45,0.8)]"
        }`}
      >
        <Leaf className="size-[0.95em]" strokeWidth={2} aria-hidden="true" />
      </span>
      <span>
        fresh<span className="font-medium italic">mart</span>
        <small
          className={`mt-[5px] block font-sans text-[8px] font-semibold tracking-[2.2px] ${
            light ? "text-white/60" : "text-leaf-600/80"
          }`}
        >
          GOOD FOOD. EVERY DAY.
        </small>
      </span>
    </a>
  );
}
