import { useState, useCallback } from 'react';
import ProfileImport from './components/ProfileImport';
import type { SimcProfile } from './lib/types';

function App() {
  const [profile, setProfile] = useState<SimcProfile | null>(null);

  const handleProfileParsed = useCallback((p: SimcProfile | null) => {
    setProfile(p);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* App header */}
        <header className="mb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-amber-50">
              Top Gear
            </h1>
            <span className="text-xs text-zinc-600 font-medium">
              Local SimC
            </span>
          </div>
        </header>

        {/* Zone 1 — Character Import */}
        <section className="mb-8">
          <ProfileImport onProfileParsed={handleProfileParsed} />
        </section>

        {/* Zone 2 — Gear & Optimization (placeholder) */}
        {profile && (
          <section className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-5 py-6">
            <p className="text-sm text-zinc-500">
              Gear optimization panel will appear here.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
