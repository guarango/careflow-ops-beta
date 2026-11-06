import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** All field definitions for a form — active and retired, in display order. */
export function useFormFields(formType) {
  return useQuery({
    queryKey: ["form-fields", formType],
    queryFn: async () => {
      const res = await base44.entities.FormFieldDefinition.filter(
        { form_type: formType },
        { sort: "display_order", limit: 500 }
      );
      return res.items || [];
    },
    staleTime: 30000,
  });
}