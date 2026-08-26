'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, Compass, LogOut, Plus } from 'lucide-react';
import { SubmitOpportunityModal } from '@/components/submit-opportunity-modal';
import { createClient } from '@/lib/supabase/client';

const navigation = [{ href: '/dashboard', label: 'Signal field', icon: Compass }, { href: '/saved', label: 'Saved routes', icon: Bookmark }];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [submitOpen, setSubmitOpen] = useState(false);
  if (pathname === '/' || pathname === '/login' || pathname === '/auth/confirm') return <>{children}</>;
  const signOut = async () => { await createClient().auth.signOut(); router.replace('/login'); router.refresh(); };
  return <div className="min-h-dvh bg-background"><header className="border-b border-border bg-background"><div className="mx-auto flex h-[82px] max-w-[1370px] items-center justify-between px-5 md:px-8"><Link href="/dashboard" className="focus-ring flex items-center gap-2.5"><span className="grid size-7 place-items-center rounded-full bg-primary"><Compass size={15} /></span><span className="text-lg font-bold tracking-[-.06em]">Scout<span className="text-[#486257]">Deck</span></span></Link><nav className="hidden items-center gap-6 md:flex">{navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`focus-ring signal-label flex items-center gap-2 border-b-2 py-2 ${pathname.startsWith(href) ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Icon size={14} />{label}</Link>)}</nav><div className="flex items-center gap-2"><button type="button" onClick={() => setSubmitOpen(true)} className="focus-ring hidden h-10 items-center gap-2 bg-primary px-3 text-xs font-semibold sm:flex"><Plus size={15} /> Add a route</button><button type="button" onClick={signOut} className="focus-ring grid size-10 place-items-center border border-border text-muted-foreground hover:text-foreground" aria-label="Sign out"><LogOut size={15} /></button></div></div></header><main className="mx-auto max-w-[1170px] px-5 py-12 md:px-8 md:py-16">{children}</main><SubmitOpportunityModal open={submitOpen} onOpenChange={setSubmitOpen} /></div>;
}
