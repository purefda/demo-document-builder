"use server";

import { createUser, getUser } from "../db";
import { signIn } from "./auth";

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed";
}

export const login = async (
  data: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    return { status: "success" } as LoginActionState;
  } catch {
    return { status: "failed" } as LoginActionState;
  }
};

export interface RegisterActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "user_exists";
}

export const register = async (
  data: RegisterActionState,
  formData: FormData,
) => {
  try {
    let email = formData.get("email") as string;
    let password = formData.get("password") as string;
    
    // Validate inputs
    if (!email || !password) {
      console.error("Registration error: Missing email or password");
      return { status: "failed" } as RegisterActionState;
    }
    
    let user = await getUser(email);

    if (user.length > 0) {
      return { status: "user_exists" } as RegisterActionState;
    } else {
      // Create the user
      await createUser(email, password);
      
      // Sign in the user
      try {
        await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        return { status: "success" } as RegisterActionState;
      } catch (signInError) {
        console.error("Error during sign in after registration:", signInError);
        // Even if sign-in fails, registration was successful
        return { status: "success" } as RegisterActionState;
      }
    }
  } catch (error) {
    console.error("Registration error:", error);
    return { status: "failed" } as RegisterActionState;
  }
};
