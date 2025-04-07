"use client";

import { getUserDataById } from "@/actions/get";
import { updateUserRole } from "@/actions/post";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import { UserType } from "@/utils/types";
import {
  Avatar,
  Badge,
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
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconLock,
  IconMail,
  IconSettings,
  IconUserShield,
  IconX,
} from "@tabler/icons-react";
import { formatDistance } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const theme = useMantineTheme();
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
  const [ticketCount, setTicketCount] = useState(0);
  const [revisedTicketCount, setRevisedTicketCount] = useState(0);
  const [ticketsRevisedByUserCount, setTicketsRevisedByUserCount] = useState(0);
  const [ticketsReviewedByUserCount, setTicketsReviewedByUserCount] =
    useState(0);

  const isAdmin = user?.user_role === "ADMIN";
  const isManager = user?.user_role === "MANAGER";
  const isUser = user?.user_id === profileUser?.user_id;

  const getRelativeTime = (timestamp: string) => {
    const zonedDate = toZonedTime(new Date(timestamp), "Asia/Manila");
    return format(zonedDate, "MMM dd, yyyy");
  };

  const getExactTime = (timestamp: string) => {
    const zonedDate = toZonedTime(new Date(timestamp), "Asia/Manila");
    const distance = formatDistance(zonedDate, new Date(), {
      includeSeconds: true,
    });
    return distance + " ago"; // Removes "about" and adds "ago"
  };

  const handleEditProfile = () => {
    setRedirecting(true);
    router.push("/profile");
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user_id) return;

      try {
        const result = await getUserDataById(user_id);

        if (result.error) {
          notifications.show({
            title: "Error",
            message: result.message,
            color: "red",
            icon: <IconAlertCircle size={16} />,
          });
          return;
        }

        if (isMounted) {
          setProfileUser(result.user);
          setTicketCount(result.ticketCount || 0);
          setRevisedTicketCount(result.revisedTicketCount || 0);
          setTicketsRevisedByUserCount(result.ticketsRevisedByUserCount || 0);
          setTicketsReviewedByUserCount(result.ticketsReviewedByUserCount || 0);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user_id]);

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

  if (loading || redirecting || !profileUser) {
    return <LoadingStateProtected />;
  }

  return (
    <Box p={{ base: "md", sm: "xl" }} mx="auto" maw={500}>
      <Stack gap="lg">
        <Paper
          shadow="md"
          px="xl"
          pt="xl"
          pb="lg"
          radius="lg"
          withBorder
          style={(theme) => ({
            backgroundColor:
              colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
            position: "relative",
            overflow: "hidden",
          })}
        >
          {/* Decorative elements */}
          <Box
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "100%",
              height: 120,
              background:
                colorScheme === "dark"
                  ? `linear-gradient(135deg, ${theme.colors.blue[9]} 0%, ${theme.colors.dark[7]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.blue[2]} 0%, ${theme.white} 100%)`,
              zIndex: 0,
              opacity: 0.8,
            }}
          />

          {/* Main content */}
          <Stack style={{ position: "relative", zIndex: 1 }}>
            {/* Avatar & Name */}
            <Stack align="center" gap="md">
              <Avatar
                variant="light"
                src={profileUser?.user_avatar || undefined}
                size={120}
                color="blue"
                style={{
                  boxShadow: theme.shadows.md,
                }}
              >
                {profileUser?.user_avatar
                  ? null
                  : getNameInitials(profileUser?.user_full_name || "")}
              </Avatar>

              <Stack align="center" gap={4}>
                <Title order={2} fw={700}>
                  {profileUser?.user_full_name}
                </Title>
                <Badge variant="light" color="blue" radius="sm" size="lg">
                  {changingRole ? (
                    <Skeleton width={100} height={20} />
                  ) : (
                    profileUser?.user_role.toLowerCase()
                  )}
                </Badge>
              </Stack>
            </Stack>

            <Divider my="md" variant="dashed" />

            {/* User Info */}
            <Stack gap="md">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size="lg" variant="light" radius="xl" color="blue">
                  <IconMail style={{ width: rem(16), height: rem(16) }} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">
                    Email
                  </Text>
                  <Text size="sm" fw={500}>
                    {profileUser?.user_email}
                  </Text>
                </Stack>
              </Group>
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon size="lg" variant="light" radius="xl" color="blue">
                  <IconUserShield style={{ width: rem(16), height: rem(16) }} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">
                    Role
                  </Text>
                  {changingRole ? (
                    <Skeleton width={100} height={18} />
                  ) : (
                    <Text size="sm" fw={500} tt="capitalize">
                      {profileUser?.user_role.toLowerCase()}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Stack>
            <Divider mt="md" variant="dashed" />
            {/* Action buttons */}
            <Group grow>
              {isUser ? (
                <Button
                  leftSection={<IconSettings size={16} />}
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan", deg: 45 }}
                  radius="md"
                  size="md"
                  onClick={handleEditProfile}
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  leftSection={
                    hasPermission ? (
                      <IconSettings size={16} />
                    ) : (
                      <IconLock size={16} />
                    )
                  }
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan", deg: 45 }}
                  radius="md"
                  size="md"
                  disabled={!hasPermission}
                  onClick={hasPermission ? () => setOpened(true) : undefined}
                >
                  Change Role
                </Button>
              )}
            </Group>
            {!hasPermission && !isUser && (
              <Text size="xs" c="dimmed" ta="center">
                Only admins and managers can edit roles
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper p="md" radius="lg" withBorder shadow="sm">
          <Group justify="space-around" align="stretch">
            {profileUser?.user_role === "PURCHASER" && (
              <>
                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Tickets
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {ticketCount}
                  </Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Revised Ticket Ratio
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {revisedTicketCount || 0}
                  </Text>
                  <Text size="10px" c="dimmed" ta="center">
                    {ticketCount > 0
                      ? `${((revisedTicketCount / ticketCount) * 100).toFixed(
                          2
                        )}%`
                      : "0%"}
                  </Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Joined
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {getRelativeTime(profileUser?.user_created_at)}
                  </Text>
                  <Text size="10px" c="dimmed" ta="center">
                    {getExactTime(profileUser?.user_created_at)}
                  </Text>
                </Stack>
              </>
            )}

            {profileUser?.user_role === "REVIEWER" && (
              <>
                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Tickets
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {ticketsReviewedByUserCount || 0}
                  </Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Tickets Revised
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {ticketsRevisedByUserCount || 0}
                  </Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Joined
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {getRelativeTime(profileUser?.user_created_at)}
                  </Text>
                  <Text size="10px" c="dimmed" ta="center">
                    {getExactTime(profileUser?.user_created_at)}
                  </Text>
                </Stack>
              </>
            )}

            {profileUser?.user_role !== "PURCHASER" &&
              profileUser?.user_role !== "REVIEWER" && (
                <Stack align="center" gap={0} style={{ height: "100%" }}>
                  <Text size="sm" c="dimmed" ta="center">
                    Joined
                  </Text>
                  <Text size="xl" fw={700} ta="center" style={{ flexGrow: 1 }}>
                    {getRelativeTime(profileUser?.user_created_at)}
                  </Text>
                  <Text size="10px" c="dimmed" ta="center">
                    {getExactTime(profileUser?.user_created_at)}
                  </Text>
                </Stack>
              )}
          </Group>
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
  );
};

export default ProfilePage;
