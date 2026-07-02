type Props = {
  loading: boolean;
};

export default function AnalysisProgress({
  loading,
}: Props) {

  if (!loading) return null;

  return (

    <section className="mx-auto mt-12 max-w-5xl">

      <div className="rounded-3xl border border-green-500 bg-green-500/10 p-10">

        <h2 className="text-2xl font-bold">

          Analyzing Resume...

        </h2>

        <div className="mt-8 h-3 overflow-hidden rounded-full bg-neutral-800">

          <div className="h-full w-full animate-pulse bg-green-500" />

        </div>

        <p className="mt-6 text-gray-300">

          Parsing Resume

        </p>

      </div>

    </section>

  );

}