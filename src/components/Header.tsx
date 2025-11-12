import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import reaLogo from "@/assets/rea-logo-icon.png";
import animaLogo from "@/assets/anima-logo.jpeg";

export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="relative bg-gradient-to-r from-brand-teal via-brand-blue to-brand-teal shadow-2xl overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logos Section */}
          <div className="flex items-center gap-4 md:gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl group-hover:bg-white/30 transition-all"></div>
              <img 
                src={reaLogo} 
                alt="REA Advertising Logo" 
                className="relative h-20 md:h-28 w-auto object-contain drop-shadow-2xl transition-transform group-hover:scale-105"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(255, 255, 255, 0.5))' }}
              />
            </div>
            
            <div className="hidden md:flex items-center">
              <div className="w-px h-20 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
              <div className="mx-2 text-white/40 text-3xl font-thin">×</div>
              <div className="w-px h-20 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-white/10 rounded-xl blur-xl group-hover:bg-white/20 transition-all"></div>
              <img 
                src={animaLogo} 
                alt="ANIMA Tech Studio Logo" 
                className="relative h-20 md:h-28 w-auto object-contain drop-shadow-2xl transition-transform group-hover:scale-105"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(255, 255, 255, 0.3))' }}
              />
            </div>
          </div>

          {/* Title Section */}
          <div className="flex-1 text-center md:text-right">
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wide drop-shadow-lg">
              REA QUOTATION TRACKER
            </h1>
            <div className="mt-2 flex items-center justify-center md:justify-end gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/60"></div>
              <p className="text-xs md:text-sm text-white/95 font-medium tracking-wider uppercase">
                Powered by ANIMA Tech Studio
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/60"></div>
            </div>
            <p className="text-xs text-white/70 mt-1 italic">Technology with a Soul</p>
          </div>

          {/* Sign Out Button */}
          {user && (
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <p className="text-xs text-white/70">{user.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent"></div>
    </header>
  );
};
