'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Droplets,
  Flame,
  Wind,
  Home,
  Waves,
  Truck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResourceAction, RpiData } from '@/types';

interface ResourceRecommendationProps {
  rpiData: RpiData;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Protocols', icon: ShieldAlert },
  { id: 'rain', label: 'Flood & Rain', icon: Droplets },
  { id: 'heat', label: 'Heat Action Plan', icon: Flame },
  { id: 'wind', label: 'Wind & Infrastructure', icon: Wind },
];

export function ResourceRecommendation({ rpiData }: ResourceRecommendationProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  const filteredRecs = rpiData.recommendations.filter(
    (r) => activeTab === 'all' || r.category === activeTab || (activeTab === 'rain' && r.category === 'general')
  );

  const handleDispatch = (id: string) => {
    setDispatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rain':
        return <Waves className="w-4 h-4 text-sky-500" />;
      case 'heat':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-purple-500" />;
      default:
        return <Building2 className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string): 'destructive' | 'warning' | 'secondary' | 'success' => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'warning';
      case 'medium':
        return 'secondary';
      default:
        return 'success';
    }
  };

  return (
    <section className="relative overflow-hidden border border-border bg-card">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-slate-800 uppercase">
                  RESOURCE RECOMMENDATION ENGINE
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-warning/15 text-amber-700 border border-warning/30">
                  Govt EOC Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic SOP Action Cards triggered by live synoptic risk indicators for{' '}
                <span className="font-semibold text-slate-700">{rpiData.city}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 bg-[#f7f7f7] border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#212121] font-bold border border-[#dbdbdb]'
                    : 'text-[#575757] hover:text-[#212121]'
                }`}
                style={{ borderRadius: 0 }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger rule condition banner */}
      <div className="mt-3 mb-4 px-3 py-2 bg-[#f7f7f7] border border-[#dbdbdb] flex flex-wrap items-center justify-between gap-3 text-xs font-mono" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-2 text-[#575757]">
          <Info className="w-3.5 h-3.5 text-[#1db961] shrink-0" />
          <span>
            <strong className="text-[#212121] font-bold">Active Risk Drivers:</strong>{' '}
            Rain <strong className="text-[#212121]">{rpiData.rainfall} mm</strong> ({rpiData.rainRisk}%) · Temp{' '}
            <strong className="text-[#212121]">{rpiData.temperature}°C</strong> ({rpiData.heatRisk}%) · Wind{' '}
            <strong className="text-[#212121]">{rpiData.wind} km/h</strong> ({rpiData.windRisk}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#808080]">Mobilized:</span>
          <span className="font-bold text-[#168a49] bg-white px-1.5 py-0.2 border border-[#dbdbdb] text-[11px]">
            {dispatchedIds.size} / {rpiData.recommendations.length} Orders
          </span>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredRecs.map((rec, index) => {
            const isDispatched = dispatchedIds.has(rec.id);
            return (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`relative p-3.5 border flex flex-col justify-between transition-colors ${
                  isDispatched
                    ? 'bg-[#e6faee] border-[#1db961]'
                    : 'bg-white border-[#dbdbdb] hover:border-[#1db961]'
                }`}
                style={{ borderRadius: 0 }}
              >
                <div>
                  {/* Top Bar: Action Code & Priority Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 bg-[#f7f7f7] border border-[#dbdbdb] text-[#575757]" style={{ borderRadius: 0 }}>
                        {getCategoryIcon(rec.category)}
                      </span>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-[#575757] bg-[#f7f7f7] px-1.5 py-0.5 border border-[#dbdbdb]" style={{ borderRadius: 0 }}>
                        {rec.actionCode}
                      </span>
                    </div>

                    <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-[#212121] leading-snug mb-1.5">
                    {rec.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-[#575757] leading-relaxed mb-3">
                    {rec.description}
                  </p>
                </div>

                {/* Footer Bar: Department & Operational Dispatch Button */}
                <div className="pt-2.5 border-t border-[#f0f0f0] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#808080]">
                    <span className="truncate max-w-[190px]" title={rec.department}>
                      {rec.department}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 border ${
                        isDispatched
                          ? 'bg-[#c4f3d8] text-[#168a49] border-[#1db961]'
                          : 'bg-[#f7f7f7] text-[#575757] border-[#dbdbdb]'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      {isDispatched ? 'DISPATCHED' : rec.status}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant={isDispatched ? 'default' : 'secondary'}
                    onClick={() => handleDispatch(rec.id)}
                    className="w-full text-xs font-mono font-bold"
                  >
                    {isDispatched ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Order Mobilized</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Resource</span>
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
export default ResourceRecommendation;
