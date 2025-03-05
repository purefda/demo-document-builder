import { auth, signOut } from "@/app/(auth)/auth";
import Link from "next/link";

export const Navbar = async () => {
  let session = await auth();

  return (
    <div className="fixed top-0 right-0 bg-white border-b border-gray-200 py-3 px-4 flex justify-end items-center z-30 ml-56 w-[calc(100%-14rem)]">
      {session ? (
        <div className="group py-1 px-2 rounded-md hover:bg-zinc-100 cursor-pointer relative">
          <div className="text-sm z-10">
            {session.user?.email}
          </div>
          <div className="flex-col absolute top-6 right-0 w-full pt-5 group-hover:flex hidden">
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="text-sm w-full p-1 rounded-md bg-red-500 text-red-50 hover:bg-red-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="login"
          className="text-sm p-1 px-2 bg-purple rounded-md text-white hover:bg-deep-purple transition-colors"
        >
          Login
        </Link>
      )}
    </div>
  );
};
