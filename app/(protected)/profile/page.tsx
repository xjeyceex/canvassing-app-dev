"use client";

import { checkIfUserPasswordExists } from "@/actions/get";
import { updateDisplayName, updateProfilePicture } from "@/actions/post";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import LoadingStateProtected from "@/components/LoadingStateProtected";
import SetPasswordModal from "@/components/SetPasswordModal";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  rem,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCamera,
  IconCheck,
  IconEdit,
  IconKey,
  IconLock,
  IconMail,
  IconUserShield,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const theme = useMantineTheme();

  const { colorScheme } = useMantineColorScheme();
  const { user, setUser } = useUserStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.user_full_name || "");
  const [loading, setLoading] = useState(false);
  const [isPasswordExist, setIsPasswordExist] = useState(true);

  useEffect(() => {
    if (!user || !user.user_id) return;
    const checkPasswordExists = async () => {
      const result = await checkIfUserPasswordExists(user.user_id);

      if (result) {
        setIsPasswordExist(true);
      } else {
        setIsPasswordExist(false);
      }
    };

    checkPasswordExists();
  }, [user?.user_id]);

  if (!user) {
    return <LoadingStateProtected />;
  }

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
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
    <Box p={{ base: "md", sm: "xl" }} mx="auto" maw={800}>
      {/* Header with Breadcrumbs */}
      <Stack gap={4} mb="xl">
        <Group justify="space-between" align="flex-end">
          <Stack gap={0}>
            <Title order={2} fw={700}>
              Profile Settings
            </Title>
          </Stack>
          <Badge variant="light" color="blue" radius="sm" size="lg">
            {user.user_role.toLowerCase()}
          </Badge>
        </Group>
      </Stack>

      <Stack gap="xl">
        {/* Profile Header Section */}
        <Paper
          shadow="md"
          p="xl"
          radius="lg"
          withBorder
          style={(theme) => ({
            backgroundColor:
              colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
            position: "relative",
            overflow: "hidden",
          })}
        >
          {/* Decorative background */}
          <Box
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "100%",
              height: 75,
              background:
                colorScheme === "dark"
                  ? `linear-gradient(135deg, ${theme.colors.blue[9]} 0%, ${theme.colors.dark[7]} 100%)`
                  : `linear-gradient(135deg, ${theme.colors.blue[2]} 0%, ${theme.white} 100%)`,
              zIndex: 0,
              opacity: 0.8,
            }}
          />

          <Group
            wrap="nowrap"
            gap="xl"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* Avatar with upload functionality */}
            <Box>
              <label
                htmlFor="avatar-upload"
                style={{ cursor: "pointer", display: "block" }}
              >
                {" "}
                {loading ? (
                  <Skeleton
                    height={120}
                    width={120}
                    radius="xl"
                    style={{
                      border: `2px solid ${
                        colorScheme === "dark"
                          ? theme.colors.dark[4]
                          : theme.colors.gray[2]
                      }`,
                      boxShadow: theme.shadows.md,
                    }}
                  />
                ) : (
                  <Avatar
                    variant="light"
                    src={user.user_avatar || undefined}
                    size={120}
                    radius="xl"
                    color="blue"
                    style={{
                      border: `2px solid ${
                        colorScheme === "dark"
                          ? theme.colors.dark[4]
                          : theme.colors.gray[2]
                      }`,
                      boxShadow: theme.shadows.md,
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
                    <Box
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        backgroundColor: theme.colors.blue[6],
                        borderRadius: "50%",
                        padding: 4,
                      }}
                    >
                      <IconCamera
                        style={{
                          width: rem(16),
                          height: rem(16),
                          color: "white",
                        }}
                      />
                    </Box>
                  </Avatar>
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
            </Box>

            {/* User Info */}
            <Stack gap="md" style={{ flex: 1 }}>
              <Group align="center" gap="sm">
                <Title order={2} fw={700}>
                  {user.user_full_name}
                </Title>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={() => setIsEditingName(true)}
                  size="lg"
                  radius="xl"
                >
                  <IconEdit style={{ width: rem(18), height: rem(18) }} />
                </ActionIcon>
              </Group>

              <Stack gap="sm">
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="lg" variant="light" radius="xl" color="blue">
                    <IconMail style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      Email
                    </Text>
                    <Text size="sm" fw={500}>
                      {user.user_email}
                    </Text>
                  </Stack>
                </Group>

                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="lg" variant="light" radius="xl" color="blue">
                    <IconUserShield
                      style={{ width: rem(16), height: rem(16) }}
                    />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      Account Type
                    </Text>
                    <Text size="sm" fw={500} tt="capitalize">
                      {user.user_role.toLowerCase()}
                    </Text>
                  </Stack>
                </Group>
              </Stack>
            </Stack>
          </Group>
        </Paper>

        {/* Account Settings Section */}
        <Paper
          shadow="md"
          radius="lg"
          withBorder
          style={(theme) => ({
            backgroundColor:
              colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
          })}
        >
          <Stack gap={0}>
            <Box p="lg" pb="sm">
              <Title order={4} fw={600}>
                Account Security
              </Title>
              <Text size="sm" c="dimmed" mt={2}>
                Manage your account security settings
              </Text>
            </Box>
            <Divider />

            {/* Password Settings */}
            <Group
              p="lg"
              justify="space-between"
              wrap="nowrap"
              style={(theme) => ({
                "&:hover": {
                  backgroundColor:
                    colorScheme === "dark"
                      ? theme.colors.dark[6]
                      : theme.colors.gray[0],
                  borderRadius: theme.radius.md,
                },
                transition: "background-color 0.2s ease",
              })}
            >
              <Stack gap={2}>
                <Group gap="sm">
                  <IconLock size={20} color={theme.colors.blue[6]} />
                  <Text size="md" fw={500}>
                    Password
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {isPasswordExist
                    ? "Update your password to keep your account secure"
                    : "Set your password"}
                </Text>
              </Stack>
              <Button
                variant="light"
                color="blue"
                size="sm"
                leftSection={<IconKey size={14} />}
                onClick={() => {
                  if (isPasswordExist) {
                    setIsChangePasswordModalOpen(true);
                  } else {
                    setIsSetPasswordModalOpen(true);
                  }
                }}
              >
                {isPasswordExist ? "Change" : "Set Password"}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>

      {/* Update Name Modal */}
      <Modal
        opened={isEditingName}
        onClose={() => setIsEditingName(false)}
        title="Update Your Name"
        centered
        radius="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Full Name"
            placeholder="Enter your full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
            size="md"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsEditingName(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              loading={loading}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              Save Changes
            </Button>
          </Group>
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
  );
};

export default ProfilePage;
