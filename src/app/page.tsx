import Link from "next/link";
import PricingTicket from "../components/PricingTicket";
import ProfileMenu from "../components/ProfileMenu";
import QuoteContactForm from "../components/QuoteContactForm";

const GREEN = "#006847";
const RED = "#CE1126";

const services = [
  {
    title: "Residential Builds",
    accent: GREEN,
    description:
      "Dream homes, extra floors, and that balcony the city said you couldn't have. We make it happen.",
    icon: "🏠",
  },
  {
    title: "Commercial Projects",
    accent: RED,
    description:
      "Warehouses, storefronts, and offices delivered ahead of schedule and behind on paperwork.",
    icon: "🏢",
  },
  {
    title: "Rapid Demolition",
    accent: GREEN,
    description:
      "If it's standing and you don't want it standing, consider it handled. Speed is our specialty.",
    icon: "🚧",
  },
  {
    title: "Off-the-Books Renovations",
    accent: RED,
    description:
      "Kitchens, bathrooms, and surprise basements. Premium finishes, zero awkward inspector visits.",
    icon: "🔨",
  },
];

const stats = [
  { value: "847", label: "Projects Completed" },
  { value: "0", label: "Permits Filed" },
  { value: "24/7", label: "Availability" },
  { value: "100%", label: "Cash Accepted" },
];

const reasons = [
  {
    title: "No Red Tape",
    body: "While the competition waits months for approvals, we're already pouring the foundation.",
  },
  {
    title: "Lightning Fast",
    body: "We work nights, weekends, and holidays. The faster we finish, the fewer questions get asked.",
  },
  {
    title: "Family Owned",
    body: "Three generations of builders who never met a building code they couldn't ignore.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Tricolor top accent */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1" style={{ backgroundColor: GREEN }} />
        <div className="flex-1 bg-white" />
        <div className="flex-1" style={{ backgroundColor: RED }} />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md text-lg font-black text-white"
              style={{ backgroundColor: GREEN }}
            >
              IC
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Illegal Construction{" "}
              <span style={{ color: RED }}>Co.</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#services" className="transition-colors hover:text-gray-900">
              Services
            </a>
            <a href="#why" className="transition-colors hover:text-gray-900">
              Why Us
            </a>
            <a href="#projects" className="transition-colors hover:text-gray-900">
              Projects
            </a>
            <a href="#tickets" className="transition-colors hover:text-gray-900">
              Get a Ticket
            </a>
            <a href="#contact" className="transition-colors hover:text-gray-900">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: RED }}
            >
              Get a Quote
            </a>
            <ProfileMenu />
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RED }} />
              Building Since Forever
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">
              We Build First,
              <br />
              <span style={{ color: GREEN }}>Ask Permits</span>{" "}
              <span style={{ color: RED }}>Later.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-gray-600">
              From foundations to full builds, Illegal Construction Co. delivers
              bold projects with zero red tape and unbeatable speed. The city
              will figure it out eventually.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#contact"
                className="rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: GREEN }}
              >
                Start Your Project
              </a>
              <a
                href="#services"
                className="rounded-md border-2 px-6 py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: RED, color: RED }}
              >
                View Services
              </a>
            </div>
          </div>

          <div className="relative">
            <div
              className="aspect-square w-full rounded-3xl border border-gray-100 p-1 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${GREEN} 0%, #ffffff 50%, ${RED} 100%)`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[20px] bg-white p-8 text-center">
                <div className="text-7xl">🦅</div>
                <p className="mt-4 text-2xl font-black tracking-tight">
                  Hecho con Orgullo
                </p>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Built with pride — and a little bit of nerve.
                </p>
                <div className="mt-6 flex w-full justify-center gap-1.5">
                  <div className="h-2 w-16 rounded-full" style={{ backgroundColor: GREEN }} />
                  <div className="h-2 w-16 rounded-full bg-gray-200" />
                  <div className="h-2 w-16 rounded-full" style={{ backgroundColor: RED }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ backgroundColor: GREEN }} className="text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-black md:text-5xl">{s.value}</div>
              <div className="mt-1 text-sm font-medium text-green-100">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight">
              What We <span style={{ color: RED }}>Do</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">
              Full-service construction with a flexible relationship to
              regulations. Pick a service and we&apos;ll handle the rest.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ borderTopColor: service.accent, borderTopWidth: 4 }}
              >
                <div className="text-4xl">{service.icon}</div>
                <h3 className="mt-4 text-lg font-bold">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tight">
                Why Choose{" "}
                <span style={{ color: GREEN }}>Illegal Construction Co.</span>
              </h2>
              <p className="mt-4 text-gray-600">
                We&apos;re not your average contractor. We move fast, charge
                fair, and never let a little paperwork slow down your vision.
              </p>
              <div className="mt-8 space-y-6">
                {reasons.map((reason, i) => (
                  <div key={reason.title} className="flex gap-4">
                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-black text-white"
                      style={{ backgroundColor: i % 2 === 0 ? GREEN : RED }}
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
              className="rounded-3xl p-8 text-white shadow-xl"
              style={{
                background: `linear-gradient(160deg, ${GREEN}, ${RED})`,
              }}
            >
              <h3 className="text-2xl font-black">Featured Project</h3>
              <p className="mt-2 text-sm text-white/80">
                The 4-Story &quot;3-Story&quot; Apartment
              </p>
              <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur">
                <p className="text-sm leading-relaxed text-white/90">
                  Client wanted three floors. We gave them four. The fourth one
                  is technically &quot;attic storage.&quot; Completed in record
                  time, fully furnished, and absolutely beautiful. Inspector
                  visit pending (indefinitely).
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-black">6 wks</div>
                    <div className="text-xs text-white/70">Build Time</div>
                  </div>
                  <div className="h-8 w-px bg-white/30" />
                  <div>
                    <div className="text-2xl font-black">+1</div>
                    <div className="text-xs text-white/70">Bonus Floor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing tickets (Google login + Firestore) */}
      <PricingTicket />

      {/* Tricolor CTA band */}
      <section id="contact" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-xl">
            <div className="flex h-2 w-full">
              <div className="flex-1" style={{ backgroundColor: GREEN }} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{ backgroundColor: RED }} />
            </div>
            <div className="px-8 py-12 text-center">
              <h2 className="text-4xl font-black tracking-tight">
                Ready to Build Something{" "}
                <span style={{ color: RED }}>Bold?</span>
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-gray-600">
                Get a free, no-obligation, no-paperwork quote today. We&apos;ll
                call you back before the cement dries.
              </p>
              <QuoteContactForm />
              <p className="mt-3 text-xs text-gray-400">
                Cash, crypto, and &quot;we&apos;ll figure it out&quot; accepted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: GREEN }} className="text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black" style={{ color: GREEN }}>
              IC
            </span>
            <span className="font-bold">Illegal Construction Co.</span>
          </div>
          <p className="text-sm text-green-100">
            © {new Date().getFullYear()} Illegal Construction Co. — A parody. Not a real company.
          </p>
          <div className="flex gap-4 text-sm text-green-100">
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
