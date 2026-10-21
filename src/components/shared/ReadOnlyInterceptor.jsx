import { useEffect } from "react";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/components/ui/use-toast";

/**
 * Intercepts form submissions and mutation-attributed clicks while
 * in read-only (impersonation) mode. Renders nothing.
 */
export default function ReadOnlyInterceptor() {
  const { isReadOnly } = useRole();

  useEffect(() => {
    if (!isReadOnly) return;

    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast({
        title: "Read-only mode",
        description: "Saving and submitting are disabled while viewing as another user.",
        variant: "destructive",
      });
    };

    const handleClick = (e) => {
      const target = e.target.closest('[data-mutation="true"]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          title: "Read-only mode",
          description: "This action is disabled while viewing as another user.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isReadOnly]);

  return null;
}