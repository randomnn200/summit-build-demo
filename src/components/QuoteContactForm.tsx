"use client";

import { useState } from "react";
import { formatPhone } from "../lib/formatPhone";

const GREEN = "#006847";

export default function QuoteContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <form
      className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        placeholder="Phone number"
        className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900"
      />
      <button
        type="submit"
        className="rounded-md px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
        style={{ backgroundColor: GREEN }}
      >
        Get Quote
      </button>
    </form>
  );
}
