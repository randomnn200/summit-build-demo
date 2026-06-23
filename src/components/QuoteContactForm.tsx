"use client";

import { useState } from "react";
import { formatPhone } from "../lib/formatPhone";
import { isFirebaseConfigured } from "../lib/firebase/firebase";
import { addQuoteRequest } from "../lib/firebase/firebaseUtils";

export default function QuoteContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!isFirebaseConfigured) {
      setError("Quote requests aren't set up yet. Add Firebase config to .env.local.");
      return;
    }

    setSubmitting(true);
    try {
      await addQuoteRequest({ name: name.trim(), phone });
      setName("");
      setPhone("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error(err);
      setError("Couldn't submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-md">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="profile-input flex-1"
          disabled={submitting}
        />
        <input
          type="tel"
          placeholder="(555) 555-5555"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className="profile-input flex-1"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Request Quote"}
        </button>
      </form>
      {submitted && (
        <p className="mt-3 text-sm font-medium text-brand-primary">
          Thanks! Our team will reach out within one business day.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
