import { Compass, House, Search, UserRound } from "lucide-react";
import { Link } from "react-router";

import type { WeiboPageDescriptor } from "@/features/weibo/route/page-descriptor";
import type { AppTheme } from "@/lib/app-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeModeToggle } from "@/features/weibo/components/theme-mode-toggle";

const NAV_ITEMS = [
  { icon: House, label: "Home", pageKinds: ["home", "status"], href: "/" },
  { icon: Search, label: "Explore", pageKinds: ["unsupported"] as const, href: "/" },
  { icon: Compass, label: "Following", pageKinds: [] as const, href: "/" },
  { icon: UserRound, label: "Profile", pageKinds: [] as const, href: "/" },
] as const;

export function NavigationRail({
  pageKind,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  pageKind: WeiboPageDescriptor["kind"];
  rewriteEnabled: boolean;
  theme: AppTheme;
  onRewriteEnabledChange: (enabled: boolean) => void;
  onThemeChange: (theme: AppTheme) => void;
}) {
  return (
    <Card className="flex h-full flex-col rounded-[28px] border-border/70 bg-card/95 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">LoveForXb</CardTitle>
        <CardDescription>Weibo, rebuilt for reading</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 px-4">
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ icon: Icon, label, pageKinds, href }) => {
            const isActive = pageKinds.some((candidate) => candidate === pageKind);

            return (
              <Link
                key={label}
                to={href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3 rounded-2xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Rewrite Weibo</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              aria-label="Toggle LoveForXb rewrite"
            >
              {rewriteEnabled ? "切换原网页" : "已关闭"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">深色模式</p>
            <ThemeModeToggle value={theme} onChange={onThemeChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
