type Props = {
  file: File;
  remove: () => void;
};

export default function FileCard({
  file,
  remove,
}: Props) {
  return (
    <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words font-bold">
            {file.name}
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <button
          onClick={remove}
          className="w-fit rounded-xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
        >
          Remove
        </button>
      </div>
    </section>
  );
}
