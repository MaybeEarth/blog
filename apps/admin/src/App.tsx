import { LOCALES } from '@blog/shared';

export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold">Blog Yönetim Paneli</h1>
      <p className="mt-2 text-neutral-400">
        Yönetilen diller: {LOCALES.map((l) => `${l.name} (${l.code})`).join(', ')}
      </p>
    </div>
  );
}
