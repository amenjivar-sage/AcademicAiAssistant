import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Trophy, FileText } from "lucide-react";
import type { WritingSession } from "@shared/schema";

interface Comment {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  highlightedText: string;
  createdAt: Date;
}

interface FeedbackViewerProps {
  session: WritingSession;
}

export default function FeedbackViewer({ session }: FeedbackViewerProps) {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract actual teacher feedback from the session
  const comments: Comment[] = [];

  // Render content with highlights
  const renderContentWithHighlights = () => {
    const content = session.content;
    if (!content || comments.length === 0) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Sort comments by start index
    const sortedComments = [...comments].sort((a, b) => a.startIndex - b.startIndex);
    
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    sortedComments.forEach((comment, index) => {
      // Add text before this comment
      if (comment.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {content.slice(lastIndex, comment.startIndex)}
          </span>
        );
      }

      // Add highlighted text with comment
      elements.push(
        <span
          key={comment.id}
          className={`relative inline-block bg-yellow-200 cursor-pointer transition-colors ${
            activeComment === comment.id ? 'bg-yellow-300' : 'hover:bg-yellow-300'
          }`}
          onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
          title={comment.text}
        >
          {comment.highlightedText}
          <MessageCircle className="inline h-3 w-3 ml-1 text-blue-600" />
        </span>
      );

      lastIndex = comment.endIndex;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <span key="text-end">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <div className="whitespace-pre-wrap">{elements}</div>;
  };

  return (
    <div className="h-screen flex">
      {/* Document Content */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header with grade and status */}
        <div className="bg-green-50 border-b border-green-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-900">Assignment Graded</h3>
                <p className="text-sm text-green-700">Grade: {session.grade}</p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">
              Completed
            </Badge>
          </div>
        </div>

        {/* Document Title */}
        <div className="border-b bg-white p-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <FileText className="h-5 w-5 text-gray-500" />
            <h1 className="text-lg font-medium text-gray-900">{session.title}</h1>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{session.wordCount} words</span>
            <span>Submitted: {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : 'Not submitted'}</span>
          </div>
        </div>

        {/* Document Content with Highlights */}
        <div className="flex-1 overflow-auto p-8">
          <div
            ref={contentRef}
            className="max-w-4xl mx-auto bg-white min-h-full"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
          >
            {renderContentWithHighlights()}
          </div>
        </div>

        {/* Teacher Feedback Section */}
        {session.teacherFeedback && (
          <div className="border-t bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Overall Feedback
              </h3>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-700">{session.teacherFeedback}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments Sidebar */}
      <div className="w-80 border-l bg-gray-50 flex flex-col h-screen">
        <div className="p-4 border-b bg-white">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Comments ({comments.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No comments on this document</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {comments.map((comment) => (
                <Card
                  key={comment.id}
                  className={`cursor-pointer transition-colors ${
                    activeComment === comment.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-xs">
                        "{comment.highlightedText.slice(0, 20)}..."
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}