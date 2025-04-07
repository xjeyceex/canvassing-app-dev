import { changePassword } from "@/actions/update";
import { ChangePasswordSchema } from "@/utils/zod/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type ChangePasswordModalProps = {
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
};

const ChangePasswordModal = ({
  isModalOpen,
  setIsModalOpen,
}: ChangePasswordModalProps) => {
  const form = useForm<z.infer<typeof ChangePasswordSchema>>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [isPending, startTransition] = useTransition();

  const handleChangePassword = (
    values: z.infer<typeof ChangePasswordSchema>
  ) => {
    const validatedFields = ChangePasswordSchema.safeParse(values);

    if (validatedFields.success) {
      startTransition(async () => {
        const result = await changePassword(
          values.currentPassword,
          values.newPassword
        );

        if (result?.error && result.OldPasswordErrorMessage) {
          form.setError("currentPassword", {
            type: "manual",
            message: result.OldPasswordErrorMessage,
          });
          return;
        }

        if (result?.error && result.message) {
          form.setError("newPassword", {
            type: "manual",
            message: result.message,
          });
          return;
        }

        notifications.show({
          title: "Success",
          message: "Password changed successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
        setIsModalOpen(false);
      });
    }
  };

  return (
    <Modal
      opened={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        form.reset();
        form.clearErrors();
      }}
      title={
        <Text fz="h3" fw={700} p="xs" pb={0}>
          Change your password
        </Text>
      }
      centered
      w={400}
      withCloseButton={false}
    >
      <form onSubmit={form.handleSubmit(handleChangePassword)}>
        <Stack gap="md" p="xs" pt="0">
          <PasswordInput
            {...form.register("currentPassword")}
            error={form.formState.errors.currentPassword?.message}
            label="Current Password"
            placeholder="Enter your current password"
            disabled={isPending}
            radius="md"
            withAsterisk
          />

          <PasswordInput
            {...form.register("newPassword")}
            error={form.formState.errors.newPassword?.message}
            label="New Password"
            placeholder="Enter new password"
            disabled={isPending}
            radius="md"
            withAsterisk
          />

          <PasswordInput
            {...form.register("confirmPassword")}
            error={form.formState.errors.confirmPassword?.message}
            label="Confirm Password"
            placeholder="Confirm your new password"
            disabled={isPending}
            radius="md"
            withAsterisk
          />

          <Group justify="flex-end" mt="md" p={0}>
            <Button
              variant="light"
              onClick={() => {
                setIsModalOpen(false);
                form.reset();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending} variant="filled">
              Update Password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
export default ChangePasswordModal;
