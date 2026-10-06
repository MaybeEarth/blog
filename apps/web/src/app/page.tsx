import { LOCALES } from '@blog/shared';

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
        Yüksek Performanslı Blog
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Desteklenen Diller: {LOCALES.map((l) => l.nativeName).join(', ')}
      </p>
    </main>
  );
}
