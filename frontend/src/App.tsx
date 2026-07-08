import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Sidebar } from './components/Sidebar';
import type { TabId } from './components/Sidebar';
import { Header } from './components/Header';

import { LiveMap } from './pages/LiveMap';
import { Heatmap } from './pages/Heatmap';
import { RouteOptimizer } from './pages/RouteOptimizer';
import { EvacuationCenter } from './pages/EvacuationCenter';
import { CrowdAnalytics } from './pages/CrowdAnalytics';
import { SimulationControl } from './pages/SimulationControl';
import { MaxFlowVisualizer } from './pages/MaxFlowVisualizer';

import { HazardControl } from './pages/HazardControl';
import { CommandCenter } from './pages/CommandCenter';


const pageVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('command-center');
  const { isEvacuationActive } = useSimulation();

  const renderPage = () => {
    switch (activeTab) {
      case 'live-map':         return <LiveMap />;
      case 'heatmap':          return <Heatmap />;
      case 'crowd-analytics':  return <CrowdAnalytics />;
      case 'route-optimizer':  return <RouteOptimizer />;
      case 'max-flow':         return <MaxFlowVisualizer />;
      case 'evacuation':       return <EvacuationCenter />;
      case 'simulation':       return <SimulationControl />;
      case 'command-center':   return <CommandCenter />;

      case 'hazard-control':   return <HazardControl />;
      default:                 return <CommandCenter />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-all duration-500 ${
      isEvacuationActive ? 'bg-[#0d0808]' : 'bg-brand-bg'
    }`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEvacuationActive={isEvacuationActive}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>


    </div>
  );
};

const App: React.FC = () => (
  <SimulationProvider>
    <AppContent />
  </SimulationProvider>
);

export default App;
