"use client";

import Image from "next/image";
import { DEFAULT_THEME, companyInitials } from "../lib/theme";
import PricingTicket from "./PricingTicket";
import QuoteContactForm from "./QuoteContactForm";
import SiteHeader, { BUSINESS_HOURS, DEMO_PHONE, DEMO_PHONE_TEL } from "./SiteHeader";
import GoogleReviewsSection from "./GoogleReviewsSection";

const services = [
  {
    title: "Residential Builds",
    description:
      "Custom homes, additions, and renovations tailored to your vision — built to last with quality materials and craftsmanship.",
    icon: "🏠",
  },
  {
    title: "Commercial Projects",
    description:
      "Offices, retail spaces, and warehouses delivered on schedule with clear communication every step of the way.",
    icon: "🏢",
  },
  {
    title: "Renovation & Remodel",
    description:
      "Kitchens, bathrooms, and full interior updates that transform your space without the stress.",
    icon: "🔨",
  },
  {
    title: "Project Management",
    description:
      "Dedicated oversight from planning through completion so your project stays on budget and on time.",
    icon: "📋",
  },
];

const stats = [
  { value: "500+", label: "Projects Completed" },
  { value: "15+", label: "Years Experience" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "24/7", label: "Support Available" },
];

const reasons = [
  {
    title: "Licensed & Insured",
    body: "Fully licensed contractors with comprehensive insurance for your peace of mind.",
  },
  {
    title: "Transparent Pricing",
    body: "Detailed quotes with no hidden fees. You'll know exactly what to expect before we break ground.",
  },
  {
    title: "Dedicated Team",
    body: "Experienced project managers and skilled tradespeople who treat your property like their own.",
  },
];

const reviews = [
  {
    name: "Maria Gonzalez",
    location: "Westside",
    rating: 5,
    text: "They remodeled our kitchen in three weeks and kept us updated every day. Clean crew, fair price, and the finish work is beautiful.",
  },
  {
    name: "James & Linda Park",
    location: "Oak Hills",
    rating: 5,
    text: "We used them for a full home addition. Permits, timeline, and communication were handled professionally from start to finish.",
  },
  {
    name: "Robert Chen",
    location: "Downtown",
    rating: 5,
    text: "Our storefront build-out opened on schedule. They worked around our business hours and delivered exactly what we asked for.",
  },
  {
    name: "Sarah Mitchell",
    location: "Riverside",
    rating: 4,
    text: "Great experience on our bathroom remodel. Small tweak at the end was fixed quickly. Would hire again without hesitation.",
  },
];

