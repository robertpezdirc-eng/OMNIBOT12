"use client";

import { useState } from "react";
import { Send, Terminal } from "lucide-react";

interface CommandInputProps {
  onSend: (command: string) => void;
}

export function CommandInput({ onSend }: CommandInputProps) {
  const [command, setCommand] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSend(command.trim());
      setCommand("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="flex-1 relative">
        <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Vnesite ukaz za Omni sistem..."
          className="w-full pl-10 pr-4 py-3 command-input rounded-lg border focus:outline-none focus:ring-2 transition-all"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={!command.trim() || isLoading}
        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
      >
        <Send className="w-4 h-4" />
        <span>{isLoading ? "Izvajam..." : "Pošlji"}</span>
      </button>
    </form>
  );
}