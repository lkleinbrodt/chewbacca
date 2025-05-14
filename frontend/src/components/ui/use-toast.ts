import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import { ToastContext, ToastContextProps } from "@/components/ui/toast";
import { useCallback, useContext } from "react";

type ToastOptions = Omit<ToastProps, "children"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

export function useToast() {
  const context = useContext(ToastContext) as ToastContextProps;

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { toast } = context;

  return {
    toast: useCallback(
      (options: ToastOptions) => {
        toast(options);
      },
      [toast]
    ),
  };
}
