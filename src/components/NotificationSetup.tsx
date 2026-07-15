"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscription,
  deletePushSubscription,
  setReminderPref,
  getMyReminderMinute,
} from "@/lib/actions";

// VAPID public key must be exposed to the browser to subscribe (safe to expose).
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const DEFAULT_MINUTE = 20 * 60; // 8:00 PM

type Status = "loading" | "unsupported" | "unconfigured" | "off" | "on" | "denied";

// 30-min slots for the whole day, as { minute, label } for the picker.
const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const minute = i * 30;
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 < 12 ? "AM" : "PM";
  return { minute, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` };
});

// Web Push wants the applicationServerKey as bytes, not the base64url string.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Register the SW on demand and resolve once it's active (works in dev + prod,
// independent of ServiceWorkerRegister which only auto-registers in production).
async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  if (reg.active) return reg;
  await new Promise<void>((resolve) => {
    const sw = reg.installing || reg.waiting;
    if (!sw) return resolve();
    sw.addEventListener("statechange", () => {
      if (sw.state === "activated") resolve();
    });
  });
  return reg;
}

function myTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";
  } catch {
    return "Asia/Singapore";
  }
}

export default function NotificationSetup() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [minute, setMinute] = useState<number>(DEFAULT_MINUTE);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) return setStatus("unsupported");
    if (!VAPID_PUBLIC_KEY) return setStatus("unconfigured");
    if (Notification.permission === "denied") return setStatus("denied");

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (sub) => {
        if (sub) {
          const saved = await getMyReminderMinute();
          if (saved != null) setMinute(saved);
          setStatus("on");
        } else {
          setStatus("off");
        }
      })
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await getActiveRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!res.ok) {
        await sub.unsubscribe();
        setStatus("off");
        return;
      }
      // Seed the reminder time (default 8pm) + this phone's timezone.
      await setReminderPref({ minute, timezone: myTimezone() });
      setStatus("on");
    } catch (err) {
      console.error("Enabling reminders failed:", err);
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      await setReminderPref({ minute: null }); // clear the time too
      setStatus("off");
    } catch (err) {
      console.error("Disabling reminders failed:", err);
    } finally {
      setBusy(false);
    }
  }

  async function changeTime(next: number) {
    setMinute(next);
    await setReminderPref({ minute: next, timezone: myTimezone() });
  }

  if (status === "loading" || status === "unsupported" || status === "unconfigured") {
    // Silently hide when unsupported/unconfigured — nothing actionable to show.
    return null;
  }

  return (
    <div className="reminder-card">
      <div className="reminder-text">
        <strong>Daily reminders</strong>
        <span>
          {status === "on"
            ? "On — we'll nudge you at this time if you haven't checked in."
            : status === "denied"
              ? "Blocked in your browser settings. Allow notifications for this site to turn them on."
              : "Get a daily nudge to keep your streak alive."}
        </span>
      </div>
      <div className="reminder-controls">
        {status === "on" && (
          <select
            className="reminder-time"
            value={minute}
            onChange={(e) => changeTime(Number(e.target.value))}
            disabled={busy}
            aria-label="Reminder time"
          >
            {SLOTS.map((s) => (
              <option key={s.minute} value={s.minute}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        {status === "on" ? (
          <button className="btn ghost" onClick={disable} disabled={busy}>
            {busy ? "…" : "Turn off"}
          </button>
        ) : status === "denied" ? null : (
          <button className="btn" onClick={enable} disabled={busy}>
            {busy ? "Enabling…" : "Enable"}
          </button>
        )}
      </div>
    </div>
  );
}
