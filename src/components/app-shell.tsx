'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, Compass, LogOut, Plus } from 'lucide-react';
import { SubmitOpportunityModal } from '@/components/submit-opportunity-modal';
import { createClient } from '@/lib/supabase/client';

const navigation = [{ href: '/dashboard', label: 'Signal field', icon: Compass }, { href: '/saved', label: 'Saved routes', icon: Bookmark }];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [submitOpen, setSubmitOpen] = useState(false);
  if (pathname === '/' || pathname === '/login' || pathname === '/guest' || pathname === '/auth/confirm') return <>{children}</>;
  const signOut = async () => { await createClient().auth.signOut(); router.replace('/login'); router.refresh(); };
  return <div className="min-h-dvh bg-background"><header className="border-b border-border bg-background"><div className="mx-auto flex min-h-[68px] max-w-[1370px] items-center justify-between gap-3 px-4 sm:px-5 md:h-[82px] md:px-8"><Link href="/dashboard" className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg"><Image src="/icon.jpg" alt="" width={40} height={40} className="size-9 shrink-0 sm:size-10" priority /><span className="truncate text-lg font-bold tracking-[-.06em]">Scout<span className="text-[#486257]">Deck</span></span></Link><nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className={`focus-ring signal-label flex items-center gap-2 border-b-2 py-2 ${pathname.startsWith(href) ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Icon size={14} aria-hidden="true" />{label}</Link>)}</nav><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => setSubmitOpen(true)} className="focus-ring inline-flex size-11 items-center justify-center gap-2 bg-primary text-xs font-semibold sm:w-auto sm:px-3" aria-label="Add a route"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Add a route</span></button><button type="button" onClick={signOut} className="focus-ring grid size-11 place-items-center border border-border text-muted-foreground hover:text-foreground" aria-label="Sign out"><LogOut size={16} aria-hidden="true" /></button></div></div><nav className="mx-auto grid max-w-[1370px] grid-cols-2 gap-2 border-t border-border px-4 py-2 md:hidden" aria-label="Primary navigation">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className={`focus-ring flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors ${pathname.startsWith(href) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon size={16} aria-hidden="true" />{label}</Link>)}</nav></header><main className="mx-auto max-w-[1170px] px-4 py-7 sm:px-5 sm:py-10 md:px-8 md:py-16">{children}</main><SubmitOpportunityModal open={submitOpen} onOpenChange={setSubmitOpen} /></div>;
}
