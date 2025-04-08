"use client";

import { getCurrentUserNotification } from "@/actions/get";
import {
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/update";
import PageHeader from "@/components/PageHeader";
import { useNotificationStore } from "@/stores/notificationStore";
import { formatDate } from "@/utils/functions";
import { NotificationType } from "@/utils/types";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconCheckbox,
  IconExternalLink,
  IconFilter,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type filterType = "all" | "unread";

const NotificationsPage = () => {
  const router = useRouter();

  const { colorScheme } = useMantineColorScheme();

  const { notifications, setNotifications } = useNotificationStore();

  const [filter, setFilter] = useState<filterType>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const filteredNotifications = notifications.filter((notification) =>
    filter === "unread" ? !notification.notification_read : true,
  );

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const dateA = new Date(a.notification_created_at).getTime();
    const dateB = new Date(b.notification_created_at).getTime();
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    if (!notificationId) return null;

    const res = await markNotificationAsRead({
      notification_id: notificationId,
    });

    if (res.error) {
      Notifications.show({
        title: "Error",
        message: "Something went wrong.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.notification_id === notificationId
          ? { ...notification, notification_read: true }
          : notification,
      ),
    );
  };

  const handleMarkAllNotificationAsRead = async () => {
    const res = await markAllUserNotificationsAsRead();

    if (!res.success) {
      Notifications.show({
        title: "Error",
        message: "Something went wrong.",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        notification_read: true,
      })),
    );

    Notifications.show({
      title: "Notifications",
      message: "All notifications have been marked as read.",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await getCurrentUserNotification();

      if (res.error) {
        Notifications.show({
          title: "Error",
          message: "Something went wrong.",
          color: "red",
          icon: <IconAlertCircle size={16} />,
        });
        return;
      }

      setNotifications(res.data as NotificationType[]);
    };

    fetchNotifications();
  }, [notifications.length === 0]);

  const breadcrumbs = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Notifications", href: "/notification" },
  ];

  return (
    <Box p={{ base: "md", sm: "xl" }}>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <PageHeader title="Notifications" breadcrumbs={breadcrumbs} />
          <Group gap="sm">
            <Tooltip label="Mark all as read">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={handleMarkAllNotificationAsRead}
                size="lg"
              >
                <IconCheckbox size={20} />
              </ActionIcon>
            </Tooltip>
            <SegmentedControl
              value={filter}
              onChange={(value: string) => setFilter(value as filterType)}
              data={[
                { label: "All", value: "all" },
                { label: "Unread", value: "unread" },
              ]}
            />
            <Select
              leftSection={<IconFilter size={16} />}
              value={sortBy}
              onChange={(value) => setSortBy(value || "newest")}
              data={[
                { label: "Newest first", value: "newest" },
                { label: "Oldest first", value: "oldest" },
              ]}
              w={160}
            />
          </Group>
        </Group>

        <Stack gap="md">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map((notification) => (
              <Paper
                key={notification.notification_id}
                shadow="xs"
                opacity={notification.notification_read ? 0.8 : 1}
                p="lg"
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
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {formatDate(notification.notification_created_at)}
                      </Text>
                    </Group>
                    <Text fw={notification.notification_read ? 400 : 600}>
                      {notification.notification_message}
                    </Text>
                    <Button
                      variant="light"
                      color="blue"
                      size="sm"
                      w="fit-content"
                      onClick={() =>
                        router.push(
                          `/tickets/${notification.notification_ticket_id}`,
                        )
                      } // Use ticket_id here
                      leftSection={<IconExternalLink size={16} />}
                    >
                      View Details
                    </Button>
                  </Stack>
                  {!notification.notification_read && (
                    <Tooltip label="Mark as read">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() =>
                          handleMarkAsRead(notification.notification_id)
                        }
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Paper>
            ))
          ) : (
            <Paper
              py="xl"
              px="md"
              withBorder
              ta="center"
              style={{ borderStyle: "dashed" }}
            >
              <Stack align="center" gap="xs">
                <IconInfoCircle size={24} color="gray" />
                <Text c="dimmed">No notifications found</Text>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default NotificationsPage;
