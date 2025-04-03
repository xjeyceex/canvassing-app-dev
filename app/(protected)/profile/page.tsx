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
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  rem,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconLock,
  IconMail,
  IconUserShield,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

const ProfilePage = () => {
  const { colorScheme } = useMantineColorScheme();
  const { user, setUser } = useUserStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.user_full_name || "");
  const [loading, setLoading] = useState(false);
  const [isPasswordExist, setIsPasswordExist] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

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
    <Box p={{ base: "sm", sm: "md" }}>
      <Stack gap={isMobile ? 1 : 2} mb="xl">
        <Title order={2} fw={600} ta={isMobile ? "center" : "left"}>
          Profile
        </Title>
        <Text
          c="dimmed"
          size={isMobile ? "xs" : "sm"}
          ta={isMobile ? "center" : "left"}
        >
          TODO: Breadcrumbs
        </Text>
      </Stack>

      <Stack gap="xl">
        {/* Header Section */}
        <Paper
          shadow="xs"
          p={isMobile ? "md" : "xl"}
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
          <Group
            wrap={isMobile ? "wrap" : "nowrap"}
            gap={isMobile ? "xs" : "xl"}
          >
            <Box>
              <label htmlFor="avatar-upload" style={{ cursor: "pointer" }}>
                <Avatar
                  variant="light"
                  src={user.user_avatar || undefined} // Fallback to undefined if no avatar
                  size={isMobile ? 80 : 120}
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

            <Stack gap={4} style={{ width: isMobile ? "100%" : "auto" }}>
              <Group align="center" gap="xs">
                <Title order={2} fw={600} ta={isMobile ? "center" : "left"}>
                  {user.user_full_name}
                </Title>
                <Tooltip label="Edit name">
                  <ActionIcon
                    variant="subtle"
                    onClick={() => setIsEditingName(true)}
                    size={isMobile ? "xs" : "sm"}
                  >
                    <IconEdit style={{ width: rem(14), height: rem(14) }} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" radius="xl">
                  <IconMail style={{ width: rem(12), height: rem(12) }} />
                </ThemeIcon>
                <Text size={isMobile ? "xs" : "sm"} c="dimmed">
                  {user.user_email}
                </Text>
              </Group>
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" radius="xl">
                  <IconUserShield style={{ width: rem(12), height: rem(12) }} />
                </ThemeIcon>
                <Text size={isMobile ? "xs" : "sm"} c="dimmed" tt="capitalize">
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
                <Text size={isMobile ? "sm" : "md"} fw={500}>
                  Change Password
                </Text>
                <Text size={isMobile ? "xs" : "sm"} c="dimmed">
                  Update your password to keep your account secure
                </Text>
              </Stack>
              <Button
                variant="light"
                size={isMobile ? "xs" : "sm"}
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
        size={isMobile ? "xs" : "sm"}
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
  );
};

export default ProfilePage;
