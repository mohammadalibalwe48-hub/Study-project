'use client';

import React from 'react';

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="liquid-glass p-6 rounded-3xl border border-white/10 space-y-4 animate-pulse"
        >
          <div className="h-6 w-2/3 bg-white/10 rounded-lg" />
          <div className="h-4 w-full bg-white/10 rounded-md" />
          <div className="h-4 w-4/5 bg-white/10 rounded-md" />
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <div className="h-8 w-24 bg-white/10 rounded-xl" />
            <div className="h-8 w-16 bg-white/10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="liquid-glass p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4 animate-pulse"
        >
          <div className="space-y-2 flex-1">
            <div className="h-5 w-1/3 bg-white/10 rounded-md" />
            <div className="h-4 w-2/3 bg-white/10 rounded-md" />
          </div>
          <div className="h-10 w-24 bg-white/10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="liquid-glass p-6 rounded-3xl border border-white/10 space-y-4 animate-pulse">
      <div className="h-8 w-1/4 bg-white/10 rounded-lg mb-6" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-white/10">
          <div className="h-5 w-1/4 bg-white/10 rounded-md" />
          <div className="h-5 w-1/3 bg-white/10 rounded-md" />
          <div className="h-8 w-20 bg-white/10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="liquid-glass p-8 rounded-3xl border border-white/10 space-y-4 animate-pulse">
        <div className="h-8 w-1/3 bg-white/10 rounded-lg" />
        <div className="h-4 w-1/2 bg-white/10 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="liquid-glass p-5 rounded-2xl border border-white/10 space-y-3 animate-pulse">
            <div className="h-4 w-1/2 bg-white/10 rounded-md" />
            <div className="h-8 w-3/4 bg-white/10 rounded-lg" />
          </div>
        ))}
      </div>

      <CardSkeleton count={3} />
    </div>
  );
}
