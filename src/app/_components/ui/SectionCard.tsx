export function SectionCard(props: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}
