import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ClientLayout from "@/components/ClientLayout";

export const metadata = {
  title: "StreamApp - Video Streaming Platform",
  description: "Watch, upload, and stream videos. Live streaming with chat.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout>
          <Navbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 bg-gray-50 min-h-screen">
              {children}
            </main>
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}