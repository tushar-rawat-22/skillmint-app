type Props = {
  file: File;
  remove: () => void;
};

export default function FileCard({
  file,
  remove,
}: Props) {

  return (

    <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-gray-700 bg-neutral-900 p-6">

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
          className="rounded-xl bg-red-600 px-5 py-2 text-white"
        >
          Remove
        </button>

      </div>

    </section>

  );

}