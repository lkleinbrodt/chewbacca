import { Card, CardContent, CardHeader, CardTitle } from "./card";

import { ExplanationModal } from "./explanation-modal";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

type ExplanationStatus = "waiting" | "loading" | "complete" | "error";

interface ExplanationCardProps {
  title: string;
  content: string;
  placeholder?: string;
  status?: ExplanationStatus;
  isActive?: boolean;
}

export function ExplanationCard({
  title,
  content,
  placeholder = "Enter a topic above to get started!",
  status = "complete",
  isActive = false,
}: ExplanationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getBorderClass = () => {
    if (isActive) return "border-primary border-2";
    if (status === "waiting") return "border-gray-300 dark:border-gray-700";
    if (status === "loading") return "border-blue-300 dark:border-blue-700";
    if (status === "error") return "border-red-300 dark:border-red-700";
    return "group-hover:border-primary/50";
  };

  return (
    <>
      <Card
        className={`group transition-all ${getBorderClass()} ${
          content ? "cursor-pointer" : ""
        }`}
        onClick={() => content && status !== "waiting" && setIsModalOpen(true)}
      >
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {status === "loading" && (
            <div className="text-xs text-blue-500 animate-pulse">
              Generating...
            </div>
          )}
          {status === "waiting" && (
            <div className="text-xs text-gray-500">Waiting...</div>
          )}
        </CardHeader>
        <CardContent>
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{placeholder}</p>
          )}
        </CardContent>
      </Card>

      <ExplanationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        content={content}
      />
    </>
  );
}
