import React from "react";
import { Info, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AiDisclosureProps {
  variant?: "card" | "alert" | "compact";
  className?: string;
}

export default function AiDisclosure({ variant = "alert", className = "" }: AiDisclosureProps) {
  const content = (
    <div className="text-xs space-y-2">
      <div className="flex items-center gap-2 font-medium text-blue-700">
        <Shield className="h-3 w-3" />
        AI Disclosure
      </div>
      <p className="text-gray-600 leading-relaxed">
        Sage uses OpenAI's language models through their secure API. When users interact with the AI, 
        their inputs are processed temporarily to generate responses.
      </p>
      <p className="text-gray-600 leading-relaxed">
        We do not store user content, and OpenAI does not use this data to train its models. 
        All data is handled in accordance with OpenAI's strict privacy standards.
      </p>
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardContent className="p-3">
          {content}
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`text-xs text-gray-500 border-t pt-2 ${className}`}>
        <div className="flex items-start gap-2">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            <strong>AI Disclosure:</strong> Powered by OpenAI. Inputs processed temporarily, 
            not stored or used for training. Privacy protected per OpenAI standards.
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <AlertDescription>
        {content}
      </AlertDescription>
    </Alert>
  );
}