import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";

import ReactMarkdown from "react-markdown";

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function ExplanationModal({
  isOpen,
  onClose,
  title,
  content,
}: ExplanationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[calc(90vh)] mt-10 mb-10 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none pb-4">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
