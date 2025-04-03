"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";

import { deleteDraftCanvass } from "@/actions/delete";
import { getDraftCanvass } from "@/actions/get";
import { canvassAction, createCanvass, saveCanvassDraft } from "@/actions/post";
import { useUserStore } from "@/stores/userStore";
import { CanvassFormSchema } from "@/utils/zod/schema";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconClipboard,
  IconClock,
  IconCreditCardPay,
  IconMoneybag,
  IconPlus,
  IconSend,
  IconShoppingCart,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import DropzoneFileInput from "./ui/DropzoneFileInput";

type CanvassFormProps = {
  ticketId: string;
  ticketName: string;
  updateCanvassDetails: () => void;
  updateTicketDetails: () => void;
};

type CanvassFormValues = z.infer<typeof CanvassFormSchema>;

type AttachmentData = {
  canvass_attachment_id: string;
  canvass_attachment_url: string;
  canvass_attachment_type: string;
  canvass_attachment_file_type: string;
  canvass_attachment_file_size: number;
  canvass_attachment_created_at: string;
};

const CanvassForm = ({
  ticketId,
  ticketName,
  updateCanvassDetails,
  updateTicketDetails,
}: CanvassFormProps) => {
  const [isPending, startTransition] = useTransition();
  const { user } = useUserStore();

  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [formChanged, setFormChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveAttempt, setLastSaveAttempt] = useState<number>(0);
  const [draftId, setDraftId] = useState<string | null>(null);

  const form = useForm<CanvassFormValues>({
    resolver: zodResolver(CanvassFormSchema),
    defaultValues: {
      RfDateReceived: new Date(),
      leadTimeDay: 1,
      totalAmount: 0,
      paymentTerms: "",
      quotations: [{ file: undefined }],
    },
    mode: "onChange",
  });

  const handleCanvassAction = async (status: string) => {
    if (!user || !ticketId) return;

    try {
      await canvassAction(ticketId, user.user_id, status); // Pass the status argument
    } catch (error) {
      console.error("Error starting canvass:", error);
    }
  };

  // Set up the field array for quotations
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "quotations",
  });

  // Convert a remote URL to a File object
  const urlToFile = async (
    attachment: AttachmentData,
  ): Promise<File | null> => {
    try {
      // Fetch the file
      const response = await fetch(attachment.canvass_attachment_url);
      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();

      // Extract filename from URL
      const url = new URL(attachment.canvass_attachment_url);
      const pathSegments = url.pathname.split("/");
      const fileName = pathSegments[pathSegments.length - 1] || "file";

      // Create a File object from the blob
      const file = new File([blob], fileName, {
        type: attachment.canvass_attachment_file_type,
      });

      return file;
    } catch (error) {
      console.error("Error converting URL to File:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load existing file",
        color: "red",
        icon: <IconX size={16} />,
      });
      return null;
    }
  };

  // Load draft data if exists
  useEffect(() => {
    if (!user || !ticketId) return;

    const loadDraft = async () => {
      setIsLoadingDraft(true);

      try {
        const result = await getDraftCanvass(ticketId, user.user_id);

        if (result.data) {
          // Set draft ID for future updates
          setDraftId(result.data.canvass_draft_id);

          // Load basic form data
          form.setValue(
            "RfDateReceived",
            new Date(result.data.canvass_draft_rf_date_received),
          );

          if (result.data.canvass_draft_recommended_supplier) {
            form.setValue(
              "recommendedSupplier",
              result.data.canvass_draft_recommended_supplier,
            );
          }

          if (result.data.canvass_draft_lead_time_day) {
            form.setValue(
              "leadTimeDay",
              result.data.canvass_draft_lead_time_day,
            );
          }

          if (result.data.canvass_draft_total_amount) {
            form.setValue(
              "totalAmount",
              result.data.canvass_draft_total_amount,
            );
          }

          if (result.data.canvass_draft_payment_terms) {
            form.setValue(
              "paymentTerms",
              result.data.canvass_draft_payment_terms,
            );
          }

          // Handle attachments if they exist
          if (result.data.attachments && result.data.attachments.length > 0) {
            const attachments = result.data.attachments;

            // Find canvass sheet
            const canvassSheet = attachments.find(
              (a) => a.canvass_attachment_type === "CANVASS_SHEET",
            );

            if (canvassSheet) {
              const canvassSheetFile = await urlToFile(canvassSheet);
              if (canvassSheetFile) {
                form.setValue("canvassSheet", canvassSheetFile);
              }
            }

            // Find quotations
            const quotations = attachments
              .filter((a) => a.canvass_attachment_type.startsWith("QUOTATION_"))
              .sort((a, b) => {
                const aNum = parseInt(a.canvass_attachment_type.split("_")[1]);
                const bNum = parseInt(b.canvass_attachment_type.split("_")[1]);
                return aNum - bNum;
              });

            if (quotations.length > 0) {
              // Load quotation files
              const quotationFiles = await Promise.all(
                quotations.map(async (q) => {
                  const file = await urlToFile(q);
                  return { file: file || undefined };
                }),
              );

              // Set form values
              if (quotationFiles.length > 0) {
                form.setValue("quotations", quotationFiles);
              }
            }
          }

          // Show notification that draft was loaded
          notifications.show({
            title: "Draft Loaded",
            message: "Your previously saved draft has been loaded",
            color: "blue",
            icon: <IconCheck size={16} />,
            autoClose: 3000,
          });
        }
      } catch (error) {
        console.error("Error loading draft:", error);
        notifications.show({
          title: "Error",
          message: "Failed to load draft data",
          color: "red",
          icon: <IconX size={16} />,
        });
      } finally {
        setIsLoadingDraft(false);
        // After a short delay, set initialLoad to false to enable auto-save
        setTimeout(() => setInitialLoad(false), 500);
      }
    };

    loadDraft();
  }, [user, ticketId, form]);

  const onSubmit = async (values: CanvassFormValues) => {
    const validatedFields = CanvassFormSchema.safeParse(values);

    if (validatedFields.success) {
      startTransition(async () => {
        const validQuotations = values.quotations
          .map((q) => q.file)
          .filter((file): file is File => file instanceof File);

        const res = await createCanvass({
          RfDateReceived: values.RfDateReceived,
          recommendedSupplier: values.recommendedSupplier,
          leadTimeDay: values.leadTimeDay,
          totalAmount: values.totalAmount,
          paymentTerms: values.paymentTerms,
          canvassSheet: values.canvassSheet,
          quotations: validQuotations,
          ticketId: ticketId,
          ticketName: ticketName,
        });

        if (res.error) {
          notifications.show({
            variant: "error",
            title: "Error",
            message: "Failed to create canvass.",
            color: "red",
            icon: <IconX size={16} />,
          });
        }

        if (res.success) {
          notifications.show({
            variant: "success",
            title: "Success",
            message: "Canvass created successfully.",
            color: "green",
            icon: <IconCheck size={16} />,
          });
          form.reset();

          // Delete the draft if it exists
          if (draftId) {
            await deleteDraftCanvass(draftId);
            setDraftId(null);
          }

          handleCanvassAction("FOR REVIEW OF SUBMISSIONS");
          updateTicketDetails();
          updateCanvassDetails();
        }
      });
    }
  };

  // Define the auto-save function with debounce
  const debouncedAutoSave = useDebouncedCallback(
    async (values: CanvassFormValues) => {
      // Check conditions that would prevent saving
      if (!formChanged || initialLoad || !user) return;
      if (isSaving) return; // Don't save if already saving

      // Throttle saves to prevent too many requests (at least 1.5 seconds between saves)
      const now = Date.now();
      if (now - lastSaveAttempt < 1500) return;

      setLastSaveAttempt(now);

      // No need to validate for drafts - save whatever state we're in
      setIsSaving(true);

      // Show saving notification
      const notificationId = notifications.show({
        loading: true,
        title: "Saving Draft",
        message: "Saving your changes...",
        autoClose: false,
        withCloseButton: false,
      });

      try {
        // Filter out files for quotations
        const validQuotations = values.quotations.map((q) =>
          q.file instanceof File ? q.file : null,
        );

        const result = await saveCanvassDraft({
          RfDateReceived: values.RfDateReceived,
          recommendedSupplier: values.recommendedSupplier,
          leadTimeDay: values.leadTimeDay,
          totalAmount: values.totalAmount,
          paymentTerms: values.paymentTerms,
          canvassSheet:
            values.canvassSheet instanceof File ? values.canvassSheet : null,
          quotations: validQuotations,
          ticketId,
          userId: user.user_id,
        });

        if (result.error) {
          notifications.update({
            id: notificationId,
            color: "red",
            title: "Error",
            message: result.error,
            icon: <IconX size={16} />,
            loading: false,
            autoClose: 3000,
          });
        } else {
          // Store the draft ID for future updates
          if (result.draftId) {
            setDraftId(result.draftId);
          }

          notifications.update({
            id: notificationId,
            color: "green",
            title: "Draft Saved",
            message: "Your draft has been saved",
            icon: <IconCheck size={16} />,
            loading: false,
            autoClose: 2000,
          });
        }
      } catch (error) {
        notifications.update({
          id: notificationId,
          color: "red",
          title: "Error",
          message: "Failed to save draft",
          icon: <IconAlertCircle size={16} />,
          loading: false,
          autoClose: 3000,
        });
        console.error("Auto-save error:", error);
      } finally {
        setIsSaving(false);
      }
    },
    700, // 700ms debounce
  );

  // Watch for changes in the form
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Ignore initial form population
      if (initialLoad) return;

      // Mark form as changed and trigger auto-save
      setFormChanged(true);
      debouncedAutoSave(value as CanvassFormValues);
    });

    return () => subscription.unsubscribe();
  }, [form.watch, debouncedAutoSave, initialLoad]);

  const addQuotation = useCallback(() => {
    if (fields.length < 4) {
      append({ file: undefined });
    }
  }, [fields.length, append]);

  return (
    <Container size="md" px="0">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="xl">
          {/* Basic Information Section */}
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <DateInput
                {...form.register("RfDateReceived")}
                value={form.watch("RfDateReceived")}
                onChange={(date) =>
                  form.setValue("RfDateReceived", date || new Date())
                }
                error={form.formState.errors.RfDateReceived?.message as string}
                label="RF Date Received"
                placeholder="Select RF date"
                disabled={isPending || isLoadingDraft}
                required
                radius="md"
                leftSection={
                  <IconClipboard
                    size={16}
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  />
                }
                size="md"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                {...form.register("recommendedSupplier")}
                error={form.formState.errors.recommendedSupplier?.message}
                label="Recommended Supplier"
                placeholder="Enter recommended supplier"
                disabled={isPending || isLoadingDraft}
                required
                radius="md"
                size="md"
                leftSection={
                  <IconShoppingCart
                    size={16}
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  />
                }
              />
            </Grid.Col>
          </Grid>

          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                {...form.register("leadTimeDay", {
                  valueAsNumber: true,
                })}
                error={form.formState.errors.leadTimeDay?.message}
                label="Lead Time (days)"
                name="leadTimeDay"
                placeholder="Enter lead time"
                type="number"
                required
                disabled={isPending || isLoadingDraft}
                radius="md"
                step="any"
                size="md"
                leftSection={
                  <IconClock
                    size={16}
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                {...form.register("totalAmount", {
                  valueAsNumber: true,
                })}
                error={form.formState.errors.totalAmount?.message}
                label="Total Amount"
                name="totalAmount"
                placeholder="Enter Total Amount"
                type="number"
                required
                disabled={isPending || isLoadingDraft}
                radius="md"
                step="any"
                size="md"
                leftSection={
                  <IconMoneybag
                    size={16}
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  />
                }
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                {...form.register("paymentTerms")}
                error={form.formState.errors.paymentTerms?.message}
                label="Payment Terms"
                placeholder="e.g., Net 30"
                disabled={isPending || isLoadingDraft}
                required
                radius="md"
                size="md"
                leftSection={
                  <IconCreditCardPay
                    size={16}
                    style={{ color: "var(--mantine-color-blue-6)" }}
                  />
                }
                styles={{
                  input: {
                    "&:focus": {
                      borderColor: "var(--mantine-color-blue-6)",
                    },
                  },
                }}
              />
            </Grid.Col>
          </Grid>

          <Stack gap="lg">
            {/* Canvass Sheet Upload */}
            <Box>
              <Text size="md" fw={500} mb={5}>
                Canvass Sheet{" "}
                <Text component="span" c="red">
                  *
                </Text>
              </Text>
              <Controller
                name="canvassSheet"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <DropzoneFileInput
                      onChange={(files) => field.onChange(files)}
                      value={field.value}
                      isLoading={isLoadingDraft}
                    />
                    {fieldState.error && (
                      <Text c="red" size="sm" mt={5}>
                        {fieldState.error.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </Box>

            {/* Quotations Section */}
            <Stack gap="md">
              {fields.map((field, index) => (
                <Box key={field.id}>
                  <Group justify="space-between" mb="xs">
                    <Text size="md" fw={500}>
                      Quotation {index + 1}
                      {index === 0 && (
                        <Text component="span" c="red">
                          {" "}
                          *
                        </Text>
                      )}
                    </Text>
                    {index > 0 && (
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => remove(index)}
                        disabled={isPending || isLoadingDraft}
                      >
                        <IconTrash size={16} />
                      </Button>
                    )}
                  </Group>
                  <Controller
                    name={`quotations.${index}.file`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <>
                        <DropzoneFileInput
                          onChange={(files) => field.onChange(files)}
                          value={field.value}
                          isLoading={isLoadingDraft}
                        />
                        {fieldState.error && (
                          <Text c="red" size="sm" mt={5}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </Box>
              ))}

              {fields.length < 4 && (
                <Button
                  variant="light"
                  onClick={addQuotation}
                  disabled={isPending || isLoadingDraft || fields.length >= 4}
                  leftSection={<IconPlus size={16} />}
                  color="blue"
                  fullWidth
                  size="md"
                >
                  Add Quotation ({fields.length}/4)
                </Button>
              )}
            </Stack>
          </Stack>

          <Group justify="flex-end">
            <Button
              type="submit"
              loading={isPending}
              size="md"
              radius="md"
              leftSection={<IconSend size={18} />}
              disabled={isLoadingDraft}
            >
              Submit Form
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  );
};

export default CanvassForm;
