import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Shield,
  Info,
  RefreshCw,
  Compass
} from 'lucide-react';
import { api } from '../../services/api';
import { UserSecurityInsights } from '../../types';

export const UserInsights: React.FC = () => {
  const [insights, setInsights] = useState<UserSecurityInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserSecurityInsights();
      setInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (isLoading || !insights) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
        Calculating Security Insights...
      </div>
    );
  }

  const isScoreImproved = insights.score_delta >= 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">My Security Insights & Scoring</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personal risk classification, reasons for your calculated tier, score trends, and tailored vigilance guidance
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      </div>

      {/* Top Banner: Methodology Explanation (Explicit Requirement) */}
      <div className="p-5 bg-white text-slate-800 rounded-2xl shadow-sm border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>How CloudShield Calculates Your Score</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {insights.methodology_explanation}
        </p>
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
          Engine: Deterministic Rule-Based Correlation • Baseline: 85 pts • Phish Reported: +15 pts • Link Click: -25 pts
        </div>
      </div>

      {/* Score Comparison & Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Awareness Score
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {insights.current_score}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {insights.category_label}
          </span>
        </div>

        {/* Previous Score & Delta */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Previous Period Score
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-700 font-mono">
              {insights.previous_score}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {isScoreImproved ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">+{insights.score_delta} pts improvement</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-rose-700">{insights.score_delta} pts lower</span>
              </>
            )}
          </div>
        </div>

        {/* Risk Classification Tier */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Target Baseline
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            80+
          </div>
          <div className="text-xs text-slate-500">
            {insights.current_score >= 80
              ? 'You are maintaining target cyber awareness standards!'
              : 'Complete lessons to raise your score above 80.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reasons for Calculated Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Reasons for Your Calculated Tier</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {insights.reasons.map((reason, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-slate-700 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Actionable Recommendations</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {insights.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-2.5 text-slate-800 leading-relaxed"
              >
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
