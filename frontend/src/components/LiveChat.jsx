"use client";
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import Image from "next/image";
import { jwtDecode } from 'jwt-decode';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function LiveChat({ streamId }) {
  const { token, user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState(null);
  const chatEndRef = useRef(null);
  const [superChatMode, setSuperChatMode] = useState(false);
  const [superAmount, setSuperAmount] = useState(5);

  // Helper to get current userId (from store or token)
  const getUserId = () => {
    if (user?._id) return user._id;
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded.id || decoded._id;
    } catch {
      return null;
    }
  };
  useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  document.body.appendChild(script);
  return () => document.body.removeChild(script);
}, []);

  // Fetch chat history on mount
  useEffect(() => {
    api.get(`/chat/${streamId}`).then(res => setMessages(res.data.messages));
  }, [streamId]);

  // Connect to WebSocket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.emit("join-stream", streamId);

    newSocket.on("new-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    newSocket.on("new-superchat", (msg) => {
        console.log('📬 Received new-superchat:', msg);
  setMessages((prev) => [...prev, msg]);
});


    newSocket.on("superchat", (msg) => {
      // Superchats will also arrive via "new-message" because the backend
      // emits "new-message" for all messages. However, it also emits
      // "superchat" separately – you can use this to highlight them.
      // For simplicity we just let them appear as regular messages.
    });

    newSocket.on("error", (err) => {
      console.error("Chat error:", err.message);
    });

    return () => {
      newSocket.emit("leave-stream", streamId);
      newSocket.disconnect();
    };
  }, [streamId]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

 const handleSend = async (e) => {
  e.preventDefault();
  if (!input.trim() || !token) return;

  const userId = getUserId();
  if (!userId) return;

  if (superChatMode) {
    // 1. Create Razorpay order
    try {
      const { data } = await api.post('/payment/create-order', {
        amount: superAmount,
        currency: 'INR',
        receipt: `superchat_${Date.now()}`,
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,  // your key_id (public)
        amount: data.order.amount,                     // in paise
        currency: 'INR',
        name: 'StreamApp',
        description: 'Super Chat',
        order_id: data.order.id,
        handler: async (response) => {
          // 2. Verify payment on backend
          try {
            await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 3. Payment verified → emit superchat
            socket?.emit("send-superchat", {
              streamId,
              message: input,
              userId,
              amount: superAmount,
              color: "#FF0000",
            });

            setInput("");
            setSuperChatMode(false);
          } catch (err) {
            console.error('Payment verification failed', err);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#3399cc' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('Order creation failed', err);
    }
  } else {
    // Regular message (unchanged)
    socket?.emit("send-message", { streamId, message: input, userId });
    setInput("");
  }
};

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 border-l border-gray-200">
      <div className="p-3 border-b font-semibold text-gray-800">Live Chat</div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex gap-2 ${msg.type === 'superchat' ? 'bg-yellow-50 p-1 rounded' : ''}`}>
            <Image
              src={msg.user?.avatar || "/default-avatar.png"}
              alt={msg.user?.name || "User"}
              width={28}
              height={28}
              className="rounded-full mt-1"
            />
            <div>
              <span className="font-semibold text-sm text-gray-900">
                {msg.user?.name || "User"}
              </span>
              {msg.type === 'superchat' && (
                <span className="text-xs text-yellow-600 ml-1">
                  Super Chat ₹{msg.superChatAmount}
                </span>
              )}
              <p className="text-sm text-gray-800">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={token ? "Type a message..." : "Log in to chat"}
            disabled={!token}
            className="flex-1 border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-900 placeholder-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!token || !input.trim()}
            className="bg-blue-600 text-white rounded-full px-4 py-1 text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition"
          >
            Send
          </button>
        </div>

        {token && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-700">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={superChatMode}
                onChange={(e) => setSuperChatMode(e.target.checked)}
                className="accent-blue-600"
              />
              Super Chat
            </label>
            {superChatMode && (
              <input
                type="number"
                value={superAmount}
                onChange={(e) => setSuperAmount(Number(e.target.value))}
                className="w-16 border border-gray-300 rounded px-1 text-sm text-gray-900"
                min="1"
              />
            )}
          </div>
        )}
      </form>
    </div>
  );
}