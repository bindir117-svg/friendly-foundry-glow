import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, CandlestickChart } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { TopNav, MobileNav } from "@/components/AppNav";

interface Props {
  title?: string;
  children: ReactNode;
  showBack?: boolean;
}

export const PageShell = ({ title, children, showBack }: Props) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background relative pb-16 md:pb-0">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative flex items-center justify-between px-4 py-3 border-b border-border/40 backdrop-blur-xl bg-background/60 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
              aria-label="Буцах"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.5)]">
              <CandlestickChart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              MANDARIN
            </span>
          </Link>
          {title && <h1 className="text-sm md:text-base font-semibold truncate ml-3 text-muted-foreground">— {title}</h1>}
        </div>

        <div className="flex items-center gap-2">
          <TopNav />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Гарах">
                <LogOut className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Гарах уу?</AlertDialogTitle>
                <AlertDialogDescription>
                  Та системээс гарахдаа итгэлтэй байна уу?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Болих</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>Гарах</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto luxury-scroll">{children}</main>
      <MobileNav />
    </div>
  );
};
