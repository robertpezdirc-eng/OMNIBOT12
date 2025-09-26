import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:py-12 bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <img
              className="mx-auto h-16 w-auto"
              src="/logo-white.svg"
              alt="Omni"
            />
            <h1 className="mt-6 text-3xl font-bold text-white">
              Omni Platforma
            </h1>
            <p className="mt-4 text-lg text-primary-100">
              Ultra modularna rešitev za turizem, gostinstvo in več
            </p>
          </div>
          
          <div className="mt-12 space-y-6">
            <div className="flex items-center text-primary-100">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Licenčni sistem</p>
                <p className="text-xs text-primary-200">Aktivacija in sledenje funkcionalnosti</p>
              </div>
            </div>
            
            <div className="flex items-center text-primary-100">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Upravljanje uporabnikov</p>
                <p className="text-xs text-primary-200">Vloge in dovoljenja</p>
              </div>
            </div>
            
            <div className="flex items-center text-primary-100">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25A1.125 1.125 0 012.25 18.375v-2.25z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Modularnost</p>
                <p className="text-xs text-primary-200">Turizem, gostinstvo, čebelarstvo in več</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="lg:hidden text-center mb-8">
            <img
              className="mx-auto h-12 w-auto"
              src="/logo.svg"
              alt="Omni"
            />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Omni Platforma
            </h1>
          </div>

          <Outlet />

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © 2024 Omni Platforma. Vse pravice pridržane.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;