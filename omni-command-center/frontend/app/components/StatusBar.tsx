"use client";

import { useState, useEffect } from "react";
import { Activity, Cpu, Database, Wifi } from "lucide-react";

interface SystemStats {
  angels: number;
  uptime: string;
  requests: number;
  responseTime: number;
}

export function StatusBar() {
  const [stats, setStats] = useState<SystemStats>({
    angels: 0,
    uptime: "0s",
    requests: 0,
    responseTime: 0
  });
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        setIsOnline(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar px-4 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Wifi className={`w-3 h-3 ${isOnline ? "text-green-400" : "text-red-400"}`} />
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3 text-blue-400" />
          <span>{stats.angels} Angels</span>
        </div>

        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3 text-yellow-400" />
          <span>Uptime: {stats.uptime}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Database className="w-3 h-3 text-purple-400" />
          <span>{stats.requests} zahtev</span>
        </div>

        <div className="flex items-center space-x-1">
          <span>Odziv: {stats.responseTime}ms</span>
        </div>

        <div className="text-gray-500">
          Omni Command Center v1.0
        </div>
      </div>
    </div>
  );
}