const gallery = [
  {
    title: "Modern Kitchen Remodel",
    category: "Residential",
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    title: "Commercial Office Build-Out",
    category: "Commercial",
    src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  },
  {
    title: "Custom Home Framing",
    category: "New Build",
    src: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
  },
  {
    title: "Exterior Renovation",
    category: "Residential",
    src: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
  },
  {
    title: "Warehouse Expansion",
    category: "Commercial",
    src: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
  },
  {
    title: "Deck & Outdoor Living",
    category: "Residential",
    src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < count ? "text-amber-400" : "text-gray-200"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function HomePage() {
  const theme = DEFAULT_THEME;
  const initials = companyInitials(theme.companyName);

  return (
    <main className="site-canvas text-gray-900">
      <div className="brand-bar" />
      <SiteHeader companyName={theme.companyName} initials={initials} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-32 h-64 w-64 rounded-full bg-brand-accent/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/25 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-brand-accent" />
              Trusted Local Builder
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight text-gray-900 md:text-6xl">
              Build With{" "}
              <span className="text-brand-primary">Confidence</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-gray-600">
              {theme.tagline} From residential remodels to commercial builds,
              we partner with you from the first conversation to the final
              walkthrough.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#contact" className="btn-brand-primary px-6 py-3">
                Start Your Project
              </a>
              <a
                href={`tel:${DEMO_PHONE_TEL}`}
                className="inline-flex items-center gap-2 rounded-md border-2 border-brand-primary bg-white/80 px-6 py-3 text-sm font-semibold text-brand-primary shadow-sm backdrop-blur transition hover:bg-white"
              >
                Call {DEMO_PHONE}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="section-surface aspect-square w-full overflow-hidden p-1">
              <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-primary/15 via-white to-brand-accent/20 p-8 text-center">
                <div className="text-7xl">🏗️</div>
                <p className="mt-4 text-2xl font-black tracking-tight text-gray-900">
                  Built to Last
                </p>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Quality craftsmanship on every project
                </p>
                <div className="mt-6 flex w-full justify-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-brand-primary" />
                  <div className="h-2 w-16 rounded-full bg-brand-accent/40" />
                  <div className="h-2 w-16 rounded-full bg-brand-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-brand-primary text-white shadow-lg shadow-brand-primary/20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-black md:text-5xl">{s.value}</div>
              <div className="mt-1 text-sm font-medium text-white/80">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight">
              What We <span className="text-brand-accent">Do</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">
              Full-service construction for homeowners and businesses. Tell us
              what you need and we&apos;ll put together a clear plan.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, i) => (
              <div
                key={service.title}
                className={`section-surface group p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                  i % 2 === 0 ? "border-t-brand-primary" : "border-t-brand-accent"
                } border-t-4`}
              >
                <div className="text-4xl">{service.icon}</div>
                <h3 className="mt-4 text-lg font-bold">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo gallery */}
      <section id="gallery" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight">
              Our <span className="text-brand-primary">Work</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">
              A look at recent projects — from kitchen remodels to commercial
              build-outs.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((item) => (
              <div
                key={item.title}
                className="group section-surface overflow-hidden p-0 transition hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 p-4 text-white">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                      {item.category}
                    </span>
                    <p className="mt-2 font-bold">{item.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews / trust */}
      <section id="reviews" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="section-surface px-8 py-12 md:px-12">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
                Trusted by homeowners & businesses
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight">
                What Our <span className="text-brand-accent">Clients Say</span>
              </h2>
              <div className="mx-auto mt-4 flex items-center justify-center gap-2">
                <Stars count={5} />
                <span className="text-sm font-semibold text-gray-600">
                  4.9 average · 120+ reviews
                </span>
              </div>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {reviews.map((r) => (
                <blockquote
                  key={r.name}
                  className="rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm"
                >
                  <Stars count={r.rating} />
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <footer className="mt-4 border-t border-gray-100 pt-4">
                    <p className="font-bold text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.location}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 pt-8 text-center text-sm text-gray-600">
              <div>
                <p className="text-2xl font-black text-brand-primary">Licensed</p>
                <p>State certified contractor</p>
              </div>
              <div className="hidden h-10 w-px bg-gray-200 sm:block" />
              <div>
                <p className="text-2xl font-black text-brand-primary">Insured</p>
                <p>Full liability coverage</p>
              </div>
              <div className="hidden h-10 w-px bg-gray-200 sm:block" />
              <div>
                <p className="text-2xl font-black text-brand-primary">Local</p>
                <p>Serving the community 15+ years</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GoogleReviewsSection />

      {/* Why us */}
      <section id="why" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="section-surface p-8">
              <h2 className="text-4xl font-black tracking-tight">
                Why Choose{" "}
                <span className="text-brand-primary">{theme.companyName}</span>
              </h2>
              <p className="mt-4 text-gray-600">
                We combine experienced crews, honest communication, and
                attention to detail on every job — big or small.
              </p>
              <div className="mt-8 space-y-6">
                {reasons.map((reason, i) => (
                  <div key={reason.title} className="flex gap-4">
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-black text-white ${
                        i % 2 === 0 ? "bg-brand-primary" : "bg-brand-accent"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-bold">{reason.title}</h3>
                      <p className="text-sm text-gray-600">{reason.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              id="projects"
              className="rounded-3xl bg-gradient-to-br from-brand-primary to-brand-accent p-8 text-white shadow-xl"
            >
              <h3 className="text-2xl font-black">Featured Project</h3>
              <p className="mt-2 text-sm text-white/80">
                Riverside Office Complex — Phase 2
              </p>
              <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur">
                <p className="text-sm leading-relaxed text-white/90">
                  A 12,000 sq ft commercial build-out completed two weeks ahead
                  of schedule. Open floor plan, modern finishes, and full
                  compliance with local building codes.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-black">14 wks</div>
                    <div className="text-xs text-white/70">Build Time</div>
                  </div>
                  <div className="h-8 w-px bg-white/30" />
                  <div>
                    <div className="text-2xl font-black">On Budget</div>
                    <div className="text-xs text-white/70">Final Cost</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PricingTicket />

      {/* Contact */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="section-surface overflow-hidden shadow-xl">
            <div className="brand-bar" />
            <div className="px-8 py-12 text-center">
              <h2 className="text-4xl font-black tracking-tight">
                Ready to Get{" "}
                <span className="text-brand-accent">Started?</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-gray-600">
                Request a free, no-obligation quote. Our team will reach out
                within one business day.
              </p>
              <QuoteContactForm />
              <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:justify-center sm:gap-8">
                <a
                  href={`tel:${DEMO_PHONE_TEL}`}
                  className="font-semibold text-brand-primary hover:underline"
                >
                  {DEMO_PHONE}
                </a>
                <div className="hidden sm:block text-gray-300">|</div>
                <div>
                  {BUSINESS_HOURS.slice(0, 2).map((h) => (
                    <span key={h.days} className="block">
                      {h.days}: {h.hours}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-primary text-white shadow-inner">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black text-brand-primary">
              {initials}
            </span>
            <span className="font-bold">{theme.companyName}</span>
          </div>
          <p className="text-sm text-white/80">{theme.tagline}</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/80">
            <a href={`tel:${DEMO_PHONE_TEL}`} className="hover:text-white">
              {DEMO_PHONE}
            </a>
            <a href="#gallery" className="hover:text-white">
              Gallery
            </a>
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
