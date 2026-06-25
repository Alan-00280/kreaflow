'use client'

import { useSession } from "@/components/providers/session-provider";
import { users } from "./_components/data";
import { Users } from "./_components/users";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = useSession();
  if (session?.role !== 'admin') {
    redirect('/unauthorized')
  };

  return <Users users={users} />;
}
