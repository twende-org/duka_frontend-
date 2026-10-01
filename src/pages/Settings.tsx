import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, User, Store, Shield, Bell, FileText, ChevronRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useI18n } from "@/lib/i18n";

type Section = {
  title: string;
  desc: string;
  icon: typeof User;
  path: string;
  group: string;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const settingSections: Section[] = [
    {
      title: t("settings.userProfile") || "User Profile & Account",
      desc: t("settings.userProfileDesc") || "Manage display name, password, email preferences, and personal details.",
      icon: User,
      path: "/dashboard/profile",
      group: t("settings.groupAccount") || "Account",
    },
    {
      title: t("settings.shopSettings") || "Shop Settings & Profile",
      desc: t("settings.shopSettingsDesc") || "Edit shop business name, phone, WhatsApp number, logo, and location.",
      icon: Store,
      path: "/dashboard/shops",
      group: t("settings.groupBusiness") || "Business",
    },
    {
      title: t("settings.receipts") || "Receipts & Sales Preferences",
      desc: t("settings.receiptsDesc") || "Customize printed and digital WhatsApp receipt headers, footers, and taxes.",
      icon: FileText,
      path: "/dashboard/sales",
      group: t("settings.groupBusiness") || "Business",
    },
    {
      title: t("settings.staff") || "Staff & User Access Permissions",
      desc: t("settings.staffDesc") || "Manage team member roles (Owner, Manager, Attendant) and store permissions.",
      icon: Shield,
      path: "/dashboard/users",
      group: t("settings.groupTeam") || "Team & Operations",
    },
    {
      title: t("settings.setupWizard") || "Quick Shop Setup Wizard",
      desc: t("settings.setupWizardDesc") || "Go through the step-by-step wizard to configure all basic shop settings.",
      icon: Settings,
      path: "/shop-setup",
      group: t("settings.groupTeam") || "Team & Operations",
    },
  ];

  const groups = [t("settings.groupAccount") || "Account", t("settings.groupBusiness") || "Business", t("settings.groupTeam") || "Team & Operations"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("settings.title") || "Mipangilio ya Biashara (Settings)"}
        description={t("settings.subtitle") || "Configure system preferences, shop profile, receipt settings, and team roles."}
      />

      {groups.map((group, gi) => {
        const items = settingSections.filter((s) => s.group === group);
        if (!items.length) return null;
        return (
          <div key={group} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((sec, i) => (
                <motion.button
                  key={sec.title}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: (gi * 2 + i) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => navigate(sec.path)}
                  className="group relative text-left rounded-xl border bg-card p-4 shadow-sm flex items-center justify-between gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-primary/5"
                >
                  <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                  <div className="flex items-center gap-4 min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <sec.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{sec.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sec.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
