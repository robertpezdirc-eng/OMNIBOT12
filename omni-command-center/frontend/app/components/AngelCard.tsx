"use client";

import { Brain, TrendingUp, Eye, BookOpen, Activity } from "lucide-react";

interface AngelCardProps {
  name: string;
  status: "active" | "idle" | "error";
  data?: any;
}

const angelIcons = {
  learning: BookOpen,
  analytics: TrendingUp,
  growth: Activity,
  visionary: Eye,
  default: Brain
};

const statusColors = {
  active: "text-green-400 bg-green-400/10 border-green-400/20",
  idle: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  error: "text-red-400 bg-red-400/10 border-red-400/20"
};

export function AngelCard({ name, status, data }: AngelCardProps) {
  const IconComponent = angelIcons[name.toLowerCase() as keyof typeof angelIcons] || angelIcons.default;
  const statusClass = statusColors[status];

  return (
    <div className={`border rounded-lg p-4 ${statusClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5" />
          <h3 className="font-semibold capitalize">{name} Angel</h3>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            status === "active" ? "bg-green-400" :
            status === "idle" ? "bg-yellow-400" : "bg-red-400"
          }`} />
          <span className="text-xs capitalize">{status}</span>
        </div>
      </div>

      {data && (
        <div className="space-y-2">
          {typeof data === "string" ? (
            <p className="text-sm">{data}</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-400 capitalize">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-current/20">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Zadnja aktivnost</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}