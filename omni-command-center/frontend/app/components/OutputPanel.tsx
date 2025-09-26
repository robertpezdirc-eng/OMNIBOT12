"use client";

import { AngelCard } from "./AngelCard";
import { CheckCircle, XCircle, Clock, Terminal } from "lucide-react";

interface CommandResult {
  id: number;
  command: string;
  result?: any;
  error?: string;
  timestamp: string;
  angel?: string;
  status?: "success" | "error" | "pending";
}

interface OutputPanelProps {
  results: CommandResult[];
}

export function OutputPanel({ results }: OutputPanelProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Terminal className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Omni Command Center</h2>
        <p className="text-center max-w-md">
          Dobrodošli v Omni Command Center. Vnesite ukaz spodaj za začetek dela z Angel sistemi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div key={result.id} className="output-card">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm text-blue-400">
                {result.command}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {result.status === "success" && <CheckCircle className="w-4 h-4 text-green-400" />}
              {result.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
              {result.status === "pending" && <Clock className="w-4 h-4 text-yellow-400" />}
              <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {result.error ? (
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <p className="text-red-400 text-sm">{result.error}</p>
            </div>
          ) : result.result ? (
            <div className="space-y-2">
              {result.angel && (
                <AngelCard
                  name={result.angel}
                  status="active"
                  data={result.result}
                />
              )}
              {typeof result.result === "string" ? (
                <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                  {result.result}
                </pre>
              ) : (
                <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-yellow-400">
              <Clock className="w-4 h-4 animate-spin" />
              <span className="text-sm">Izvajam ukaz...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}