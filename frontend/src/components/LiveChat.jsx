"use client";
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import Image from "next/image";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export default function LiveChat({ streamId }) {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState(null);
  const chatEndRef = useRef(null);
  const [superChatMode, setSuperChatMode] = useState(false);
  const [superAmount, setSuperAmount] = useState(5);

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

    newSocket.on("superchat", (msg) => {
      // You can highlight superchats, or just let them appear as regular messages
      // They already have a type field, so the UI can differentiate
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !token) return;

    const payload = {
      streamId,
      content: input,
      token,
    };

    if (superChatMode) {
      payload.superChatAmount = superAmount;
    }

    socket?.emit("send-message", payload);
    setInput("");
    setSuperChatMode(false);
  };

  return (
    <div className="flex flex-col h-full border-l border-gray-200">
      <div className="p-3 border-b font-semibold">Live Chat</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex gap-2 ${msg.type === 'superchat' ? 'bg-yellow-50 p-1 rounded' : ''}`}>
            <Image
              src={msg.user?.avatar || "/default-avatar.png"}
              alt={msg.user?.name}
              width={28}
              height={28}
              className="rounded-full mt-1"
            />
            <div>
              <span className="font-semibold text-sm">{msg.user?.name}</span>
              {msg.type === 'superchat' && <span className="text-xs text-yellow-600 ml-1">Super Chat ₹{msg.superChatAmount}</span>}
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={token ? "Type a message..." : "Log in to chat"}
            disabled={!token}
            className="flex-1 border rounded-full px-3 py-1 text-sm"
          />
          <button type="submit" disabled={!token || !input.trim()} className="bg-blue-600 text-white rounded-full px-4 py-1 text-sm">
            Send
          </button>
        </div>
        {token && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={superChatMode} onChange={(e) => setSuperChatMode(e.target.checked)} />
              Super Chat
            </label>
            {superChatMode && (
              <input
                type="number"
                value={superAmount}
                onChange={(e) => setSuperAmount(Number(e.target.value))}
                className="w-16 border rounded px-1"
                min="1"
              />
            )}
          </div>
        )}
      </form>
    </div>
  );
}