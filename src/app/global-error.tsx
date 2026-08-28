'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('ScoutDeck global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ alignItems: 'center', background: '#f6f3ea', color: '#1d2d3f', display: 'flex', fontFamily: 'Arial, sans-serif', justifyContent: 'center', margin: 0, minHeight: '100dvh', padding: '16px', textAlign: 'center' }}>
        <main style={{ background: '#fffdf7', border: '1px solid #b5c1b9', borderRadius: '28px', boxShadow: '0 10px 0 rgba(29,45,63,.06)', maxWidth: '520px', padding: '36px 28px', width: '100%' }}>
          <div aria-hidden="true" style={{ alignItems: 'center', background: '#f4d64e', borderRadius: '16px', color: '#153f38', display: 'flex', fontSize: '26px', height: '56px', justifyContent: 'center', margin: '0 auto', width: '56px' }}>↗</div>
          <p style={{ color: '#367a73', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', margin: '24px 0 0', textTransform: 'uppercase' }}>ScoutDeck is regrouping</p>
          <h1 style={{ fontSize: '28px', letterSpacing: '-0.04em', margin: '10px 0 0' }}>We couldn&rsquo;t load this view.</h1>
          <p style={{ color: '#52655e', fontSize: '15px', lineHeight: 1.6, margin: '14px auto 0', maxWidth: '360px' }}>Your information is still safe. Please try again; if it keeps happening, return to ScoutDeck from a fresh tab.</p>
          <button type="button" onClick={retry} style={{ background: '#367a73', border: 0, borderRadius: '999px', color: '#fffdf7', cursor: 'pointer', fontSize: '15px', fontWeight: 700, marginTop: '24px', minHeight: '44px', padding: '0 20px' }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
