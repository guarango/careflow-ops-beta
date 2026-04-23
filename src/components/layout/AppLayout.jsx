import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

// Sidebar widths:
//   mobile  (<768px): 0 (hidden, overlay)
//   tablet  (768–1024px): 64px (collapsed icon-only)
//   desktop (>1024px): 240px (full)

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      {/* Offset main content based on sidebar width at each breakpoint */}
      <main className="min-h-screen transition-all duration-300
        ml-0
        md:ml-[64px]
        lg:ml-[240px]
      ">
        <div className="px-3 py-4 md:px-4 md:py-6 lg:px-6 lg:py-8 max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}