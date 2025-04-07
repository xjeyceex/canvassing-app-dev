"use client";

import { AppShell } from "@mantine/core";

import Header from "@/app/(public)/_components/Header";
import LoadingStatePublic from "@/components/LoadingStatePublic";
import { useEffect, useState } from "react";

type PublicLayoutProps = {
  children: React.ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingStatePublic />;
  }
  return (
    <AppShell>
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
export default PublicLayout;
