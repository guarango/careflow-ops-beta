import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
      {/* On mobile: leave room for the hamburger (44px wide + gap) */}
      <div className="pl-14 sm:pl-0 min-w-0">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 pl-14 sm:pl-0">
          {action}
        </div>
      )}
    </div>
  );
}