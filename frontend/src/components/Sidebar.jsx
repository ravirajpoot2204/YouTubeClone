"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, Clock, Film, Gamepad2, Music2, Trophy, Lightbulb } from "lucide-react";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Flame, label: "Trending", href: "/trending" },
  { icon: Clock, label: "Recent", href: "/recent" },
  { icon: Film, label: "Movies", href: "/category/movies" },
  { icon: Gamepad2, label: "Gaming", href: "/category/gaming" },
  { icon: Music2, label: "Music", href: "/category/music" },
  { icon: Trophy, label: "Sports", href: "/category/sports" },
  { icon: Lightbulb, label: "Education", href: "/category/education" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-screen p-3">
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
                text-gray-700 hover:bg-gray-100 hover:text-gray-900
                ${isActive ? "bg-gray-200 text-gray-900 font-semibold" : ""}
              `}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}