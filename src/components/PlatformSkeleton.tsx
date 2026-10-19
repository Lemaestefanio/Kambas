import React from 'react';

/** A neutral layout placeholder: no profile images, catalogue data or listeners. */
export function PlatformSkeleton() {
  return (
    <main className="mx-auto min-h-screen max-w-[600px] bg-white text-slate-900 shadow-xl sm:border-x sm:border-slate-200" role="status" aria-label="A preparar o perfil" aria-busy="true">
      <div aria-hidden="true">
        <div className="flex h-[62px] items-center justify-between bg-[#090d14] px-3.5">
          <img src="/assets/platform-logo.png" alt="" width="180" height="60" decoding="async" className="w-[156px] rounded-md object-contain sm:w-[180px]" />
          <div className="h-7 w-20 rounded-full bg-slate-700/70" />
        </div>
        <div className="flex h-[54px] items-center gap-3 border-b border-slate-100 px-3.5">
          <div className="h-8 w-8 rounded-full bg-slate-200" />
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="ml-auto h-7 w-7 rounded-full bg-slate-100" />
        </div>
        <div className="flex justify-between gap-3 overflow-hidden border-b border-slate-100 px-4 py-4">
          {[0, 1, 2, 3, 4].map(index => <div key={index} className="flex shrink-0 flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-slate-100 ring-2 ring-slate-100 ring-offset-2" />
            <div className="h-2 w-10 rounded-full bg-slate-100" />
          </div>)}
        </div>
        <div className="h-[190px] bg-slate-100 sm:h-[220px]" />
        <div className="relative space-y-4 px-4 pb-8 motion-safe:animate-pulse">
          <div className="flex items-end justify-between">
            <div className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-slate-200" />
            <div className="mb-1 h-9 w-32 rounded-full bg-sky-100" />
          </div>
          <div className="space-y-2"><div className="h-5 w-40 rounded-full bg-slate-200" /><div className="h-3 w-52 rounded-full bg-slate-100" /></div>
          <div className="grid h-14 grid-cols-4 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">{[0, 1, 2, 3].map(index => <div key={index} className="rounded-full bg-slate-200/60" />)}</div>
          <div className="space-y-2"><div className="h-3 w-full rounded-full bg-slate-100" /><div className="h-3 w-4/5 rounded-full bg-slate-100" /></div>
          <div className="h-12 rounded-xl bg-sky-100/70" />
        </div>
      </div>
    </main>
  );
}
