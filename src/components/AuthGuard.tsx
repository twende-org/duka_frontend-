import { useAppSelector } from "@/store/hooks";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const user = useAppSelector((s) => s.auth.user);
  return user ? <>{children}</> : <>{fallback}</>;
}
