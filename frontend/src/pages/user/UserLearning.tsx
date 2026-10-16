import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Lock,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { LearningLesson } from '../../types';

export const UserLearning: React.FC = () => {
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LearningLesson | null>(null);

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const res = await api.getUserLearning();
      setLessons(res.modules || []);
      setCompletionPercentage(res.completion_percentage || 0);
      if (res.modules && res.modules.length > 0 && !activeLesson) {
        setActiveLesson(res.modules[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const handleToggleComplete = async (lessonId: string) => {
    try {
      await api.toggleLessonCompletion(lessonId);
      fetchLessons();
      if (activeLesson && activeLesson.id === lessonId) {
        setActiveLesson({
          ...activeLesson,
          completed: !activeLesson.completed
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Security Awareness & Learning Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Practical phishing identification techniques, assigned micro-lessons, and enterprise safe computing standards
          </p>
        </div>

        {/* Progress badge */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overall Progress</div>
            <div className="text-sm font-bold text-slate-900">{completionPercentage}% Completed</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            {lessons.filter(l => l.completed).length}/{lessons.length}
          </div>
        </div>
      </div>

      {/* Phishing Identification Quick Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>1. Sender Address Verification</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Examine the domain following the '@' sign. Beware of slight typos (e.g., <code className="text-rose-700 font-mono">@payro11-cloud.com</code> instead of <code className="text-emerald-700 font-mono">@payroll-cloud.com</code>).
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>2. Manufactured Urgency</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Attackers pressure you to act hastily with phrases like "Account closing in 1 hour" or "Immediate invoice verification". Take time to independently verify.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>3. Link Inspection Protocol</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hover over hyperlinks before clicking. If the real URL redirects to an unfamiliar cloud storage or unknown domain, do not click it.
          </p>
        </div>
      </div>

      {/* Main Learning Lessons Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider px-2 py-1">
            Assigned Modules
          </div>

          <div className="space-y-1.5">
            {lessons.map((les) => {
              const isSelected = activeLesson?.id === les.id;
              return (
                <button
                  key={les.id}
                  onClick={() => setActiveLesson(les)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        les.completed
                          ? 'bg-emerald-500 text-white'
                          : isSelected
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {les.completed ? '✓' : '•'}
                    </span>
                    <div>
                      <div className="font-semibold line-clamp-1">{les.title}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {les.duration} • {les.category}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Lesson Viewer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {activeLesson ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                    {activeLesson.category}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{activeLesson.title}</h2>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {activeLesson.duration}
                    </span>
                    {activeLesson.badge && (
                      <span className="flex items-center gap-1 text-amber-600 font-semibold">
                        <Award className="w-3.5 h-3.5" />
                        Badge: {activeLesson.badge}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleComplete(activeLesson.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    activeLesson.completed
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {activeLesson.completed ? 'Completed' : 'Mark as Completed'}
                </button>
              </div>

              {/* Lesson Description */}
              <div className="text-xs text-slate-700 leading-relaxed">
                {activeLesson.description}
              </div>

              {/* Key Takeaways */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Key Vigilance Takeaways</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700">
                  {activeLesson.key_takeaways?.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Select a module from the list to begin learning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
