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
        return <Waves className="w-4 h-4 text-water" />;
      case 'heat':
        return <Flame className="w-4 h-4 text-destructive" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-foreground" />;
      default:
        return <Building2 className="w-4 h-4 text-muted-foreground" />;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-destructive/10 flex items-center justify-center text-destructive border border-destructive/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-foreground uppercase">
                  RESOURCE RECOMMENDATION ENGINE
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-warning/15 text-warning border border-warning/30">
                  Govt EOC Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dynamic SOP Action Cards triggered by live synoptic risk indicators for{' '}
                <span className="font-semibold text-foreground">{rpiData.city}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 bg-secondary border border-border">
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
                    ? 'bg-white text-foreground font-bold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
               
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger rule condition banner */}
      <div className="mt-3 mb-4 px-3 py-2 bg-secondary border border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-success shrink-0" />
          <span>
            <strong className="text-foreground font-bold">Active Risk Drivers:</strong>{' '}
            Rain <strong className="text-foreground">{rpiData.rainfall} mm</strong> ({rpiData.rainRisk}%) · Temp{' '}
            <strong className="text-foreground">{rpiData.temperature}°C</strong> ({rpiData.heatRisk}%) · Wind{' '}
            <strong className="text-foreground">{rpiData.wind} km/h</strong> ({rpiData.windRisk}%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Mobilized:</span>
          <span className="font-bold text-success bg-white px-1.5 py-0.2 border border-border text-[11px]">
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
                    ? 'bg-secondary border-border'
                    : 'bg-white border-border hover:border-foreground/40'
                }`}
               
              >
                <div>
                  {/* Top Bar: Action Code & Priority Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 bg-secondary border border-border text-muted-foreground">
                        {getCategoryIcon(rec.category)}
                      </span>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 border border-border">
                        {rec.actionCode}
                      </span>
                    </div>

                    <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-foreground leading-snug mb-1.5">
                    {rec.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {rec.description}
                  </p>
                </div>

                {/* Footer Bar: Department & Operational Dispatch Button */}
                <div className="pt-2.5 border-t border-border flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="truncate max-w-[190px]" title={rec.department}>
                      {rec.department}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 border ${
                        isDispatched
                          ? 'bg-secondary text-foreground border-border'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                     
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
