import type { ReactNode } from "react";

import { Command } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <Command className="size-10" />
            <h1 className="font-medium text-2xl">{APP_CONFIG.name}</h1>
            <p className="text-sm">Creative Hub System App</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Ekonomi Kreatif</h2>
              <p className="text-sm">Kreatif Berkarya. Ekonomi Berjaya.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Need help?</h2>
              <p className="text-sm">
                Hubungi nomor ini <span><a href="https://wa.me/6285748023239?text=Hai%20saya%20butuh%20bantuan%20untuk%20aplikasi%20Kreaflow" className="underline">WA</a></span>
              </p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
