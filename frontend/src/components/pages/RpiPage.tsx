'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, MapPin, Building, Activity, RefreshCw } from 'lucide-react';
import { RpiHero } from '@/components/RPI/RpiHero';
import { ResourceRecommendation } from '@/components/RPI/ResourceRecommendation';
import { ModelTrustAtlas } from '@/components/RPI/ModelTrustAtlas';
import { RegionSelector } from '@/components/RegionSelector';
import { getRpiData, getAllRpiData, SERVER_WAKING_UP_MSG } from '@/lib/api';
import { RpiData } from '@/types';

interface RpiPageProps {
  selectedCity?: string | null;
  onSelectCity?: (city: string) => void;
}

export function RpiPage({ selectedCity = 'Kanpur', onSelectCity }: RpiPageProps) {
  const [currentCity, setCurrentCity] = useState<string>(selectedCity || 'Kanpur');
  const [rpiData, setRpiData] = useState<RpiData | null>(null);
  const [stations, setStations] = useState<RpiData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with prop when parent updates selectedCity
  useEffect(() => {
    if (selectedCity && selectedCity !== currentCity) {
      setCurrentCity(selectedCity);
    }
  }, [selectedCity]);

  // Load all stations once for Model Trust Atlas
  useEffect(() => {
    let mounted = true;
    getAllRpiData()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setStations(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch or calculate RPI data whenever currentCity changes
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    getRpiData(currentCity)
      .then((data) => {
        if (mounted && data) {
          setRpiData(data);
          setIsLoading(false);
          setIsRefreshing(false);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setIsLoading(false);
          setIsRefreshing(false);
          setErrorMessage(err?.message || SERVER_WAKING_UP_MSG);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentCity]);

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    if (onSelectCity) onSelectCity(city);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    getRpiData(currentCity)
      .then((data) => {
        setRpiData(data);
        setIsRefreshing(false);
        setErrorMessage(null);
      })
      .catch((err) => {
        setIsRefreshing(false);
        setErrorMessage(err?.message || SERVER_WAKING_UP_MSG);
      });
  };

  return (
    <div className="space-y-7">
      {/* Top Emergency Operations Center Control Bar with Region Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-foreground flex items-center justify-center text-background">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold text-[#212121] tracking-wider uppercase">
                RISK PRIORITY INDEX (RPI) MODULE
              </h2>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#f7f7f7] text-[#575757] border border-[#dbdbdb]">
                EOC DECISION SUPPORT
              </span>
            </div>
            <p className="text-xs text-[#808080]">
              Disaster Risk Mitigation &amp; Resource Pre-Positioning Dashboard for National &amp; State EOCs
            </p>
          </div>
        </div>

        {/* Quick Station Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-secondary hover:bg-accent text-foreground border border-border transition-colors duration-100 cursor-pointer"
            title="Refresh Synoptic RPI Run"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{isRefreshing ? 'Recalculating...' : 'Refresh Index'}</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Section 1 Hero + Section 2 Recommendations + Section 3 Model Trust Atlas (12 or 8/4) */}
        <div className="lg:col-span-12 space-y-6">
          {/* Section 1 — Risk Priority Index Hero Card */}
          {isLoading ? (
            <div className="w-full h-72 bg-secondary animate-pulse flex flex-col items-center justify-center text-muted-foreground gap-3 border border-border">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono">
                Starting AI weather engine… This may take up to 60 seconds.
              </span>
            </div>
          ) : errorMessage && !rpiData ? (
            <div className="w-full h-72 bg-white flex flex-col items-center justify-center text-[#575757] gap-3 border border-[#dbdbdb] p-6 text-center" style={{ borderRadius: 0 }}>
              <span className="text-xs font-mono text-[#b4544a]">
                {errorMessage}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3 py-1 text-xs font-mono font-bold bg-white border border-[#dbdbdb] hover:bg-[#f7f7f7] text-[#212121] cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Try Again
              </button>
            </div>
          ) : !rpiData ? (
            <div className="w-full h-72 bg-secondary animate-pulse flex flex-col items-center justify-center text-muted-foreground gap-3 border border-border">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono">
                Starting AI weather engine… This may take up to 60 seconds.
              </span>
            </div>
          ) : (
            <motion.div
              key={rpiData.city}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <RpiHero rpiData={rpiData} />
            </motion.div>
          )}

          {/* Region Selector Bar for Smooth Country -> State -> District Exploration */}
          <div className="max-w-2xl">
            <RegionSelector selectedCity={currentCity} onSelectCity={handleCitySelect} />
          </div>

          {/* Section 2 — Resource Recommendation Engine */}
          {rpiData && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <ResourceRecommendation rpiData={rpiData} />
            </motion.div>
          )}

          {/* Section 3 — Model Trust Atlas */}
          {rpiData && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <ModelTrustAtlas
                rpiData={rpiData}
                stations={stations.length > 0 ? stations : [rpiData]}
                onSelectCity={handleCitySelect}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
export default RpiPage;
