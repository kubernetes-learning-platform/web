import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "kubernetes-learning",
  description: "A live Kubernetes lab with an optional AI helper.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
