import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function Custom404() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <FileQuestion className="h-16 w-16 text-muted-foreground" />
        <h1 className="font-serif text-4xl font-bold">404</h1>
        <p className="text-muted-foreground text-lg">Page not found</p>
        <Link href="/">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </AppLayout>
  );
}
