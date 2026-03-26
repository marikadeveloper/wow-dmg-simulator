import { useState, useCallback, useMemo } from 'react';
import ProfileImport from './components/ProfileImport';
import GearPanel from './components/GearPanel';
import SimSettingsPanel, { DEFAULT_SIM_SETTINGS } from './components/SimSettingsPanel';
import { validateSimInput } from './lib/validate-sim-input';
import type { SimcProfile } from './lib/types';

function App() {
  const [profile, setProfile] = useState<SimcProfile | null>(null);
  const [simSettings, setSimSettings] = useState(DEFAULT_SIM_SETTINGS);

  const handleProfileParsed = useCallback((p: SimcProfile | null) => {
    setProfile(p);
  }, []);

  const validationIssues = useMemo(
    () => (profile ? validateSimInput(profile, simSettings) : []),
    [profile, simSettings],
  );

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

        {/* Zone 2 — Gear & Optimization Panel */}
        {profile && (
          <section className="mb-8">
            <GearPanel profile={profile} />
          </section>
        )}

        {/* Zone 3 — Simulation Settings + Run Controls */}
        {profile && (
          <section className="mb-8">
            <SimSettingsPanel
              settings={simSettings}
              onSettingsChange={setSimSettings}
            />

            {/* Validation messages */}
            {validationIssues.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {validationIssues.map((issue, i) => (
                  <div
                    key={i}
                    className={[
                      'flex items-start gap-2 px-3 py-2 rounded-md text-xs leading-snug',
                      issue.severity === 'error'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : 'bg-amber-500/8 border border-amber-500/15 text-amber-300/90',
                    ].join(' ')}
                  >
                    <svg
                      className="mt-0.5 shrink-0"
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      fill="none"
                    >
                      {issue.severity === 'error' ? (
                        <>
                          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1" />
                          <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="6.5" cy="9" r="0.6" fill="currentColor" />
                        </>
                      ) : (
                        <>
                          <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                          <path d="M6.5 5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="6.5" cy="9.2" r="0.6" fill="currentColor" />
                        </>
                      )}
                    </svg>
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
