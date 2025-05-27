import { GraduationCap, CheckCircle } from "lucide-react";

export default function IntegrityBanner() {
  return (
    <div className="mb-8 bg-gradient-to-r from-edu-blue to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Welcome to EduWrite AI</h2>
          <p className="text-blue-100 mb-3">
            Your ethical AI writing companion that helps you learn and improve while maintaining academic integrity.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>Brainstorming & Outlining</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>Grammar & Style Feedback</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-300" />
              <span>Research Guidance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
