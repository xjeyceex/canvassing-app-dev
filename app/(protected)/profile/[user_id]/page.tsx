"use client";

import { checkIfUserPasswordExists, fetchUserById } from "@/actions/get";
import {
  updateDisplayName,
  updateProfilePicture,
  updateUserRole,
} from "@/actions/post";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import SetPasswordModal from "@/components/SetPasswordModal";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import { UserType } from "@/utils/types";
import {
  ActionIcon,
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
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconLock,
  IconMail,
  IconSettings,
  IconUserShield,
  IconX,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const { colorScheme } = useMantineColorScheme();
  const { user, setUser } = useUserStore();
  const { user_id } = useParams() as { user_id: string };

  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.user_full_name || "");
  const [loading, setLoading] = useState(false);
  const [isPasswordExist, setIsPasswordExist] = useState(false);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [opened, setOpened] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const isAdmin = user?.user_role === "ADMIN";
  const isManager = user?.user_role === "MANAGER";
  // const isReviewer = user?.user_role === "REVIEWER";

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
      isMounted = false;
    };
  }, [user_id]);

  useEffect(() => {
    let isMounted = true;

    if (!user || !user.user_id) return;

    const checkPasswordExists = async () => {
      const result = await checkIfUserPasswordExists(user.user_id);

      if (isMounted) {
        if (result) {
          setIsPasswordExist(true);
        } else {
          setIsPasswordExist(false);
        }
      }
    };

    checkPasswordExists();

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  if (!user) {
    return <LoadingStateProtected />;
  }

  const isUser = user.user_id === profileUser?.user_id;

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
        message: "Profile picture updated successfully",
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

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const result = await updateProfilePicture(file);
    setLoading(false);

    if (result?.error) {
      notifications.show({
        title: "Error",
        message: "Failed to update profile picture",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } else {
      notifications.show({
        title: "Success",
        message: "Profile picture updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setUser({ ...user, user_avatar: result.url ?? "" });
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === user.user_full_name) return;

    setLoading(true);
    const result = await updateDisplayName(newName);
    setLoading(false);

    if (result?.error) {
      notifications.show({
        title: "Error",
        message: result.message,
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } else {
      notifications.show({
        title: "Success",
        message: "Name updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setUser({ ...user, user_full_name: newName });
      setIsEditingName(false);
    }
  };

  return (
    <>
      {isUser ? (
        <Box p={{ base: "md", sm: "xl" }}>
          <Stack gap={2} mb="xl">
            <Title order={2} fw={600}>
              Profile
            </Title>
            <Text c="dimmed" size="sm">
              TODO: Breadcrumbs
            </Text>
          </Stack>
          <Stack gap="xl">
            {/* Header Section */}
            <Paper
              shadow="xs"
              p="xl"
              radius="md"
              style={(theme) => ({
                backgroundColor:
                  colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
                border: `1px solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[4]
                    : theme.colors.gray[2]
                }`,
              })}
            >
              <Group wrap="nowrap" gap="xl">
                <Box>
                  <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                    <Avatar
                      variant="light"
                      src={user.user_avatar || undefined} // Fallback to undefined if no avatar
                      size={120}
                      radius="md"
                      color="blue"
                      style={{
                        cursor: "pointer",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {user.user_avatar
                        ? null
                        : getNameInitials(user.user_full_name)}
                    </Avatar>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: "none" }}
                  />
                </Box>

                <Stack gap={4}>
                  <Group align="center" gap="xs">
                    <Title order={2} fw={600}>
                      {user.user_full_name}
                    </Title>
                    <Tooltip label="Edit name">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => setIsEditingName(true)}
                        size="sm"
                      >
                        <IconEdit style={{ width: rem(14), height: rem(14) }} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" radius="xl">
                      <IconMail style={{ width: rem(12), height: rem(12) }} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {user.user_email}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" radius="xl">
                      <IconUserShield
                        style={{ width: rem(12), height: rem(12) }}
                      />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed" tt="capitalize">
                      {user.user_role.toLowerCase()}
                    </Text>
                  </Group>
                </Stack>
              </Group>
            </Paper>

            {/* Settings Section */}
            <Paper
              shadow="xs"
              radius="md"
              style={(theme) => ({
                backgroundColor:
                  colorScheme === "dark" ? theme.colors.dark[6] : theme.white,
                border: `1px solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[4]
                    : theme.colors.gray[2]
                }`,
              })}
            >
              <Stack gap={0}>
                <Text p="md" fw={500}>
                  Account Settings
                </Text>
                <Divider />

                <Group
                  p="md"
                  justify="space-between"
                  wrap="nowrap"
                  style={(theme) => ({
                    "&:hover": {
                      backgroundColor:
                        colorScheme === "dark"
                          ? theme.colors.dark[5]
                          : theme.colors.gray[0],
                    },
                  })}
                >
                  <Stack gap={1}>
                    <Text size="md" fw={500}>
                      Change Password
                    </Text>
                    <Text size="sm" c="dimmed">
                      Update your password to keep your account secure
                    </Text>
                  </Stack>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconLock size={14} />}
                    onClick={() => {
                      if (isPasswordExist) {
                        setIsChangePasswordModalOpen(true);
                      } else {
                        setIsSetPasswordModalOpen(true);
                      }
                    }}
                  >
                    Update
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Stack>

          {/* Update Name Modal */}
          <Modal
            opened={isEditingName}
            onClose={() => setIsEditingName(false)}
            title="Update Name"
            centered
            size="sm"
          >
            <Stack>
              <TextInput
                label="New Name"
                placeholder="Enter new name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleUpdateName} loading={loading} fullWidth>
                Save Changes
              </Button>
            </Stack>
          </Modal>

          {/* Change Password Modal */}
          {isPasswordExist && (
            <ChangePasswordModal
              isModalOpen={isChangePasswordModalOpen}
              setIsModalOpen={setIsChangePasswordModalOpen}
            />
          )}

          {/* Set Password Modal */}
          {!isPasswordExist && (
            <SetPasswordModal
              isModalOpen={isSetPasswordModalOpen}
              setIsModalOpen={setIsSetPasswordModalOpen}
            />
          )}
        </Box>
      ) : profileUser ? (
        <Box p={{ base: "md", sm: "xl" }} mx="auto" maw={500}>
          <Stack gap="lg">
            <Paper
              shadow="sm"
              p="xl"
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
              <Stack align="center">
                {(isAdmin || isManager) &&
                  profileUser.user_role !== "ADMIN" &&
                  profileUser.user_role !== "MANAGER" && (
                    <Button
                      leftSection={<IconSettings size={16} />}
                      variant="light"
                      radius="md"
                      size="sm"
                      onClick={() => setOpened(true)}
                    >
                      Change Role
                    </Button>
                  )}
              </Stack>
            </Paper>
          </Stack>
          <Modal
            opened={opened}
            onClose={() => setOpened(false)}
            title="Change User Role"
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
