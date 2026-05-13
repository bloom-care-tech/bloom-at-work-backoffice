import { useQuery } from "@tanstack/react-query";
import { fetchCompaniesPage } from "@/lib/admin-api";

export function useAdminCompaniesForSelect() {
  return useQuery({
    queryKey: ["companies", "filter-select"],
    queryFn: () => fetchCompaniesPage(1, 100),
  });
}
