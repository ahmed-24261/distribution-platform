import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata = {
  title: "Distribution platform",
  description: "Distribution platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>

        <Toaster />
      </body>
    </html>
  );
}
