"use client";

import { useSidebarStore } from "@/stores/sidebarStore";
import { useUserStore } from "@/stores/userStore";
import {
  ActionIcon,
  Anchor,
  Box,
  Drawer,
  Group,
  NavLink,
  rem,
  rgba,
  Stack,
  Text,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBell,
  IconChevronRight,
  IconHome,
  IconTicket,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <IconHome style={{ width: rem(18), height: rem(18) }} />,
    href: "/dashboard",
  },
  {
    key: "profile",
    label: "Profile",
    icon: <IconUser style={{ width: rem(18), height: rem(18) }} />,
    href: "/profile",
  },
  {
    key: "tickets",
    label: "Tickets",
    icon: <IconTicket style={{ width: rem(18), height: rem(18) }} />,
    href: "/tickets",
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: <IconBell style={{ width: rem(18), height: rem(18) }} />,
    href: "/notifications",
  },
];

const SIDEBAR_WIDTH = 300;

const MobileSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { colorScheme } = useMantineColorScheme();
  const isMediumScreen = useMediaQuery("(max-width: 62em)");
  const theme = useMantineTheme();

  const { user } = useUserStore();
  const { isMobileSidebarOpen, closeMobileSidebar } = useSidebarStore();

  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigation = (href: string) => {
    if (isNavigating || pathname === href) return;
    setIsNavigating(true);
    router.push(href);
    closeMobileSidebar();

    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!isMediumScreen) {
      closeMobileSidebar();
    }
  }, [isMediumScreen, isMobileSidebarOpen]);

  if (!mounted || !user) return null;

  return (
    <Drawer
      opened={isMobileSidebarOpen}
      onClose={closeMobileSidebar}
      size={SIDEBAR_WIDTH}
      withCloseButton={false}
      withOverlay
      overlayProps={{
        opacity: 0.5,
        blur: 2,
        bg: "#000000",
      }}
      styles={{
        inner: {
          padding: 0,
        },
        content: {
          borderRight: `1px solid ${
            colorScheme === "dark" ? "#2C2E33" : "#E9ECEF"
          }`,
        },
      }}
    >
      <Box>
        <Stack h="100%" justify="space-between">
          <Stack gap="xl">
            {/* Logo */}
            <Group justify="start" pt="md" pl="sm">
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
                  fz={rem(22)}
                  style={{
                    letterSpacing: "-0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  CanvassingApp
                </Text>
              </Anchor>
              <Tooltip label="Close Sidebar">
                <ActionIcon
                  variant="light"
                  size="md"
                  radius="md"
                  onClick={closeMobileSidebar}
                  color="gray"
                  style={{ marginLeft: rem(7) }}
                >
                  <IconX style={{ width: rem(20), height: rem(20) }} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Navigation Links */}
            <Stack gap={6}>
              <Text size="sm" fw={600} c="dimmed" pb={4} pl="xs">
                MAIN MENU
              </Text>
              {links.map((link) => (
                <NavLink
                  key={link.key}
                  leftSection={
                    <Box
                      style={{
                        color: isActive(link.href)
                          ? theme.colors[theme.primaryColor][
                              colorScheme === "dark" ? 4 : 6
                            ]
                          : colorScheme === "dark"
                          ? theme.colors.dark[0]
                          : theme.colors.gray[7],
                        position: "relative",
                        top: 3,
                      }}
                    >
                      {link.icon}
                    </Box>
                  }
                  label={link.label}
                  active={isActive(link.href)}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(link.href);
                  }}
                  rightSection={
                    <IconChevronRight
                      style={{
                        width: rem(14),
                        height: rem(14),
                        opacity: isActive(link.href) ? 1 : 0.3,
                        color: isActive(link.href)
                          ? theme.colors[theme.primaryColor][
                              colorScheme === "dark" ? 4 : 6
                            ]
                          : "inherit",
                      }}
                    />
                  }
                  disabled={isNavigating}
                  styles={{
                    root: {
                      borderRadius: theme.radius.md,
                      fontSize: theme.fontSizes.sm,
                      fontWeight: 500,
                      "&[dataActive]": {
                        backgroundColor:
                          colorScheme === "dark"
                            ? rgba(theme.colors[theme.primaryColor][9], 0.15)
                            : rgba(theme.colors[theme.primaryColor][0], 0.35),
                        color:
                          theme.colors[theme.primaryColor][
                            colorScheme === "dark" ? 4 : 6
                          ],
                        "&:hover": {
                          backgroundColor:
                            colorScheme === "dark"
                              ? rgba(theme.colors[theme.primaryColor][9], 0.2)
                              : rgba(theme.colors[theme.primaryColor][0], 0.45),
                        },
                      },
                    },
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default MobileSidebar;
