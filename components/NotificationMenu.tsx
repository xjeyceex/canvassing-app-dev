"use client";

import { getCurrentUserNotification } from "@/actions/get";
import { markNotificationAsRead } from "@/actions/update";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUserStore } from "@/stores/userStore";
import { createClient } from "@/utils/supabase/client";
import { NotificationType } from "@/utils/types";
import {
  ActionIcon,
  Group,
  Indicator,
  Menu,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconBellFilled,
  IconChevronRight,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NotificationMenu = () => {
  const router = useRouter();
  const pathname = usePathname();

  const { user } = useUserStore();
  const { notifications, setNotifications } = useNotificationStore();

  const unreadCount = notifications.filter(
    (notif) => !notif.notification_read
  ).length;

  const getRelativeTime = (timestamp: string) => {
    const zonedDate = toZonedTime(new Date(timestamp), "Asia/Manila");
    return formatDistanceToNow(zonedDate, { addSuffix: true });
  };

  const handleNotificationClick = async (notifications: NotificationType) => {
    if (!notifications.notification_ticket_id) return null; // Use ticket_id instead of notification_url

    const res = await markNotificationAsRead({
      notification_id: notifications.notification_id,
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

    // Navigate to the ticket page using the ticket_id
    router.push(`/tickets/${notifications.notification_ticket_id}`);
  };

  // Fetch initial notifications
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

      // Sort notifications by created_at in descending order (most recent first)
      const sortedNotifications = res.data
        ?.filter((notification) => !notification.notification_read)
        .sort(
          (a, b) =>
            new Date(b.notification_created_at).getTime() -
            new Date(a.notification_created_at).getTime()
        );

      setNotifications(sortedNotifications as NotificationType[]);
    };

    if (pathname !== "/notifications") fetchNotifications();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const subscribeToNotifications = async () => {
      if (!user) return;

      // Subscribe to changes in the notification_table for the current user
      const channel = createClient()
        .channel("notification_changes")
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "notification_table",
            filter: `notification_user_id=eq.${user?.user_id}`, // Filter for current user's notifications
          },
          async (payload) => {
            // Handle different database events
            switch (payload.eventType) {
              case "INSERT":
                // Add new notification to the state
                setNotifications((prev) => [
                  payload.new as NotificationType,
                  ...prev,
                ]);

                // Show a toast notification
                Notifications.show({
                  title: "New Notification",
                  message: (payload.new as NotificationType)
                    .notification_message,
                  color: "blue",
                });
                break;

              case "UPDATE":
                // Update existing notification in state
                setNotifications((prev) =>
                  prev.map((notification) =>
                    notification.notification_id === payload.new.notification_id
                      ? { ...notification, ...payload.new }
                      : notification
                  )
                );
                break;

              case "DELETE":
                // Remove notification from state
                setNotifications((prev) =>
                  prev.filter(
                    (notification) =>
                      notification.notification_id !==
                      payload.old.notification_id
                  )
                );
                break;
            }
          }
        )
        .subscribe();

      // Cleanup subscription when component unmounts
      return () => {
        createClient().removeChannel(channel);
      };
    };

    subscribeToNotifications();
  }, [user]);

  return (
    <Menu position="bottom-end" offset={4}>
      <Menu.Target>
        {unreadCount > 0 ? (
          <Indicator
            inline
            label={unreadCount}
            size={16}
            ta="center"
            fz="xs"
            fw="bold"
          >
            <ActionIcon variant="subtle" color="gray" size="lg">
              <IconBellFilled size={20} />
            </ActionIcon>
          </Indicator>
        ) : (
          <ActionIcon variant="subtle" color="gray" size="lg">
            <IconBellFilled size={20} />
          </ActionIcon>
        )}
      </Menu.Target>

      <Menu.Dropdown miw={320} p={6}>
        <Menu.Label fz="md" fw={600}>
          Notifications
        </Menu.Label>

        <Menu.Divider />

        {notifications.length > 0 ? (
          <Stack gap="xs">
            {notifications.map((notification) => (
              <Menu.Item
                key={notification.notification_id}
                onClick={() => handleNotificationClick(notification)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2}>
                    <Text
                      size="sm"
                      fw={notification.notification_read ? 400 : 600}
                      truncate
                      w={300}
                    >
                      {notification.notification_message}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {getRelativeTime(notification.notification_created_at)}
                    </Text>
                  </Stack>
                  {!notification.notification_read && (
                    <Paper
                      w={8}
                      h={8}
                      bg="blue"
                      radius="xl"
                      display="inline-block"
                    />
                  )}
                </Group>
              </Menu.Item>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No notifications
          </Text>
        )}

        <Menu.Divider />

        <Menu.Item
          fw={600}
          fz="sm"
          color="blue"
          rightSection={<IconChevronRight size={16} />}
          onClick={() => router.push("/notifications")}
        >
          View all notifications
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
export default NotificationMenu;
