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
    "SkillMint is free during beta. Paid plans are not required for this report. Paid beta interest only helps shape Pro fixes, coaching-ready plans, and deeper proof reviews.",
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
    <article className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.09),rgba(15,23,42,0.78))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
        Free beta
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
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
          className="w-fit rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15"
        >
          {cta}
        </button>
      </div>
    </article>
  );
}
