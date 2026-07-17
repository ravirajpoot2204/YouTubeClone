"use client";
import { useState } from "react";

export default function ConfirmPinModal({ isOpen, onClose, onConfirm }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    setError(null);
    try {
      // Let the parent handle the API call – just pass the PIN
      await onConfirm(pin);
      setPin("");
      onClose();
    } catch (err) {
      setError("Wrong PIN. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-3">Enter your security PIN</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your 4‑digit security PIN is required to delete this video.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-center text-2xl tracking-widest"
            placeholder="****"
            required
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}