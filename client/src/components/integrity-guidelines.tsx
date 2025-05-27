import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, CheckCircle, XCircle, Info } from "lucide-react";

export default function IntegrityGuidelines() {
  return (
    <Card>
      <CardHeader className="border-b border-gray-200 p-4">
        <h4 className="font-medium text-gray-700 flex items-center space-x-2">
          <Shield className="h-4 w-4 text-edu-success" />
          <span>Academic Integrity Guide</span>
        </h4>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Allowed Activities */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-edu-success flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>✅ Allowed AI Help</span>
          </h5>
          <ul className="text-sm text-gray-600 space-y-1 ml-6">
            <li>• Brainstorming and idea generation</li>
            <li>• Creating outlines and structure</li>
            <li>• Grammar and style feedback</li>
            <li>• Research topic suggestions</li>
            <li>• Citation format help</li>
          </ul>
        </div>

        {/* Restricted Activities */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-edu-error flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>❌ Not Allowed</span>
          </h5>
          <ul className="text-sm text-gray-600 space-y-1 ml-6">
            <li>• Writing complete assignments</li>
            <li>• Finishing paragraphs for you</li>
            <li>• Generating full essays</li>
            <li>• Completing homework</li>
          </ul>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 flex items-start space-x-1">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Remember: The goal is to help you learn and improve your own writing skills.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
