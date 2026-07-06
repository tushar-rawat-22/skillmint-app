type Props = {
  file: File;
  remove: () => void;
};

export default function FileCard({
  file,
  remove,
}: Props) {

  return (

    <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold">

            {file.name}

          </h3>

          <p className="mt-2 text-sm text-gray-400">

            {(file.size / 1024 / 1024).toFixed(2)} MB

          </p>

        </div>

        <button
          onClick={remove}
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-2 text-sm font-semibold text-red-100 transition hover:border-red-300 hover:bg-red-400/15"
        >
          Remove
        </button>

      </div>

    </section>

  );

}
