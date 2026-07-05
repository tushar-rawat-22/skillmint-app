"use client";

import { useState } from "react";

import { saveUpgradeInterest } from "@/modules/activation/storage/upgradeInterestStorage";
import type { UpgradeInterestSource } from "@/modules/activation/types";

type UpgradeInterestCardProps = {
  source: UpgradeInterestSource;
  title?: string;
  body?: string;
  cta?: string;
};

export default function UpgradeInterestCard({
  source,
  title = "Want deeper guidance?",
  body =
    "SkillMint is free during beta. Paid beta interest helps shape Pro fixes, coaching-ready plans, and deeper proof reviews.",
  cta = "I would pay for deeper guidance",
}: UpgradeInterestCardProps) {
  const [message, setMessage] = useState("");

  function handleClick() {
    const record = saveUpgradeInterest({
      source,
      label: cta,
    });

    setMessage(
      record
        ? "Interest saved. Paid beta is not open yet."
        : "Could not save interest in this browser right now.",
    );
  }

  return (
    <article className="rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-black/20 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
        Free beta
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-green-50/80">
            {body}
          </p>

          {message && (
            <p className="mt-3 text-sm font-semibold text-green-200">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="w-fit rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
        >
          {cta}
        </button>
      </div>
    </article>
  );
}
