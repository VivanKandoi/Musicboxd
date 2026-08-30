import { signOut } from "@/lib/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        Log out
      </button>
    </form>
  );
}
