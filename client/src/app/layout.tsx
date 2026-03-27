import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@mantine/core/styles.css";
import "./globals.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  createTheme,
} from "@mantine/core";
import ReduxProvider from "@/components/ReduxProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const theme = createTheme({
  primaryColor: "indigo",
  fontFamily: "var(--font-geist-sans)",
  fontFamilyMonospace: "var(--font-geist-mono)",
  components: {
    InputWrapper: {
      styles: {
        label: {
          color: "var(--mantine-color-gray-9)", // Much darker than default
          fontWeight: 500,
          marginBottom: 4,
        },
      },
    },
    Input: {
      styles: {
        input: {
          color: "var(--mantine-color-black)", // Darker text inside the box
        },
      },
    },
  },
});

export const metadata: Metadata = {
  title: "App Portal",
  description: "Login and dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>
          <MantineProvider theme={theme} defaultColorScheme="light">
            {children}
          </MantineProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
