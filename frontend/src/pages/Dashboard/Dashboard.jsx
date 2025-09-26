import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  CurrencyEuroIcon,
  MapIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    licenses: 0,
    revenue: 0,
    modules: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API calls
      setTimeout(() => {
        setStats({
          users: 156,
          licenses: 23,
          revenue: 12450,
          modules: 8
        });
        
        setRecentActivity([
          { id: 1, type: 'user', message: 'Nov uporabnik se je registriral', time: '2 min nazaj' },
          { id: 2, type: 'license', message: 'Licenca za turizem aktivirana', time: '15 min nazaj' },
          { id: 3, type: 'order', message: 'Novo naročilo v e-trgovini', time: '1 ura nazaj' },
          { id: 4, type: 'system', message: 'Sistem posodobljen na v2.1.0', time: '3 ure nazaj' },
        ]);
        
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Skupaj uporabnikov',
      value: stats.users,
      icon: UsersIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Aktivne licence',
      value: stats.licenses,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'positive'
    },
    {
      name: 'Mesečni prihodek',
      value: `€${stats.revenue.toLocaleString()}`,
      icon: CurrencyEuroIcon,
      color: 'bg-yellow-500',
      change: '+18%',
      changeType: 'positive'
    },
    {
      name: 'Aktivni moduli',
      value: stats.modules,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      change: '0%',
      changeType: 'neutral'
    }
  ];

  const moduleCards = [
    {
      name: 'Turizem',
      description: 'Upravljanje nastanitev in rezervacij',
      icon: MapIcon,
      status: 'active',
      users: 45
    },
    {
      name: 'Gostinstvo',
      description: 'Meniji, cene in rezervacije',
      icon: BuildingStorefrontIcon,
      status: 'active',
      users: 32
    },
    {
      name: 'Čebelarstvo',
      description: 'Evidence panjev in pridelave',
      icon: BeakerIcon,
      status: 'active',
      users: 18
    },
    {
      name: 'E-trgovina',
      description: 'Spletna prodaja izdelkov',
      icon: ShoppingCartIcon,
      status: 'active',
      users: 28
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Dobrodošli, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Pregled vaše Omni platforme
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-1">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">od prejšnjega meseca</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Pregled modulov</h3>
          </div>
          <div className="space-y-4">
            {moduleCards.map((module) => (
              <div key={module.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <module.icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">{module.name}</h4>
                    <p className="text-sm text-gray-500">{module.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Aktivno
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{module.users} uporabnikov</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Nedavna aktivnost</h3>
          </div>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== recentActivity.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          activity.type === 'user' ? 'bg-blue-500' :
                          activity.type === 'license' ? 'bg-green-500' :
                          activity.type === 'order' ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          <UsersIcon className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">{activity.message}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {hasRole('admin') && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Hitre akcije</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn btn-primary">
              Dodaj uporabnika
            </button>
            <button className="btn btn-secondary">
              Ustvari licenco
            </button>
            <button className="btn btn-secondary">
              Preglej poročila
            </button>
            <button className="btn btn-secondary">
              Sistemske nastavitve
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;