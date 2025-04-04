"use client";
import { useUserStore } from "@/stores/userStore";
import { createClient } from "@/utils/supabase/client";
import { UserType } from "@/utils/types";
import { Group, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const AuthCallback = () => {
  const router = useRouter();
  const { setUser } = useUserStore();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = await createClient();

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        notifications.show({
          title: "Error",
          message: "Authentication failed. Please try again.",
          color: "red",
        });
        router.push("/"); // Redirect to home on failure
        return;
      }

      const supabaseUser = data.session.user;
      const email = supabaseUser.email;

      // 🔍 Check if the user already exists in the database
      const { data: existingUser, error: userError } = await supabase
        .from("user_table")
        .select("user_id")
        .eq("user_email", email)
        .single();

      if (userError && userError.code !== "PGRST116") {
        // Ignore 'not found' error
        console.error("Database error:", userError.message);
        notifications.show({
          title: "Error",
          message: "Something went wrong. Please try again.",
          color: "red",
        });
        return;
      }

      if (!existingUser) {
        // 🆕 If user does not exist, register them
        const { error: insertError } = await supabase
          .from("user_table")
          .insert([
            {
              user_id: supabaseUser.id,
              user_full_name:
                supabaseUser.user_metadata?.full_name || "Unnamed User",
              user_email: email,
              user_avatar: supabaseUser.user_metadata?.avatar_url || "",
              user_role: "PURCHASER",
            },
          ]);

        if (insertError) {
          console.error("User registration error:", insertError.message);
          notifications.show({
            title: "Error",
            message: "Failed to register user.",
            color: "red",
          });
          return;
        }
      }

      // ✅ Sign in user (existing or newly registered)
      const user: UserType = {
        user_id: supabaseUser.id,
        user_role: "PURCHASER",
        user_full_name: supabaseUser.user_metadata?.full_name || "Unnamed User",
        user_email: email ?? "",
        user_avatar: supabaseUser.user_metadata?.avatar_url || "",
        user_updated_at:
          supabaseUser.user_metadata?.updated_at || new Date().toISOString(),
        user_created_at:
          supabaseUser.user_metadata?.created_at || new Date().toISOString(),
      };

      setUser(user);

      notifications.show({
        title: "Success",
        message: "Signed in with Google!",
        color: "green",
      });

      router.push("/dashboard"); // Redirect after login
    };

    fetchUser();
  }, [router, setUser]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <Paper
        p="lg"
        radius="md"
        withBorder={false}
        style={{ background: "transparent" }}
      >
        <Stack align="center" gap="md">
          <Title order={4} c="dimmed">
            Please wait
          </Title>
          <Loader size="lg" type="dots" color="blue" />
          <Group>
            <Text size="sm" c="dimmed">
              Processing authentication...
            </Text>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
};

export default AuthCallback;
