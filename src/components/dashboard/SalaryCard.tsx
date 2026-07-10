type Props = {
  salary: number;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SalaryCard({ salary }: Props) {
  const roundedSalary = Math.round(salary);

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Estimated Salary
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {formatINR(roundedSalary)}
      </h2>
    </div>
  );
}
