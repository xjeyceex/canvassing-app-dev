"use client";

import LoadingStatePublic from "@/components/LoadingStatePublic";
import ModeToggle from "@/components/ThemeToggle";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Divider,
  FileInput,
  Flex,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  rem,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconPhoto,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const TeamFormSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  type: z.string().min(1, "Team type is required"),
  avatar: z.any().optional(),
});

type FormValues = z.infer<typeof TeamFormSchema>;

const CreateTeamPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(TeamFormSchema),
    defaultValues: {
      name: "",
      type: "",
      avatar: null,
    },
  });

  const handleFileChange = (file: File | null) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setValue("avatar", file);
    }
  };

  const clearAvatar = () => {
    setValue("avatar", null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      console.log("Team data:", values);

      notifications.show({
        title: "Team Created Successfully",
        message: `${values.name} has been created and is ready to go!`,
        color: "teal",
        autoClose: 5000,
      });

      setTimeout(() => {
        router.push("/teams");
      }, 1500);
    } catch (error) {
      console.error("Error creating team:", error);
      notifications.show({
        title: "Creation Failed",
        message: "We couldn't create your team. Please try again.",
        color: "red",
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  if (!isMounted) {
    return <LoadingStatePublic />;
  }

  return (
    <Box bg={isDark ? "dark.8" : "gray.0"} mih="100vh">
      {/* Header */}
      <Box
        component="header"
        bg={isDark ? "dark.7" : "white"}
        style={{
          borderBottom: `${rem(1)} solid ${
            isDark ? theme.colors.dark[5] : theme.colors.gray[2]
          }`,
        }}
      >
        <Container size="xl">
          <Flex justify="space-between" align="center" h={rem(70)} px={rem(16)}>
            <Group gap={rem(24)}>
              <Anchor
                href="/teams"
                component={Link}
                underline="never"
                c={isDark ? "gray.5" : "gray.7"}
              >
                <Group gap={rem(8)}>
                  <IconArrowLeft size={18} />
                  <Text size="sm" fw={500}>
                    Back to Home
                  </Text>
                </Group>
              </Anchor>
              <Divider orientation="vertical" />
              <Title order={4} fw={600} c={isDark ? "white" : "dark.9"}>
                Create New Team
              </Title>
            </Group>
            <ModeToggle />
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Container size="sm" py={rem(48)}>
        <Card withBorder padding={0} bg={isDark ? "dark.7" : "white"} pt={0}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap={0}>
              {/* Form Header */}
              <Text
                size="lg"
                fw={600}
                c={isDark ? "white" : "dark.9"}
                px="lg"
                py="md"
              >
                Let{"'"}s set up your new team
              </Text>

              <Divider />

              {/* Form Content */}
              <Box p={rem(24)}>
                <Stack gap={rem(24)}>
                  {/* Team Name Input */}
                  <Stack gap={6}>
                    <TextInput
                      label="Team Name"
                      placeholder="Enter a distinctive name for your team"
                      error={errors.name?.message}
                      required
                      radius="md"
                      {...register("name")}
                    />
                    <Text size="xs" c="dimmed">
                      This will be your team{"'"}s identity across the platform.
                    </Text>
                  </Stack>

                  {/* Team Avatar Upload */}
                  <Box>
                    <Text fw={500} size="sm" mb={rem(8)}>
                      Team Avatar
                    </Text>
                    <Group align="flex-start" gap={rem(24)}>
                      <Box style={{ width: rem(120), height: rem(120) }}>
                        {previewUrl ? (
                          <Paper
                            pos="relative"
                            radius="md"
                            style={{
                              width: rem(120),
                              height: rem(120),
                              overflow: "hidden",
                            }}
                          >
                            <Image
                              src={previewUrl}
                              alt="Team avatar preview"
                              fit="cover"
                              w={rem(120)}
                              h={rem(120)}
                            />
                            <ActionIcon
                              variant="filled"
                              color="red"
                              radius="xl"
                              size="sm"
                              pos="absolute"
                              top={8}
                              right={8}
                              onClick={clearAvatar}
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </Paper>
                        ) : (
                          <Flex
                            align="center"
                            justify="center"
                            bg={isDark ? "dark.6" : "gray.1"}
                            style={{
                              width: rem(120),
                              height: rem(120),
                              borderRadius: theme.radius.md,
                            }}
                          >
                            <IconPhoto
                              size={32}
                              color={
                                isDark
                                  ? theme.colors.dark[3]
                                  : theme.colors.gray[5]
                              }
                            />
                          </Flex>
                        )}
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <FileInput
                          accept="image/*"
                          placeholder="Choose an image"
                          radius="md"
                          leftSection={<IconUpload size={16} />}
                          onChange={handleFileChange}
                        />
                        <Text size="xs" c="dimmed" mt={rem(8)}>
                          Recommended: Square image (1:1 ratio), minimum
                          512x512px
                        </Text>
                      </Box>
                    </Group>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Form Actions */}
              <Box p={rem(24)} py="md">
                <Group justify="flex-end">
                  <Button
                    variant={isDark ? "subtle" : "light"}
                    color="gray"
                    radius="md"
                    component={Link}
                    href="/teams"
                    fz="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    radius="md"
                    fz="sm"
                  >
                    Create Team
                  </Button>
                </Group>
              </Box>
            </Stack>
          </form>
        </Card>
      </Container>
    </Box>
  );
};

export default CreateTeamPage;
