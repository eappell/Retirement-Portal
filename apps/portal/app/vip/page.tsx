"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

        const user = data.user;

        // Persist portalUser and userRole for same-origin access
        try {
          localStorage.setItem('portalUser', JSON.stringify(user));
          localStorage.setItem('userRole', user.tier || 'paid');
        } catch (err) {
          console.warn('Failed to write VIP localStorage', err);
        }

        setStatus('VIP access granted — redirecting to dashboard...');
        // Slight delay so UI updates before redirect
        setTimeout(() => router.push('/dashboard'), 600);
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
