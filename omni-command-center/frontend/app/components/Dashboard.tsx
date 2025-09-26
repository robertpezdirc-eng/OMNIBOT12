'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  ariaLabel?: string;
}

const MetricCard = ({ title, value, change, icon, color, ariaLabel }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card hover-glow"
    role="region"
    aria-labelledby={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="card-body">
      <div className="flex items-center justify-between">
        <div>
          <h3 
            id={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-sm font-medium text-gray-600"
          >
            {title}
          </h3>
          <p 
            className={`text-2xl font-bold ${color} mt-1`}
            aria-label={ariaLabel || `${title}: ${value}`}
          >
            {value}
          </p>
          <p className="text-sm text-gray-500 mt-1" aria-label={`Change: ${change}`}>
            {change}
          </p>
        </div>
        <div className={`text-3xl ${color.replace('text-', 'text-').replace('-600', '-500')}`} aria-hidden="true">
          {icon}
        </div>
      </div>
    </div>
  </motion.div>
);

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const PieChart = ({ data, title }: { data: ChartData[], title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  return (
    <div className="card hover-glow" role="region" aria-labelledby={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="card-header">
        <h3 id={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-lg font-semibold text-gray-800">
          {title}
        </h3>
      </div>
      <div className="card-body">
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg 
              className="w-full h-full transform -rotate-90" 
              viewBox="0 0 100 100"
              role="img"
              aria-labelledby={`chart-${title.toLowerCase().replace(/\s+/g, '-')}-desc`}
            >
              <title id={`chart-${title.toLowerCase().replace(/\s+/g, '-')}-desc`}>
                {title} distribution chart showing {data.map(item => `${item.name}: ${((item.value / total) * 100).toFixed(1)}%`).join(', ')}
              </title>
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = -cumulativePercentage;
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="15.915"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-in-out"
                  />
                );
              })}
            </svg>
          </div>
        </div>
        <div className="mt-6 space-y-3" role="list" aria-label={`${title} legend`}>
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between" role="listitem">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                ></div>
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <span 
                className="text-sm text-gray-600"
                aria-label={`${item.name}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`}
              >
                {item.value} ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LineChart = ({ title }: { title: string }) => {
  const data = [65, 78, 82, 75, 88, 92, 85, 90, 95, 88, 92, 96];
  const maxValue = Math.max(...data);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="card hover-glow" role="region" aria-labelledby={`line-chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="card-header">
        <h3 id={`line-chart-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-lg font-semibold text-gray-800">
          {title}
        </h3>
      </div>
      <div className="card-body">
        <div className="h-48">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
            role="img"
            aria-labelledby={`line-chart-${title.toLowerCase().replace(/\s+/g, '-')}-desc`}
          >
            <title id={`line-chart-${title.toLowerCase().replace(/\s+/g, '-')}-desc`}>
              {title} line chart showing performance over time with values ranging from {Math.min(...data)} to {Math.max(...data)}
            </title>
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={`0,100 ${points} 100,100`}
              fill="url(#gradient)"
              className="animate-fade-in"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="0.5"
              className="animate-slide-in"
            />
            {data.map((value, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - (value / maxValue) * 80;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="0.8"
                  fill="#3B82F6"
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              );
            })}
          </svg>
        </div>
        <div className="mt-4 flex justify-between text-xs text-gray-500" role="group" aria-label="Chart time labels">
          <span>Jan</span>
          <span>Mar</span>
          <span>May</span>
          <span>Jul</span>
          <span>Sep</span>
          <span>Nov</span>
        </div>
      </div>
    </div>
  );
};

const HealthMonitor = () => {
  const [healthData, setHealthData] = useState([
    { name: 'CPU Usage', value: 45, status: 'good', color: 'text-green-600' },
    { name: 'Memory', value: 67, status: 'warning', color: 'text-yellow-600' },
    { name: 'Storage', value: 23, status: 'good', color: 'text-green-600' },
    { name: 'Network', value: 89, status: 'critical', color: 'text-red-600' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthData(prev => prev.map(item => ({
        ...item,
        value: Math.max(10, Math.min(95, item.value + (Math.random() - 0.5) * 10))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card hover-glow" role="region" aria-labelledby="health-monitor-heading">
      <div className="card-header">
        <h3 id="health-monitor-heading" className="text-lg font-semibold text-gray-800">System Health</h3>
      </div>
      <div className="card-body">
        <div className="space-y-4" role="list" aria-label="System health metrics">
          {healthData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between"
              role="listitem"
            >
              <div className="flex items-center space-x-3">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    item.status === 'good' ? 'bg-green-500' :
                    item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  aria-hidden="true"
                ></div>
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      item.status === 'good' ? 'bg-green-500' :
                      item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    role="progressbar"
                    aria-valuenow={item.value}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} usage: ${item.value}%`}
                  />
                </div>
                <span className={`text-sm font-semibold ${item.color} min-w-[3rem] text-right`}>
                  {item.value.toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const metrics = [
    { 
      title: 'Active Angels', 
      value: '4', 
      change: '+2 from yesterday', 
      icon: '👼', 
      color: 'text-blue-600',
      ariaLabel: '4 active angels, up 2 from yesterday'
    },
    { 
      title: 'Commands Today', 
      value: '247', 
      change: '+18% from yesterday', 
      icon: '⚡', 
      color: 'text-green-600',
      ariaLabel: '247 commands executed today, up 18% from yesterday'
    },
    { 
      title: 'Success Rate', 
      value: '98.5%', 
      change: '+0.3% from yesterday', 
      icon: '✅', 
      color: 'text-purple-600',
      ariaLabel: '98.5% success rate, up 0.3% from yesterday'
    },
    { 
      title: 'Response Time', 
      value: '1.2s', 
      change: '-0.1s from yesterday', 
      icon: '⚡', 
      color: 'text-orange-600',
      ariaLabel: '1.2 seconds average response time, down 0.1 seconds from yesterday'
    }
  ];

  const angelActivity = [
    { name: 'Learning', value: 35, color: '#3B82F6' },
    { name: 'Analytics', value: 28, color: '#10B981' },
    { name: 'Growth', value: 22, color: '#8B5CF6' },
    { name: 'Visionary', value: 15, color: '#F59E0B' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };







  return (
    <div className="space-y-8" role="main" aria-labelledby="dashboard-heading">
      <div className="flex items-center justify-between">
        <div>
          <h1 id="dashboard-heading" className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time insights and system analytics</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500" aria-live="polite">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
          <span>Live data</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 metrics-grid">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <MetricCard {...metric} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 charts-grid">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PieChart data={angelActivity} title="Angel Activity Distribution" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <LineChart title="Performance Timeline" />
        </motion.div>
      </div>

      {/* Health Monitor */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        aria-labelledby="health-section-heading"
      >
        <h2 id="health-section-heading" className="sr-only">System Health Monitoring</h2>
        <HealthMonitor />
      </motion.section>
    </div>
  );
};

export default Dashboard;