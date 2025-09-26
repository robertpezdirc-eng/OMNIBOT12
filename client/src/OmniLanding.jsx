import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OmniLanding = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const modules = [
    {
      id: 'ai',
      title: 'AI Inteligenca',
      description: 'Napredna umetna inteligenca za poslovne rešitve',
      icon: '🧠',
      color: 'from-purple-600 to-blue-600',
      features: ['GPT-4 Integracija', 'Avtomatizacija', 'Analitika']
    },
    {
      id: 'analytics',
      title: 'Analitika',
      description: 'Poglobljena analiza podatkov in trendov',
      icon: '📊',
      color: 'from-blue-600 to-cyan-600',
      features: ['Real-time Dashboard', 'Prediktivna analiza', 'Vizualizacija']
    },
    {
      id: 'automation',
      title: 'Avtomatizacija',
      description: 'Poslovni procesi na avtopilotu',
      icon: '⚡',
      color: 'from-yellow-500 to-orange-600',
      features: ['Workflow Engine', 'API Integracije', 'Scheduling']
    },
    {
      id: 'security',
      title: 'Varnost',
      description: 'Enterprise-level varnostni protokoli',
      icon: '🛡️',
      color: 'from-green-600 to-teal-600',
      features: ['End-to-end šifriranje', 'Multi-factor auth', 'Audit logs']
    },
    {
      id: 'cloud',
      title: 'Cloud Platform',
      description: 'Skalabilna oblačna infrastruktura',
      icon: '☁️',
      color: 'from-indigo-600 to-purple-600',
      features: ['Auto-scaling', 'Global CDN', '99.9% Uptime']
    },
    {
      id: 'mobile',
      title: 'Mobile First',
      description: 'Optimizirano za mobilne naprave',
      icon: '📱',
      color: 'from-pink-600 to-red-600',
      features: ['Progressive Web App', 'Offline Mode', 'Push Notifications']
    }
  ];

  const Particle = ({ delay }) => (
    <motion.div
      className="absolute w-1 h-1 bg-white rounded-full opacity-70"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <Particle key={i} delay={i * 0.1} />
        ))}
      </div>

      {/* Dynamic Gradient Overlay */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 40%)`,
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 p-6 flex justify-between items-center"
      >
        <div className="flex items-center space-x-4">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-xl"
          >
            Ω
          </motion.div>
          <h1 className="text-2xl font-bold">OMNI Platform</h1>
        </div>
        <nav className="hidden md:flex space-x-6">
          {['Domov', 'Moduli', 'Cenik', 'Kontakt'].map((item) => (
            <motion.a
              key={item}
              href="#"
              whileHover={{ scale: 1.1, color: '#a855f7' }}
              className="hover:text-purple-400 transition-colors"
            >
              {item}
            </motion.a>
          ))}
        </nav>
      </motion.header>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 1.2 }}
        className="relative z-10 text-center py-20 px-6"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-7xl md:text-9xl font-black mb-6 relative">
            <motion.span
              className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            >
              OMNI
            </motion.span>
            
            {/* AI Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent blur-lg opacity-50"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              OMNI
            </motion.div>
          </h1>
          
          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
          >
            Univerzalna platforma za <span className="text-purple-400 font-semibold">poslovne rešitve</span>, 
            ki združuje moč <span className="text-blue-400 font-semibold">umetne inteligence</span> z 
            <span className="text-pink-400 font-semibold"> naprednimi tehnologijami</span>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(168, 85, 247, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-4 rounded-full font-semibold text-lg shadow-2xl transform transition-all duration-300"
          >
            🚀 Začni zdaj
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-purple-400 hover:bg-purple-400 hover:text-black px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300"
          >
            📖 Več informacij
          </motion.button>
        </motion.div>
      </motion.section>

      {/* Modules Grid */}
      <motion.section
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative z-10 px-6 py-20"
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
          >
            Napredni Moduli
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.6 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: 5,
                  boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
                }}
                onHoverStart={() => setActiveModule(module.id)}
                onHoverEnd={() => setActiveModule(null)}
                className={`bg-gradient-to-br ${module.color} p-6 rounded-2xl shadow-2xl cursor-pointer transform transition-all duration-300 relative overflow-hidden`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{module.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                  <p className="text-gray-100 mb-4">{module.description}</p>
                  
                  <AnimatePresence>
                    {activeModule === module.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        {module.features.map((feature, i) => (
                          <motion.div
                            key={i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center space-x-2"
                          >
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span className="text-sm">{feature}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="relative z-10 py-20 px-6 bg-black bg-opacity-30"
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '10K+', label: 'Aktivnih uporabnikov' },
              { number: '99.9%', label: 'Uptime' },
              { number: '50+', label: 'Integracije' },
              { number: '24/7', label: 'Podpora' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 2.2 + index * 0.1 }}
                className="space-y-2"
              >
                <div className="text-3xl md:text-4xl font-bold text-purple-400">{stat.number}</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}
        className="relative z-10 text-center py-12 px-6 border-t border-gray-800"
      >
        <p className="text-gray-400">
          © 2024 OMNI Platform. Vse pravice pridržane. 
          <span className="text-purple-400"> Powered by AI Excellence</span>
        </p>
      </motion.footer>
    </div>
  );
};

export default OmniLanding;