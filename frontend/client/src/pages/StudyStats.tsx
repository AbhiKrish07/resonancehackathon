import { useCompanion } from "@/contexts/CompanionContext";
import { useEffect } from "react";
import { Brain, TrendingUp, Clock, Target, AlertTriangle } from "lucide-react";

export default function StudyStats() {
  const { setContext } = useCompanion();

  useEffect(() => {
    setContext({ workspace: "Study Stats" });
  }, [setContext]);

  return (
    <div className="max-w-[1000px] mx-auto py-10 px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Study Stats</h1>
        <p className="text-gray-500">Your learning progress and mastery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mb-3">
            <Target size={24} />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">84%</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Avg Mastery</span>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <TrendingUp size={24} />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">4</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Day Streak</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
            <Clock size={24} />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">12h</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Time Studied</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-700 flex items-center justify-center mb-3">
            <Brain size={24} />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">15</span>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Lessons Done</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-sm">
          <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2"><Target className="text-gray-400" size={20} /> Mastery by Topic</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Cellular Biology</span>
                <span className="text-green-600">92%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[92%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Psychology 101</span>
                <span className="text-[#123d2d]">78%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#123d2d] w-[78%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>World History</span>
                <span className="text-amber-500">45%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[45%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200">
            <h3 className="text-lg font-extrabold text-amber-900 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Needs Review</h3>
            <p className="text-sm text-amber-800 mb-4">You've struggled with these concepts recently. We recommend a quick recall session.</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-amber-900 border border-amber-200 shadow-sm">Anchoring Effect</span>
              <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-amber-900 border border-amber-200 shadow-sm">Mitochondrial Matrix</span>
            </div>
            <button className="mt-5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2 px-4 rounded-xl shadow-sm transition-colors">Start Review Session</button>
          </div>

          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200">
            <h3 className="text-sm font-extrabold text-gray-900 mb-2">Next Recommended Action</h3>
            <p className="text-sm text-gray-600 mb-4">You left off in the middle of <strong>Psychology 101: Cognitive Biases</strong>.</p>
            <button className="bg-[#123d2d] hover:bg-[#0d2a1f] text-white text-sm font-bold py-2 px-4 rounded-xl shadow-sm transition-colors w-full">Continue Learning</button>
          </div>
        </div>
      </div>
    </div>
  );
}
