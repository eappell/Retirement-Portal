"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const VipPage: React.FC = () => {
  const router = useRouter();
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    const doVip = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '';
        const res = await fetch(`/api/vip?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setStatus('Unauthorized or invalid VIP token');
          return;
        }

        const tokenStr = data.token;
        if (!tokenStr) {
          setStatus('VIP endpoint did not return a token');
          return;
        }

        // Sign in with the custom token to create a real Firebase auth session
        try {
          const cred = await signInWithCustomToken(auth, tokenStr);
          const u = cred.user;
          const portalUser = { userId: u.uid, email: u.email || null, tier: 'paid', name: 'VIP User' };
          try {
            localStorage.setItem('portalUser', JSON.stringify(portalUser));
            localStorage.setItem('userRole', 'paid');
          } catch (err) {
            console.warn('Failed to write VIP localStorage after sign-in', err);
          }
          setStatus('VIP access granted — redirecting to dashboard...');
          setTimeout(() => router.push('/dashboard'), 600);
        } catch (err) {
          console.error('Failed to sign in with custom token', err);
          setStatus('Failed to sign in with VIP token');
        }
      } catch (err) {
        console.error('VIP error', err);
        setStatus('VIP failed: ' + String(err));
      }
    };
    doVip();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">VIP Access</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
        <p className="mt-4 text-xs text-gray-500">This route grants a temporary paid session for automation. Protect `VIP_TOKEN` in production.</p>
      </div>
    </div>
  );
};

export default VipPage;
