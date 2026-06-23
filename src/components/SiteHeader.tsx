"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock, Menu, Phone, X } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

export const DEMO_PHONE = "(555) 482-9100";
export const DEMO_PHONE_TEL = "5554829100";

export const BUSINESS_HOURS = [
  { days: "Monday – Friday", hours: "7:00 AM – 6:00 PM" },
  { days: "Saturday", hours: "8:00 AM – 2:00 PM" },
  { days: "Sunday", hours: "Closed" },
];

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#gallery", label: "Gallery" },
  { href: "#reviews", label: "Reviews" },
  { href: "#google-reviews", label: "Google" },
  { href: "#why", label: "Why Us" },
  { href: "#tickets", label: "Get a Quote" },
  { href: "#contact", label: "Contact" },
];

function HoursDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200/80 bg-white/60 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-primary/30 hover:bg-white"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Clock size={15} className="text-brand-primary" />
        <span>Hours</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Business hours
          </p>
          <ul className="space-y-2 text-sm">
            {BUSINESS_HOURS.map((row) => (
              <li key={row.days} className="flex justify-between gap-3">
                <span className="font-medium text-gray-700">{row.days}</span>
                <span className="text-gray-500">{row.hours}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NavDivider() {
  return <span className="hidden h-6 w-px shrink-0 bg-gray-200 xl:block" aria-hidden />;
}

export default function SiteHeader({
  companyName,
  initials,
}: {
  companyName: string;
  initials: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
      <nav className="flex w-full items-center gap-4 px-5 py-3.5 sm:px-8 lg:px-10 xl:gap-6 xl:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 sm:gap-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-primary text-sm font-black text-white shadow-sm sm:h-10 sm:w-10">
            {initials}
          </span>
          <span className="max-w-[9rem] truncate text-base font-extrabold tracking-tight text-gray-900 sm:max-w-none sm:text-lg">
            {companyName}
          </span>
        </Link>

        {/* Nav links — spread across the middle on large screens */}
        <div className="hidden min-w-0 flex-1 items-center justify-center xl:flex">
          <div className="flex items-center gap-7 2xl:gap-9">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-gray-600 transition-colors hover:text-brand-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right side — hours, call, profile */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 xl:gap-4">
          <div className="hidden items-center gap-3 xl:flex">
            <HoursDropdown />
            <NavDivider />
            <a
              href={`tel:${DEMO_PHONE_TEL}`}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Phone size={15} />
              {DEMO_PHONE}
            </a>
            <NavDivider />
          </div>

          {/* Compact call on medium screens */}
          <a
            href={`tel:${DEMO_PHONE_TEL}`}
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 md:inline-flex xl:hidden"
          >
            <Phone size={15} />
            <span className="hidden lg:inline">{DEMO_PHONE}</span>
            <span className="lg:hidden">Call</span>
          </a>

          {/* Icon-only call on small screens */}
          <a
            href={`tel:${DEMO_PHONE_TEL}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm transition hover:opacity-90 md:hidden"
            aria-label={`Call ${DEMO_PHONE}`}
          >
            <Phone size={16} />
          </a>

          <ProfileMenu />

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 xl:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile / tablet dropdown */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white/95 backdrop-blur xl:hidden">
          <div className="space-y-1 px-5 py-4 sm:px-8 lg:px-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-primary/5 hover:text-brand-primary"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 xl:hidden">
              <HoursDropdown />
              <a
                href={`tel:${DEMO_PHONE_TEL}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-primary"
              >
                <Phone size={14} />
                {DEMO_PHONE}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
