import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  BookOpen
} from 'lucide-react';
import { api } from '../../services/api';
import { UserSimulationItem } from '../../types';

export const UserSimulations: React.FC = () => {
  const [simulations, setSimulations] = useState<UserSimulationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserSimulations();
      setSimulations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Mail className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">My Phishing Simulation Results</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review all simulated security exercises sent to your inbox, whether links were clicked or reported, and plain-language explanations
          </p>
        </div>

        <button
          onClick={fetchSimulations}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info Disclaimer Banner */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Privacy Guarantee: </span>
          You are viewing your own individual simulation telemetry. CloudShield enforces strict privacy boundaries;
          your fellow colleagues cannot view your personal results.
        </div>
      </div>

      {/* Simulations Grid/Cards */}
      {simulations.length > 0 ? (
        <div className="space-y-4">
          {simulations.map((sim) => (
            <div
              key={sim.simulation_id}
              className={`p-5 rounded-2xl bg-white border shadow-sm transition-all hover:shadow-md ${
                sim.email_reported
                  ? 'border-emerald-200 ring-1 ring-emerald-100'
                  : sim.link_clicked
                  ? 'border-rose-200 ring-1 ring-rose-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {sim.campaign_name}
                    </span>
                    {sim.email_reported && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Reported as Phish
                      </span>
                    )}
                    {sim.link_clicked && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Link Clicked
                      </span>
                    )}
                    {!sim.email_reported && !sim.link_clicked && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Delivered — No Interaction
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                    <span>Delivered: {new Date(sim.received_at).toLocaleDateString()}</span>
                    <span>Status: <strong className="text-slate-700">{sim.delivery_status}</strong></span>
                    <span>
                      Training Status:{' '}
                      <strong className={sim.training_status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-700'}>
                        {sim.training_status}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 uppercase font-mono">Assigned Risk</div>
                    <div className="text-base font-bold font-mono text-slate-800">
                      {sim.risk_score} / 100
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple plain-English explanation card */}
              <div
                className={`mt-4 p-3.5 rounded-xl text-xs leading-relaxed ${
                  sim.email_reported
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    : sim.link_clicked
                    ? 'bg-rose-50 text-rose-800 border border-rose-100'
                    : 'bg-slate-50 text-slate-700 border border-slate-100'
                }`}
              >
                <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Result Explanation:</span>
                </div>
                {sim.explanation}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Simulations Received Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            When security awareness phishing simulations are dispatched by the SOC or CanIPhish platform,
            they will appear here with instant feedback.
          </p>
        </div>
      )}
    </div>
  );
};
