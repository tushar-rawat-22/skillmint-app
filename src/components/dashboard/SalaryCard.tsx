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
    <div className="min-w-0 rounded-3xl bg-neutral-900 p-6 text-white">
      <p className="text-neutral-400">
        Estimated Salary
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        {formatINR(roundedSalary)}
      </h2>
    </div>
  );
}
