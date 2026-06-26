import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50" },
  contacted: { label: "Contacted", className: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50" },
  documents_pending: { label: "Docs Pending", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" },
  submitted: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  disbursed: { label: "Disbursed", className: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50" },
  lost: { label: "Lost", className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100" },
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100" },
  ready_to_submit: { label: "Ready", className: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" },
  received: { label: "Received", className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50" },
  verified: { label: "Verified", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  missing: { label: "Missing", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
  missed: { label: "Missed", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
  low: { label: "Low", className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100" },
  medium: { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" },
  high: { label: "High", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status.toLowerCase()] || { label: status, className: "bg-gray-100 text-gray-600" };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}