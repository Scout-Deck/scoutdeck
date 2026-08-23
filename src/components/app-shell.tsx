'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, Plus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmitOpportunityModal } from '@/components/submit-opportunity-modal';

type AppShellProps = { children: ReactNode };

const navItems = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/profile', label: 'Your profile', icon: UserRound },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [submitOpen, setSubmitOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="grain min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 text-sidebar-foreground md:flex">
        <Link href="/" className="focus-ring mb-12 flex items-center gap-3 rounded-lg" data-testid="link-brand">
          <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[4px_4px_0_hsl(var(--sidebar-border))]">
            <Compass size={21} strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-[-0.04em] text-[1.25rem]">ScoutDeck</span>
        </Link>
        <div className="mb-3 px-3 font-mono-label text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">Your workspace</div>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
              className={cn(
                'focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-[background,color,transform] duration-200',
                isActive(href) ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/62 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
              )}
            >
              <Icon size={18} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              {label}
              {href === '/saved' && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono-label text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/55">Scout signal</span>
            <span className="scout-pulse size-2 rounded-full bg-sidebar-primary" />
          </div>
          <p className="text-[13px] leading-relaxed text-sidebar-foreground/75">A smaller list can take you further. Keep your profile honest.</p>
        </div>
      </aside>

      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-5 py-4 backdrop-blur-xl md:px-10 md:py-5">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between">
            <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg md:hidden" data-testid="link-mobile-brand">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Compass size={18} /></span>
              <span className="font-semibold tracking-[-0.04em]">ScoutDeck</span>
            </Link>
            <div className="hidden md:block">
              <span className="font-mono-label text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Opportunity intelligence / 2025</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-accent-foreground shadow-[3px_3px_0_hsl(var(--foreground)/.12)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              data-testid="button-open-submit"
            >
              <Plus size={15} strokeWidth={2.5} /> Share an opportunity
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-5 pb-28 pt-8 md:px-10 md:pb-12 md:pt-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-sm items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`} className={cn('focus-ring flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium', isActive(href) ? 'text-primary' : 'text-muted-foreground')}>
              <Icon size={19} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              {label === 'Your profile' ? 'Profile' : label}
            </Link>
          ))}
        </div>
      </nav>
      <SubmitOpportunityModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
