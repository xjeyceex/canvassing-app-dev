import {
  Anchor,
  Box,
  Breadcrumbs,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbItem = {
  title: string;
  href: string;
};

type PageHeaderProps = {
  title: string | React.ReactNode;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
};

const PageHeader = ({ title, description, breadcrumbs }: PageHeaderProps) => {
  const pathname = usePathname();
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery(`(max-width: 36em)`);
  const isDark = colorScheme === "dark";

  // Custom chevron separator component
  const ChevronSeparator = () => (
    <IconChevronRight
      size={15}
      stroke={1.5}
      color={isDark ? "#DEE2E6" : "#495057"}
    />
  );

  return (
    <Stack gap="md">
      {/* Modern Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Box
          py={2}
          style={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
          }}
        >
          <Breadcrumbs separator={<ChevronSeparator />} separatorMargin={4}>
            {breadcrumbs.map((item, index) => {
              const isActive = pathname === item.href;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <Box
                  key={index}
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  {isActive || isLast ? (
                    <Text
                      fz={15}
                      fw={500}
                      c={isDark ? "gray.5" : "gray.6"}
                      style={{ transition: "color 0.2s ease" }}
                    >
                      {item.title}
                    </Text>
                  ) : (
                    <Anchor
                      component={Link}
                      href={item.href}
                      fz={15}
                      fw={500}
                      c={isDark ? "gray.2" : "black"}
                    >
                      {item.title}
                    </Anchor>
                  )}
                </Box>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}

      {/* Header Content */}
      <Stack gap={6}>
        <Title order={isMobile ? 3 : 2} fw={600} lts="-0.03em">
          {title}
        </Title>

        {description && (
          <Text c={isDark ? "gray.4" : "gray.6"} size="md">
            {description}
          </Text>
        )}
      </Stack>
    </Stack>
  );
};

export default PageHeader;
