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
        className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        Log out
      </button>
    </form>
  );
}
