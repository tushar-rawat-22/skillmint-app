"use client";

import { useState } from "react";

import {
  premiumSecondaryCta,
} from "@/components/ui/premium";
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Free beta
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {body}
          </p>

          {message && (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClick}
          className={`${premiumSecondaryCta} w-fit`}
        >
          {cta}
        </button>
      </div>
    </article>
  );
}
