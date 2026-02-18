"use client";

import { useEffect, useState } from "react";

import {
  getStoredSecretKey,
  setStoredSecretKey,
} from "@/lib/secret-key";

export function SecretGate(props: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredSecretKey()) setUnlocked(true);
  }, []);

  const handleUnlock = () => {
    const trimmed = secret.trim();
    if (!trimmed) {
      setError("Enter a secret key.");
      return;
    }
    setStoredSecretKey(trimmed);
    setError(null);
    setUnlocked(true);
  };

  if (unlocked) return <>{props.children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Enter secret key
        </h2>
        <input
          type="password"
          value={secret}
          onChange={(e) => {
            setSecret(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          placeholder="Secret key"
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          autoFocus
        />
        {error ? (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={handleUnlock}
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
