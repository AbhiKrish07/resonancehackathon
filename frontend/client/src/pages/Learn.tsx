import { useState, useEffect } from "react";
import { Check, X, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/contexts/CompanionContext";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";

export default function Learn() {
  const { setContext, setState } = useCompanion();
  const [, setLocation] = useLocation();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    setContext({ workspace: "Learn", course: "Psychology 101", selection: "Cognitive Biases Recall" });
    setState("observing");
    
    return () => setState("idle");
  }, [setContext, setState]);

  const handleCheck = () => {
    setIsChecked(true);
    if (selectedAnswer === 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#123d2d', '#4a8f6b', '#e3b85c']
      });
      setState("celebrating");
    } else {
      setState("prompting");
    }
  };

  const handleNext = () => {
    setLocation("/");
  };

  return (
    <div className="max-w-[800px] mx-auto py-12 px-6 min-h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-12">
        <div className="flex-1 max-w-md">
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[60%] rounded-full transition-all duration-500"></div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-500 font-bold text-lg ml-6">
          <Brain size={20} />
          <span>4 Day Streak!</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <span className="text-[#6d756f] text-xs font-extrabold tracking-[0.12em] uppercase mb-4 block">Concept Recall</span>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 leading-tight">
          Which cognitive bias describes the tendency to rely too heavily on the first piece of information offered?
        </h2>

        <div className="space-y-4 mb-12">
          {[
            "Confirmation Bias",
            "The Anchoring Effect",
            "Availability Heuristic",
            "Dunning-Kruger Effect"
          ].map((answer, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === 1;
            
            let buttonClass = "w-full text-left p-5 rounded-2xl border-2 text-lg font-medium transition-all flex items-center justify-between ";
            
            if (isChecked) {
              if (isSelected && isCorrect) buttonClass += "bg-green-50 border-green-500 text-green-900";
              else if (isSelected && !isCorrect) buttonClass += "bg-red-50 border-red-500 text-red-900";
              else if (isCorrect) buttonClass += "bg-green-50 border-green-500 text-green-900 opacity-50";
              else buttonClass += "bg-white border-gray-200 text-gray-400 opacity-50";
            } else {
              buttonClass += isSelected 
                ? "border-[#123d2d] bg-[#f1f5f2] text-[#123d2d]" 
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700";
            }

            return (
              <button 
                key={index} 
                className={buttonClass}
                onClick={() => !isChecked && setSelectedAnswer(index)}
                disabled={isChecked}
              >
                <span>{answer}</span>
                {isChecked && isSelected && isCorrect && <Check className="text-green-600" />}
                {isChecked && isSelected && !isCorrect && <X className="text-red-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mt-auto flex justify-between items-center">
        <Button variant="ghost" className="text-gray-500 hover:text-gray-900 font-bold">Skip</Button>
        {!isChecked ? (
          <Button 
            onClick={handleCheck} 
            disabled={selectedAnswer === null}
            className="h-12 px-8 bg-[#123d2d] hover:bg-[#0d2a1f] text-white font-bold rounded-xl text-lg shadow-sm"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            onClick={handleNext} 
            className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg shadow-sm"
          >
            Continue <ArrowRight className="ml-2" size={20} />
          </Button>
        )}
      </div>
    </div>
  );
}
