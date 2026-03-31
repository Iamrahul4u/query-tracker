import { PHASE_TWO_DASHBOARD_URL } from "../config/phase-two";

const migrationHighlights = [
  {
    title: "Phase 2 is now live",
    description:
      "The active Query Tracker experience has moved to the new dashboard.",
  },
  {
    title: "Phase 1 is retired",
    description:
      "This site no longer hosts the original sign-in flow or the legacy dashboard.",
  },
  {
    title: "Continue in the new app",
    description:
      "Use the Phase 2 workspace for all future query tracking and team updates.",
  },
];

export function PhaseTwoMigrationPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f7f3eb] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(26,115,232,0.16),_transparent_28%),linear-gradient(180deg,_#fffef9_0%,_#f7f3eb_100%)]" />
      <div className="absolute left-[-6rem] top-20 h-40 w-40 rounded-full bg-google-yellow/35 blur-3xl" />
      <div className="absolute bottom-16 right-[-4rem] h-52 w-52 rounded-full bg-google-blue/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="flex flex-col justify-center gap-8">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-google-green" />
              Query Tracker Phase 2
            </div>

            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
                Migration Update
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                We&apos;ve moved Query Tracker to Phase 2.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                The Phase 1 website has been retired. Continue in the new app
                to access the current dashboard, latest workflow updates, and
                ongoing query activity.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={PHASE_TWO_DASHBOARD_URL}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-950/15 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Open Query Tracker Phase 2
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </a>
              <p className="text-sm text-slate-500">
                You&apos;ll open the new dashboard in this tab.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-xl shadow-amber-100/40 backdrop-blur">
              <p className="text-sm font-semibold text-slate-700">
                Direct link
              </p>
              <a
                href={PHASE_TWO_DASHBOARD_URL}
                className="mt-3 block break-all text-sm text-google-blue underline decoration-google-blue/35 underline-offset-4 transition hover:text-blue-700"
              >
                {PHASE_TWO_DASHBOARD_URL}
              </a>
            </div>
          </section>

          <aside className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,168,83,0.28),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.06)_0%,_rgba(255,255,255,0)_45%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/60">
                  What Changed
                </p>
                <h2 className="text-2xl font-semibold leading-tight">
                  Phase 2 is now the only active Query Tracker experience.
                </h2>
                <p className="text-sm leading-6 text-white/70">
                  If you bookmarked an old page or returned to the retired app,
                  use the new dashboard link here to continue.
                </p>
              </div>

              <div className="space-y-4">
                {migrationHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-base font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-sm leading-6 text-white/65">
                Bookmark the Phase 2 dashboard if you visit Query Tracker
                regularly.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
