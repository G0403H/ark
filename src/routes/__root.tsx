import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { Frame } from "@/components/kovcheg/frame";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "КОВЧЕГ" },
      {
        name: "description",
        content:
          "Локальный архив КОВЧЕГ: вода, тепло, первая помощь и ядерная пыль. Поиск без сети и без модели.",
      },
      { name: "theme-color", content: "#14120E" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Frame>
            <Outlet />
          </Frame>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
