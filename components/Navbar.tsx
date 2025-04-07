"use client";

import { userLogout } from "@/actions/post";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Menu,
  rem,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconLogout,
  IconMenu2,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import NotificationMenu from "./NotificationMenu";
import ModeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, clearUser } = useUserStore();
  const [, startTransition] = useTransition();
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { openMobileSidebar } = useSidebarStore();

  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    startTransition(() => {
      userLogout();
      clearUser();
      router.push("/login"); // Redirect to login page
    });
  };

  if (!mounted) return null;

  return (
    <Box
      py={{ base: "sm", md: "md" }}
      px={{ base: "md", md: "xl" }}
      bg={colorScheme === "dark" ? "dark.7" : "white"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.05)",
        borderBottom: `1px solid ${
          colorScheme === "dark" ? "#2C2E33" : "#E9ECEF"
        }`,
      }}
    >
      <Flex
        justify={{ base: "space-between", md: "flex-end" }}
        align="center"
        w="100%"
        h={{ base: rem(40), md: rem(50) }}
      >
        {/* Logo and Mobile Menu */}
        <Group
          align="center"
          justify="start"
          display={{ base: "flex", md: "none" }}
          gap="xs"
        >
          <Tooltip label="Open Sidebar">
            <ActionIcon
              variant="light"
              radius="md"
              onClick={openMobileSidebar}
              color="gray"
              style={{
                size: { base: "md", md: "lg" },
              }}
            >
              <IconMenu2 style={{ width: rem(18), height: rem(18) }} />
            </ActionIcon>
          </Tooltip>
          <Anchor
            href="/dashboard"
            component={Link}
            underline="never"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: theme.spacing.xs,
              color:
                theme.colors[theme.primaryColor][
                  colorScheme === "dark" ? 4 : 6
                ],
              transition: "color 0.2s ease",
              outline: "none",
            }}
          >
            <Text
              component="span"
              fw={900}
              fz={{ base: rem(18), sm: rem(20) }}
              style={{
                letterSpacing: "-0.5px",
                textTransform: "uppercase",
              }}
            >
              CanvassingApps
            </Text>
          </Anchor>
        </Group>

        {/* Right Side Controls */}
        <Group gap={isMobile ? "xs" : "md"}>
          <Box display={{ base: "none", sm: "block" }}>
            <ModeToggle />
          </Box>

          {user ? (
            <Group gap={isMobile ? "xs" : "sm"}>
              <Box display={{ base: "none", sm: "block" }}>
                <NotificationMenu />
              </Box>

              <Menu shadow="md" width={200} position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    size="lg"
                    radius="xl"
                    style={{
                      transition: "transform 0.2s ease",
                    }}
                  >
                    {user.user_avatar ? (
                      <Avatar
                        src={user.user_avatar}
                        radius="xl"
                        size="md"
                        alt={user.user_full_name || "User avatar"}
                      />
                    ) : (
                      <Avatar
                        radius="xl"
                        size="md"
                        color="primary"
                        variant="filled"
                      >
                        {user.user_full_name ? (
                          getNameInitials(user.user_full_name)
                        ) : (
                          <IconUserCircle size={20} />
                        )}
                      </Avatar>
                    )}
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    <Stack gap={4}>
                      <Text size="sm" fw={500} c="dark">
                        {user.user_full_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.user_email}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.user_role}
                      </Text>
                    </Stack>
                  </Menu.Label>

                  <Divider my={8} />
                  <Menu.Item
                    component={Link}
                    href="/profile"
                    leftSection={
                      <IconUser style={{ width: rem(18), height: rem(18) }} />
                    }
                  >
                    View Profile
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    onClick={handleLogout}
                    leftSection={
                      <IconLogout style={{ width: rem(18), height: rem(18) }} />
                    }
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          ) : (
            <Group gap={isMobile ? "xs" : "sm"}>
              <Button
                component={Link}
                href="/login"
                variant="outline"
                radius="md"
                size={isMobile ? "compact-sm" : "sm"}
              >
                Sign In
              </Button>
              <Button
                component={Link}
                href="/register"
                radius="md"
                size={isMobile ? "compact-sm" : "sm"}
              >
                Sign Up
              </Button>
            </Group>
          )}
        </Group>
      </Flex>
    </Box>
  );
};

export default Navbar;
