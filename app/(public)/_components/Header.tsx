"use client";

import { userLogout } from "@/actions/post";
import NotificationMenu from "@/components/NotificationMenu";
import ModeToggle from "@/components/ThemeToggle";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import {
  Anchor,
  Avatar,
  Box,
  Burger,
  Button,
  Container,
  Drawer,
  Flex,
  Group,
  Menu,
  rem,
  Stack,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconBell,
  IconChevronDown,
  IconHome,
  IconLogout2,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const Header = () => {
  const theme = useMantineTheme();
  const { user, clearUser } = useUserStore();
  const { colorScheme } = useMantineColorScheme();
  const [, startTransition] = useTransition();
  const [activeLink, setActiveLink] = useState("/");

  // Responsive breakpoints
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const isTablet = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
  const isLargeScreen = useMediaQuery(`(min-width: ${theme.breakpoints.lg})`);

  const isDark = colorScheme === "dark";
  const router = useRouter();

  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);

  // Close drawer on screen resize to prevent UI issues
  useEffect(() => {
    if (!isTablet && drawerOpened) {
      closeDrawer();
    }
  }, [isTablet, drawerOpened, closeDrawer]);

  const headerLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Contact Us", href: "#contact-us" },
  ];

  const handleLogout = () => {
    startTransition(() => {
      userLogout();
      clearUser();
      router.push("/login");
    });
  };

  const handleLinkClick = (href: string) => {
    setActiveLink(href);
    closeDrawer();
  };

  return (
    <Box
      component="header"
      style={{
        position: "sticky",
        top: 0,
        backdropFilter: "blur(10px)",
        zIndex: 1000,
      }}
    >
      <Container
        size="xl"
        style={{ zIndex: 10000 }}
        w="100%"
        px={isMobile ? "xs" : "md"}
      >
        <Flex justify="space-between" align="center" h={isMobile ? 60 : 70}>
          <Group>
            {isMobile && <ModeToggle />}
            {/* Logo */}
            <Anchor
              href="/"
              component={Link}
              underline="never"
              fw={900}
              fz={isMobile ? rem(18) : rem(22)}
              style={{
                letterSpacing: "-0.5px",
                transition: "color 0.2s ease",
              }}
            >
              <Text component="span" inherit>
                CANVASSING
              </Text>
              <Text component="span" inherit>
                APP
              </Text>
            </Anchor>
          </Group>

          {/* Header Links - Only visible on tablet and above */}
          <Group
            h="100%"
            gap={isLargeScreen ? 40 : 20}
            display={{ base: "none", md: "flex" }}
          >
            {headerLinks.map((headerLink) => (
              <Anchor
                key={headerLink.label}
                href={headerLink.href}
                underline="never"
                fw={500}
                size={isLargeScreen ? "sm" : "xs"}
                c={
                  activeLink === headerLink.href
                    ? theme.colors[theme.primaryColor][isDark ? 4 : 6]
                    : isDark
                    ? "white"
                    : "black"
                }
                onClick={() => handleLinkClick(headerLink.href)}
                style={{
                  transition: "all 0.2s ease",
                  position: "relative",
                  padding: "8px 0",
                }}
              >
                {headerLink.label}
              </Anchor>
            ))}
          </Group>

          {user ? (
            <Group gap={isMobile ? "xs" : "md"}>
              {!isMobile && <ModeToggle />}
              {!isMobile && <NotificationMenu />}
              <Menu
                shadow="md"
                width={240}
                position="bottom-end"
                withArrow
                withinPortal
              >
                <Menu.Target>
                  <Flex gap="xs" align="center" style={{ cursor: "pointer" }}>
                    <Avatar
                      src={user.user_avatar || undefined}
                      radius="xl"
                      size={"md"}
                    >
                      {user.user_avatar
                        ? null
                        : getNameInitials(user.user_full_name)}
                    </Avatar>
                    {!isMobile && (
                      <Box display={{ base: "none", sm: "block" }}>
                        <Text size="sm" fw={500}>
                          {user.user_full_name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {user.user_email}
                        </Text>
                      </Box>
                    )}
                    {!isMobile && <IconChevronDown size={16} />}
                  </Flex>
                </Menu.Target>

                <Menu.Dropdown style={{ zIndex: 1100 }}>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item
                    component={Link}
                    href="/dashboard"
                    leftSection={
                      <IconHome style={{ width: rem(18), height: rem(18) }} />
                    }
                  >
                    Dashboard
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    href="/profile"
                    leftSection={
                      <IconUser style={{ width: rem(18), height: rem(18) }} />
                    }
                  >
                    View Profile
                  </Menu.Item>
                  {isMobile && (
                    <>
                      <Menu.Item
                        component={Link}
                        href="/notifications"
                        leftSection={
                          <IconBell
                            style={{ width: rem(18), height: rem(18) }}
                          />
                        }
                      >
                        Notifications
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    onClick={handleLogout}
                    leftSection={
                      <IconLogout2
                        style={{ width: rem(18), height: rem(18) }}
                      />
                    }
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Burger
                opened={drawerOpened}
                onClick={toggleDrawer}
                display={{ base: "block", md: "none" }}
                size={isMobile ? "sm" : "md"}
                color={isDark ? theme.colors.gray[3] : theme.colors.gray[7]}
              />
            </Group>
          ) : (
            <Flex gap={isMobile ? "xs" : "sm"} justify="center" align="center">
              {!isMobile && (
                <Box>
                  <ModeToggle />
                </Box>
              )}
              <Group
                align="center"
                justify="center"
                display={{ base: "none", md: "flex" }}
              >
                <Button
                  component={Link}
                  href="/login"
                  variant="outline"
                  radius="md"
                  size={isMobile ? "xs" : "sm"}
                  style={{
                    borderColor:
                      theme.colors[theme.primaryColor][isDark ? 4 : 6],
                    color: theme.colors[theme.primaryColor][isDark ? 4 : 6],
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href="/register"
                  variant="filled"
                  color={theme.primaryColor}
                  radius="md"
                  size={isMobile ? "xs" : "sm"}
                  style={{
                    boxShadow: isDark ? "none" : theme.shadows.sm,
                  }}
                >
                  Sign Up
                </Button>
              </Group>
              <Burger
                opened={drawerOpened}
                onClick={toggleDrawer}
                display={{ base: "block", md: "none" }}
                size={isMobile ? "sm" : "md"}
                color={isDark ? theme.colors.gray[3] : theme.colors.gray[7]}
              />
            </Flex>
          )}
        </Flex>
      </Container>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        title={
          <Flex align="center" gap="sm">
            {isMobile && user && <ModeToggle />}
            <Text
              fw={900}
              size={isMobile ? "lg" : "xl"}
              gradient={{
                from: theme.primaryColor,
                to: isDark ? "cyan" : "blue",
              }}
              variant="gradient"
              style={{
                letterSpacing: "-0.5px",
                fontFamily: theme.headings.fontFamily,
              }}
            >
              CANVASSINGAPP
            </Text>
          </Flex>
        }
        zIndex={1000}
        overlayProps={{
          backgroundOpacity: 0.5,
          blur: 4,
        }}
      >
        <Flex direction="column" justify="space-between" h="90%" w="100%">
          <Stack
            gap={isMobile ? "lg" : "xl"}
            px="md"
            mt={isMobile ? "md" : "xl"}
          >
            {headerLinks.map((link) => (
              <Anchor
                component={Link}
                key={link.label}
                href={link.href}
                underline="never"
                fw={600}
                size={isMobile ? "md" : "lg"}
                ta="center"
                onClick={() => handleLinkClick(link.href)}
                c={
                  activeLink === link.href
                    ? theme.colors[theme.primaryColor][isDark ? 4 : 6]
                    : isDark
                    ? "white"
                    : "black"
                }
                style={{
                  transition: "color 0.2s ease",
                  padding: "8px 0",
                }}
              >
                {link.label}
              </Anchor>
            ))}
          </Stack>

          {!user && (
            <Stack w="100%" gap="md" mb={isMobile ? "md" : "xl"}>
              {isMobile && (
                <Box ta="center" mb="md">
                  <ModeToggle />
                </Box>
              )}
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  router.push("/login");
                  closeDrawer();
                }}
                radius="md"
                size={isMobile ? "md" : "lg"}
                style={{
                  borderColor: theme.colors[theme.primaryColor][isDark ? 4 : 6],
                  color: theme.colors[theme.primaryColor][isDark ? 4 : 6],
                }}
              >
                Sign in
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  router.push("/register");
                  closeDrawer();
                }}
                color={theme.primaryColor}
                radius="md"
                size={isMobile ? "md" : "lg"}
              >
                Sign up
              </Button>
            </Stack>
          )}
        </Flex>
      </Drawer>
    </Box>
  );
};

export default Header;
