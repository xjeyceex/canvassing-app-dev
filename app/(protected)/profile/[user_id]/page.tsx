"use client";

import { fetchUserById } from "@/actions/get";
import { updateUserRole } from "@/actions/post";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import { UserType } from "@/utils/types";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  rem,
  Select,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconLock,
  IconMail,
  IconSettings,
  IconUserShield,
  IconX,
} from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const { colorScheme } = useMantineColorScheme();
  const router = useRouter();
  const { user } = useUserStore();
  const { user_id } = useParams() as { user_id: string };
  const [loading, setLoading] = useState(false);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [opened, setOpened] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const isAdmin = user?.user_role === "ADMIN";
  const isManager = user?.user_role === "MANAGER";
  // const isReviewer = user?.user_role === "REVIEWER";
  const isUser = user?.user_id === profileUser?.user_id;

  useEffect(() => {
    if (isUser) {
      setRedirecting(true); // Set redirecting to true before triggering the redirect
      router.replace("/profile"); // Replace the current route in history
    }
  }, [isUser, router]);

  // Fetch user data
  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      if (!user_id) return;

      try {
        const fetchedUser = await fetchUserById(user_id);

        if (isMounted) {
          setProfileUser(fetchedUser);
        }
      } catch (error) {
        console.error("Error fetching profileUser:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false; // Cleanup to prevent memory leaks if the component is unmounted
    };
  }, [user_id]); // Fetch data when user_id changes

  const handleChangeRole = async () => {
    if (!selectedRole || !profileUser) return;

    setChangingRole(true);
    const previousUser = { ...profileUser };

    setProfileUser({
      ...profileUser,
      user_role: selectedRole,
    });

    const success = await updateUserRole(user_id, selectedRole);
    setChangingRole(false);

    if (success) {
      notifications.show({
        title: "Success",
        message: "Profile role updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setOpened(false);
    } else {
      setProfileUser(previousUser);
      notifications.show({
        title: "Failed",
        message: "Failed to update role.",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  const hasPermission =
    (isAdmin || isManager) &&
    profileUser?.user_role !== "ADMIN" &&
    profileUser?.user_role !== "MANAGER";

  if (loading || redirecting) {
    return <LoadingStateProtected />;
  }

  return (
    <>
      {profileUser ? (
        <Box p={{ base: "md", sm: "xl" }} mx="auto" maw={500}>
          <Stack gap="lg">
            <Paper
              shadow="sm"
              px="xl"
              pt="xl"
              pb="md"
              radius="md"
              withBorder
              style={(theme) => ({
                backgroundColor:
                  colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
              })}
            >
              {/* Avatar & Name */}
              <Stack align="center" gap="md">
                <Avatar
                  variant="light"
                  src={profileUser?.user_avatar || undefined}
                  size={100}
                  radius="xl"
                  color="blue"
                >
                  {profileUser?.user_avatar
                    ? null
                    : getNameInitials(profileUser?.user_full_name || "")}
                </Avatar>

                <Title order={3} fw={600}>
                  {profileUser?.user_full_name}
                </Title>
              </Stack>

              <Divider my="md" />

              {/* User Info */}
              <Stack gap="sm">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" radius="xl">
                    <IconMail style={{ width: rem(14), height: rem(14) }} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">
                    {profileUser?.user_email}
                  </Text>
                </Group>

                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" radius="xl">
                    <IconUserShield
                      style={{ width: rem(14), height: rem(14) }}
                    />
                  </ThemeIcon>

                  {changingRole ? (
                    <Skeleton width={100} height={18} />
                  ) : (
                    <Text size="sm" c="dimmed" tt="capitalize">
                      {profileUser?.user_role.toLowerCase()}
                    </Text>
                  )}
                </Group>
              </Stack>

              <Divider my="md" />

              {/* Placeholder for Role Change */}
              <Stack align="center" gap={4} py="xs">
                <Button
                  leftSection={
                    hasPermission ? (
                      <IconSettings size={16} />
                    ) : (
                      <IconLock size={16} />
                    )
                  }
                  variant="light"
                  radius="md"
                  size="sm"
                  color={hasPermission ? "blue" : "gray"}
                  style={!hasPermission ? { pointerEvents: "none" } : {}}
                  onClick={hasPermission ? () => setOpened(true) : undefined}
                >
                  Change Role
                </Button>

                {!hasPermission && (
                  <Text
                    size="xs"
                    c="dimmed"
                    ta="center"
                    style={{ marginTop: 8 }}
                  >
                    Only admins and managers can edit roles
                  </Text>
                )}
              </Stack>
            </Paper>
          </Stack>

          <Modal
            opened={opened}
            onClose={() => setOpened(false)}
            title="Change User Role"
            centered
          >
            <Select
              label="Select a Role"
              placeholder="Choose a role"
              data={
                isAdmin
                  ? ["REVIEWER", "PURCHASER", "MANAGER"]
                  : ["REVIEWER", "PURCHASER"]
              }
              value={selectedRole}
              onChange={setSelectedRole}
            />

            <Button
              fullWidth
              mt="md"
              onClick={handleChangeRole}
              loading={changingRole}
            >
              Update Role
            </Button>
          </Modal>
        </Box>
      ) : (
        <LoadingStateProtected />
      )}
    </>
  );
};

export default ProfilePage;
