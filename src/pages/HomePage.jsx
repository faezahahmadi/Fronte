import { useEffect, useState } from "react";
import { ArrowRight, Heart, House, Leaf, Truck } from "lucide-react";
import ConnectionStatus from "../components/ConnectionStatus";
import { api } from "../services/api";
import { CATEGORIES } from "../services/mockData";

const categoryImages = {
  "fruits-vegetables": "/categories/fruit.jpg",
  "dairy-eggs": "/categories/dairy.jpg",
  bakery: "/categories/bakery.jpg",
  snacks: "/categories/snack.jpg",
  beverages: "/categories/beverage.jpg",
  household: "/categories/household.jpg",
  "personal-care": "/categories/personal%20care.jpg",
};

const promises = [
  [Leaf, "Freshness first", "Good ingredients, good days"],
  [Heart, "Everyday essentials", "Your favorites, in one place"],
  [House, "Made for your home", "Simple shopping starts here"],
];

export default function HomePage() {
  const [categories, setCategories] = useState(CATEGORIES);

  useEffect(() => {
    api("/categories/")
      .then(setCategories)
      .catch(() => setCategories(CATEGORIES));
  }, []);

  return (
    <>
      <section
        className="grid items-center gap-10 py-10 sm:min-h-[560px] 
      sm:grid-cols-[1.1fr_1fr] sm:gap-8 md:py-16">
        <div className="animate-fade-up">
          <span className="eyebrow glass rounded-full px-4 py-2">
            YOUR NEIGHBORHOOD GROCERY, ONLINE
          </span>
          <h1 className="my-6 text-6xl leading-[1] tracking-[0.5px]">
            Good food
            <br />
            <span className="bg-linear-to-r from-leaf-600 via-leaf-400 to-lime bg-clip-text italic text-transparent">
              Fresh beginnings
            </span>

          </h1>
          <p className="mb-8 max-w-[420px] text-[15px] text-muted sm:text-base">
            From crisp greens to everyday essentials, a simpler way to bring
            fresh goodness home.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a className="btn px-7 py-3.5 text-sm" href="#/products">
              Shop the aisles <ArrowRight size={16} />
            </a>
            <a className="btn-ghost py-3.5 text-sm" href="#/products">
              Browse categories
            </a>
          </div>
          <div className="mt-8 flex items-center gap-2.5 text-xs text-muted">
            <span className="grid size-8 place-items-center rounded-full bg-leaf-100 text-leaf-600">
              <Leaf size={16} strokeWidth={2} />
            </span>
            Fresh choices for your everyday life
          </div>
        </div>
        <div
          className="relative min-h-[360px] overflow-hidden 
            sm:min-h-[460px]"
        >
          <img
            src="/fresh.jpg"
            alt="A shopping cart filled with fresh groceries"
            className="absolute inset-0 h-full w-full object-contain p-2 sm:p-4"
          />
          <div
            className="glass absolute bottom-5 left-5 flex 
          items-center gap-3 rounded-2xl px-4 py-3 shadow-soft sm:left-7">
            <span className="grid size-9 place-items-center rounded-full bg-leaf-600 text-white">
              <Truck size={16} />
            </span>
            <p className="text-[11px] leading-tight text-leaf-900">
              <b className="block text-xs">Express delivery</b>
              Next-day option at checkout
            </p>
          </div>
        </div>
      </section>

      <section
        className="stagger grid gap-4 py-2 sm:grid-cols-3 sm:gap-5"
        id="about"
      >
        {promises.map(([Icon, title, text]) => (
          <div
            key={title}
            className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-leaf-100 text-leaf-600">
              <Icon size={24} strokeWidth={1.6} />
            </span>
            <p>
              <b className="block font-display text-[15px] text-forest">
                {title}
              </b>
              <small className="block text-xs text-muted">{text}</small>
            </p>
          </div>
        ))}
      </section>

      <section className="py-16" id="categories">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">SOMETHING FOR EVERY DAY</span>
            <h2 className="mb-6 mt-3 text-[32px] tracking-[-1.2px] sm:text-[40px]">
              Explore the aisles
            </h2>
          </div>
          <p className="mb-6 text-sm text-muted max-sm:-mt-4">
            Everyday goodness, all in one place.
          </p>
        </div>
        <div className="stagger grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <a
              href={`#/products?category=${category.id}`}
              className="home-category-card group"
              key={category.id}
            >
              <div className="home-category-image">
                <img
                  src={categoryImages[category.slug]}
                  alt={`${category.name} category`}
                  loading="lazy"
                />
              </div>
              <div className="text-xl home-category-copy">
                <h3>{category.name}</h3>
                <p className="text-sm">
                  {category.description || `Browse ${category.name.toLowerCase()}`}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <ConnectionStatus />
    </>
  );
}
