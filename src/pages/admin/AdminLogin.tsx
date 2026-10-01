import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginUser, clearError, logoutUser } from "@/store/authSlice";
import { isSystemAdmin } from "@/lib/subscription";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useI18n } from "@/lib/i18n";

const adminLoginSchema = z.object({
  email: z.string().min(1, "Barua pepe inahitajika").email("Barua pepe si sahihi"),
  password: z.string().min(6, "Nenosiri lazima liwe na angalau herufi 6"),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((s) => s.auth);
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin";
  const { lang } = useI18n();

  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: AdminLoginFormValues) => {
    dispatch(clearError());
    setLocalError(null);
    try {
      const result = await dispatch(loginUser({ email: data.email, password: data.password })).unwrap();
      
      // Verify if the user is an admin
      const isAdmin = await isSystemAdmin(result.user.id);
      
      if (!isAdmin) {
        // Not an admin, boot them out immediately
        await dispatch(logoutUser()).unwrap();
        setLocalError(lang === "sw" ? "Huna ruhusa ya kuingia kwenye lango hili. Hili ni kwa ajili ya wasimamizi pekee." : "Unauthorized. This portal is strictly for Twende Duka staff.");
        return;
      }

      // Success, navigate to admin dashboard
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setLocalError(lang === "sw" ? "Barua pepe au nenosiri si sahihi." : "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background styling for Admin specific feel */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      <div className="z-10 w-full max-w-md">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary/50 to-primary" />

          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary/10 p-3 rounded-2xl mb-4 text-primary">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight text-center">
              Twende <span className="text-primary">Admin</span>
            </h1>
            <p className="text-sm text-muted-foreground text-center mt-2 font-medium">
              Secure Staff Portal
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {localError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <p>{localError}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="admin@twendedigital.com"
                  className={`pl-10 h-12 bg-background/50 border-border/50 focus:bg-background ${
                    errors.email ? "border-destructive/50 focus-visible:ring-destructive/50" : ""
                  }`}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-xs font-semibold ml-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:bg-background ${
                    errors.password ? "border-destructive/50 focus-visible:ring-destructive/50" : ""
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs font-semibold ml-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-xl mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Secure Portal"
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center border-t border-border/50 pt-6">
            <p className="text-xs text-muted-foreground">
              Unauthorized access to this portal is strictly prohibited and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
