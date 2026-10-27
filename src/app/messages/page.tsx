import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MessagesInbox } from "@/components/messages-inbox";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Messages</h1>
      <MessagesInbox />
    </div>
  );
}
