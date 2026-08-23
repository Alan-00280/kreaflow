import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Kreaflow</h1>
          <p className="text-muted-foreground text-lg">Sistem Pencatatan Pesanan Kustom</p>
        </div>
        
        <div className="pt-6">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/auth/v2/login">
              <LogIn className="mr-2 h-5 w-5" />
              Masuk ke Sistem
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
