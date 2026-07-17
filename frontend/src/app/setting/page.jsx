"use client";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [channel, setChannel] = useState(null);
  const [activeTab, setActiveTab] = useState("general"); // general | channel | payments
  const [message, setMessage] = useState(null);

  // UPI states
  const [upiId, setUpiId] = useState("");
  const [utr, setUtr] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);

  useEffect(() => {
    api.get("/channels/my-channel").then(res => {
      const ch = res.data.channel;
      setChannel(ch);
      setUpiId(ch.upiId || "");
    }).catch(err => console.error("Failed to load channel", err));
  }, []);
  const [pin, setPin] = useState('');
const [pinMessage, setPinMessage] = useState(null);

const handleSavePin = async (e) => {
  if (e) e.preventDefault();
  try {
    await api.put('/users/pin', { pin });
    setPinMessage({ type: 'success', text: 'Security PIN saved.' });
    setPin('');
  } catch (err) {
    setPinMessage({ type: 'error', text: 'Failed to save PIN' });
  }
};

  // UPI handlers (identical to channel page)
  const handleSaveUpi = async () => {
    setSavingUpi(true);
    try {
      await api.put("/channels/upi", { upiId });
      setMessage({ type: "success", text: "UPI ID saved." });
      setChannel(prev => ({ ...prev, upiId, upiVerified: false }));
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save UPI ID" });
    } finally {
      setSavingUpi(false);
    }
  };

  const handleVerifyUpi = async () => {
    if (!utr.trim()) return;
    setSubmittingUtr(true);
    try {
      await api.post("/channels/verify-upi", { utr });
      setMessage({ type: "success", text: "Verification request submitted." });
      setUtr("");
    } catch (err) {
      setMessage({ type: "error", text: "Failed to submit UTR" });
    } finally {
      setSubmittingUtr(false);
    }
  };

  if (!channel) return <div className="p-8 text-center text-gray-900">Loading settings…</div>;

  const tabs = [
    { key: "general", label: "General" },
    { key: "channel", label: "Channel" },
    { key: "payments", label: "Payments" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">General Settings</h2>
          <p className="text-gray-500">Dark mode, language, and other preferences will appear here.</p>
          {/* Example: toggle dark mode later */}
        </div>
      )}

      {/* Channel Tab */}
      {activeTab === "channel" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Channel Settings</h2>
          <p className="text-gray-500">Edit your channel name, description, and avatar.</p>
          {/* Reuse your channel update form here */}
        </div>
      )}
      <div className="mt-6">
  <h3 className="text-lg font-medium">Security PIN</h3>
  <p className="text-sm text-gray-500 mb-2">
    Set a 4‑digit PIN for deleting videos and other sensitive actions.
  </p>
  <div className="flex gap-2">
    <input
      type="password"
      maxLength={4}
      value={pin}
      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
      className="border rounded px-3 py-2 w-24 text-center text-lg"
      placeholder="****"
    />
    <button
      type="button"                               // ← prevent accidental form submission
      onClick={handleSavePin}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Save PIN
    </button>
  </div>
  {pinMessage && (
    <p className={`text-sm mt-1 ${pinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
      {pinMessage.text}
    </p>
  )}
</div>

      {/* Payments Tab (UPI) */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Super Chat Payments</h2>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 flex-1 text-gray-900"
            />
            <button
              onClick={handleSaveUpi}
              disabled={savingUpi}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {savingUpi ? "Saving…" : "Save UPI ID"}
            </button>
          </div>

          {/* Verification section */}
          {channel.upiId && !channel.upiVerified && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-4">
              <p className="text-sm font-medium">Verify your UPI ID</p>
              <p className="text-xs text-gray-600 mt-1">
                Send ₹1 to <strong>your-admin-upi@okhdfcbank</strong> and enter the UTR below.
              </p>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="UTR number"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 flex-1 text-sm text-gray-900"
                />
                <button
                  onClick={handleVerifyUpi}
                  disabled={submittingUtr}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {submittingUtr ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          )}

          {channel.upiVerified && (
            <p className="text-green-600 text-sm mt-2">✅ UPI ID verified</p>
          )}

          {message && (
            <p className={`text-sm mt-2 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}