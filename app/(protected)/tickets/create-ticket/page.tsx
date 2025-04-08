"use client";

import { getManagers, getReviewers } from "@/actions/get";
import { createTicket } from "@/actions/post";
import PageHeader from "@/components/PageHeader";
import {
  RichTextEditor,
  RichTextEditorRef,
} from "@/components/ui/RichTextEditor";
import { useUserStore } from "@/stores/userStore";
import { getNameInitials } from "@/utils/functions";
import { ReviewerType } from "@/utils/types";
import { TicketFormSchema } from "@/utils/zod/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClipboard,
  IconPencil,
  IconSettings,
  IconTrash,
  IconUsers,
  IconUserSearch,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const CreateTicketPage = () => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useUserStore();

  const noteEditorRef = useRef<RichTextEditorRef>(null);
  const specificationsEditorRef = useRef<RichTextEditorRef>(null);

  const [isPending, startTransition] = useTransition();
  const [noteValue, setNoteValue] = useState<string>("");
  const [specificationsValue, setSpecificationsValue] = useState<string>("");
  const [reviewerOptions, setReviewerOptions] = useState<ReviewerType[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<ReviewerType[]>(
    []
  );
  const [managerOptions, setManagerOptions] = useState<ReviewerType[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<ReviewerType[]>([]);

  const form = useForm<z.infer<typeof TicketFormSchema>>({
    resolver: zodResolver(TicketFormSchema),
    defaultValues: {
      ticketItemName: "",
      ticketItemDescription: "",
      ticketQuantity: 1,
      ticketSpecification: "",
      ticketNotes: "",
      ticketRfDateReceived: new Date(),
      ticketReviewer: [],
    },
  });

  const getReviewersFilteredOptions = () => {
    const filteredReviewers = reviewerOptions.filter(
      (option) =>
        !selectedReviewers.some(
          (reviewer) => reviewer.user_id === option.user_id
        )
    );

    return filteredReviewers.map((reviewer) => ({
      value: reviewer.user_id,
      label: reviewer.user_full_name,
    }));
  };

  const getManagersFilteredOptions = () => {
    const filteredManagers = managerOptions.filter(
      (option) =>
        !selectedManagers.some((manager) => manager.user_id === option.user_id)
    );

    return filteredManagers.map((manager) => ({
      value: manager.user_id,
      label: manager.user_full_name,
    }));
  };

  const addReviewer = (value: string | null) => {
    if (!value) return;

    const selectedOption = reviewerOptions.find(
      (option) => option.user_id === value
    );
    if (
      selectedOption &&
      !selectedReviewers.some((reviewer) => reviewer.user_id === value)
    ) {
      const newReviewer: ReviewerType = {
        user_id: selectedOption.user_id,
        user_full_name: selectedOption.user_full_name,
        user_email: selectedOption.user_email,
      };

      setSelectedReviewers([...selectedReviewers, newReviewer]);
      form.setValue("ticketReviewer", [
        ...selectedReviewers.map((r) => r.user_id),
        value,
      ]);

      form.clearErrors("ticketReviewer");
    }
  };

  const addManager = (value: string | null) => {
    if (!value) return;

    const selectedOption = managerOptions.find(
      (option) => option.user_id === value
    );
    if (
      selectedOption &&
      !selectedManagers.some((manager) => manager.user_id === value)
    ) {
      const newManager: ReviewerType = {
        user_id: selectedOption.user_id,
        user_full_name: selectedOption.user_full_name,
        user_email: selectedOption.user_email,
      };

      setSelectedManagers([...selectedManagers, newManager]);
      form.setValue("ticketManager", [
        ...selectedManagers.map((r) => r.user_id),
        value,
      ]);

      form.clearErrors("ticketManager");
    }
  };

  const removeReviewer = (id: string) => {
    const updatedReviewers = selectedReviewers.filter(
      (reviewer) => reviewer.user_id !== id
    );
    setSelectedReviewers(updatedReviewers);
    form.setValue(
      "ticketReviewer",
      updatedReviewers.map((r) => r.user_id)
    );
  };

  const removeManager = (id: string) => {
    const updatedManagers = selectedManagers.filter(
      (manager) => manager.user_id !== id
    );
    setSelectedManagers(updatedManagers);
    form.setValue(
      "ticketManager",
      updatedManagers.map((r) => r.user_id)
    );
  };

  const onSubmit = async (values: z.infer<typeof TicketFormSchema>) => {
    if (!user || !user.user_id) return;

    values.ticketNotes = noteValue;
    values.ticketSpecification = specificationsValue;

    const validatedFields = TicketFormSchema.safeParse(values);

    if (validatedFields.success) {
      startTransition(async () => {
        const res = await createTicket(validatedFields.data, user.user_id);

        if (res.success) {
          notifications.show({
            title: "Success",
            message: "Your ticket has been created successfully.",
            color: "green",
            icon: <IconCheck size={16} />,
            autoClose: 5000,
          });
          form.clearErrors();
          form.reset();
          setSelectedReviewers([]);
          setSelectedManagers([]);
          setNoteValue("");
          setSpecificationsValue("");
          noteEditorRef.current?.reset();
          specificationsEditorRef.current?.reset();
          router.push(`/tickets/${res.ticket_id}`);
        } else {
          notifications.show({
            title: "Error",
            message: res.message || "Failed to create ticket.", // ✅ Show the actual error
            color: "red",
            icon: <IconX size={16} />,
            autoClose: 5000,
          });
        }
      });
    }
  };

  useEffect(() => {
    const fetchReviewers = async () => {
      const res = await getReviewers();
      if (res) {
        setReviewerOptions(res as ReviewerType[]);
      }
    };

    const fetchManagers = async () => {
      const res = await getManagers();
      if (res) {
        setManagerOptions(res as ReviewerType[]);
      }
    };

    fetchReviewers();
    fetchManagers();
  }, []);

  if (!user) {
    return null;
  }

  const breadcrumbs = [
    {
      title: "Dashboard",
      href: "/dashboard",
    },
    {
      title: "Tickets",
      href: "/tickets",
    },
    {
      title: "Create Ticket",
      href: "/tickets/create-ticket",
    },
  ];

  return (
    <Box p={{ base: "md", sm: "xl" }}>
      <Box mb="lg">
        <PageHeader
          title="Create New Ticket"
          description={
            <>
              Fill out the form below to create a new ticket. Fields marked with
              <span style={{ color: "red" }}> * </span>
              are required.
            </>
          }
          breadcrumbs={breadcrumbs}
        />
      </Box>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Grid gutter="xl">
          {/* Left Column */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              <DateInput
                {...form.register("ticketRfDateReceived")}
                value={form.watch("ticketRfDateReceived")}
                onChange={(date) =>
                  form.setValue("ticketRfDateReceived", date || new Date())
                }
                error={form.formState.errors.ticketRfDateReceived?.message}
                label="RF Date Received"
                placeholder="Select RF date"
                disabled={isPending}
                required
                radius="md"
                leftSection={<IconClipboard size={16} />}
                size="sm"
              />

              <TextInput
                {...form.register("ticketItemName")}
                error={form.formState.errors.ticketItemName?.message}
                label="Item Name"
                placeholder="Enter item name"
                disabled={isPending}
                required
                radius="md"
                leftSection={<IconPencil size={16} />}
                size="sm"
              />

              <Textarea
                {...form.register("ticketItemDescription")}
                error={form.formState.errors.ticketItemDescription?.message}
                label="Item Description"
                placeholder="Enter item description"
                disabled={isPending}
                required
                radius="md"
                minRows={3}
                size="sm"
              />

              <TextInput
                {...form.register("ticketQuantity", {
                  valueAsNumber: true,
                })}
                error={form.formState.errors.ticketQuantity?.message}
                label="Quantity"
                description="Number of items requested"
                placeholder="Enter quantity"
                type="number"
                required
                disabled={isPending}
                radius="md"
                leftSection={<IconSettings size={16} />}
                descriptionProps={{ fz: "sm" }}
                size="sm"
              />

              {/* Managers */}
              <Stack gap={8}>
                <Group justify="space-between">
                  <Text fw={500} size="sm">
                    Select Managers <span style={{ color: "red" }}> * </span>
                  </Text>
                  <Badge variant="light" radius="sm" size="sm" color="teal">
                    {selectedManagers.length} manager(s)
                  </Badge>
                </Group>

                <Select
                  key={selectedManagers.length}
                  placeholder="Search and select managers"
                  data={getManagersFilteredOptions()}
                  onChange={addManager}
                  disabled={isPending}
                  clearable
                  searchable
                  leftSection={<IconUsers size={16} />}
                  radius="md"
                  nothingFoundMessage="No more managers available"
                  size="sm"
                />

                {form.formState.errors.ticketManager?.message && (
                  <Text size="xs" c="red">
                    {form.formState.errors.ticketManager.message}
                  </Text>
                )}

                {selectedManagers.length > 0 ? (
                  <Stack gap="xs">
                    {selectedManagers.map((manager) => (
                      <Paper
                        key={manager.user_id}
                        p="sm"
                        withBorder
                        radius="md"
                      >
                        <Flex
                          align="center"
                          justify="space-between"
                          direction="row"
                        >
                          <Group justify="center">
                            <Avatar
                              radius="xl"
                              color={isDark ? "teal" : "teal"}
                            >
                              {getNameInitials(manager.user_full_name)}
                            </Avatar>
                            <Stack gap={0}>
                              <Text fw={500} fz="sm">
                                {manager.user_full_name}
                              </Text>
                              <Text fz="xs" c="dimmed">
                                {manager.user_email}
                              </Text>
                            </Stack>
                          </Group>
                          <Tooltip label="Remove manager">
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeManager(manager.user_id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Flex>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Paper withBorder p="xl" radius="md" ta="center">
                    <Stack align="center" gap="sm">
                      <ThemeIcon
                        size="xl"
                        radius="xl"
                        color="teal"
                        variant="light"
                      >
                        <IconUserSearch size={28} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={500} size="sm">
                          No managers selected
                        </Text>
                        <Text c="dimmed" size="sm">
                          Assign a managers to this ticket
                        </Text>
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </Stack>

              {/* Reviewers */}
              <Stack gap={8}>
                <Group justify="space-between">
                  <Text fw={500} size="sm">
                    Select Reviewers <span style={{ color: "red" }}> * </span>
                  </Text>
                  <Badge variant="light" radius="sm" size="sm">
                    {selectedReviewers.length} reviewer(s)
                  </Badge>
                </Group>

                <Select
                  key={selectedReviewers.length}
                  placeholder="Search and select reviewer"
                  data={getReviewersFilteredOptions()}
                  onChange={addReviewer}
                  disabled={isPending}
                  clearable
                  searchable
                  leftSection={<IconUsers size={16} />}
                  radius="md"
                  nothingFoundMessage="No more reviewers available"
                  size="sm"
                />

                {form.formState.errors.ticketReviewer?.message && (
                  <Text size="xs" c="red">
                    {form.formState.errors.ticketReviewer.message}
                  </Text>
                )}

                {selectedReviewers.length > 0 ? (
                  <Stack gap="xs">
                    {selectedReviewers.map((reviewer) => (
                      <Paper
                        key={reviewer.user_id}
                        p="sm"
                        withBorder
                        radius="md"
                      >
                        <Flex
                          align="center"
                          justify="space-between"
                          direction="row"
                        >
                          <Group justify="center">
                            <Avatar
                              radius="xl"
                              color={isDark ? "blue.8" : "blue.5"}
                            >
                              {getNameInitials(reviewer.user_full_name)}
                            </Avatar>
                            <Stack gap={0}>
                              <Text fw={500} fz="sm">
                                {reviewer.user_full_name}
                              </Text>
                              <Text fz="xs" c="dimmed">
                                {reviewer.user_email}
                              </Text>
                            </Stack>
                          </Group>
                          <Tooltip label="Remove reviewer">
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeReviewer(reviewer.user_id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Flex>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Paper withBorder p="xl" radius="md" ta="center">
                    <Stack align="center" gap="sm">
                      <ThemeIcon
                        size="xl"
                        radius="xl"
                        color="blue.5"
                        variant="light"
                      >
                        <IconUserSearch size={28} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={500} size="sm">
                          No reviewers selected
                        </Text>
                        <Text c="dimmed" size="sm">
                          Assign a reviewers to this ticket
                        </Text>
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Stack>
          </Grid.Col>

          {/* Right Column */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            {/* Specification */}
            <Stack gap={0} mb="xl">
              <Stack gap={0}>
                <Text fw={500} size="sm">
                  Specifications{" "}
                  <Text component="span" c="red">
                    *
                  </Text>
                </Text>
                <Text size="sm" c="dimmed" mb="xs">
                  Add technical specifications or requirements
                </Text>
              </Stack>
              <RichTextEditor
                ref={specificationsEditorRef}
                value={specificationsValue}
                onChange={(value) => {
                  setSpecificationsValue(value);
                  form.setValue("ticketSpecification", value);
                }}
              />
              {form.formState.errors.ticketSpecification?.message && (
                <Text c="red" size="sm" mt={5}>
                  {form.formState.errors.ticketSpecification?.message}
                </Text>
              )}
            </Stack>

            {/* Notes */}
            <Stack gap={0} mb="lg">
              <Stack gap={0}>
                <Text fw={500} size="sm">
                  Notes
                </Text>
                <Text size="sm" c="dimmed" mb="xs">
                  Add any additional notes or comments
                </Text>
              </Stack>
              <RichTextEditor
                ref={noteEditorRef}
                value={noteValue}
                onChange={(value) => {
                  setNoteValue(value);
                  form.setValue("ticketNotes", value);
                }}
              />
            </Stack>

            <Group
              align="row"
              justify="flex-end"
              gap="md"
              style={{ width: "100%" }}
            >
              {/* Cancel button */}
              <Button
                color="gray"
                variant="light"
                type="button"
                loading={isPending}
                disabled={isPending}
                radius="md"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isPending}
                disabled={isPending}
                radius="md"
                color={isDark ? "blue.6" : "blue.5"}
                size="sm"
              >
                Create Ticket
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </form>
    </Box>
  );
};

export default CreateTicketPage;
