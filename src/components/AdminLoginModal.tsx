import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle, Loader2 } from "lucide-react";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isSubmitting?: boolean;
  error?: string;
}

export const AdminLoginModal = ({ isOpen, onClose, onSubmit, isSubmitting, error }: AdminLoginModalProps) => {
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setPassword("");
      setShake(true);
      const timer = setTimeout(() => setShake(false), 650);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setShake(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const pwd = password.trim();
    if (!pwd) return;
    onSubmit(pwd);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className={`sm:max-w-md bg-card border-border transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-yellow-500" />
            <DialogTitle className="text-foreground text-center text-xl">Admin Access</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-center">
            Enter the admin password to access moderation controls.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-foreground font-medium">
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-input border-border text-foreground transition-colors focus:border-yellow-500 focus:ring-yellow-500/20"
              onKeyDown={(e) => (e.key === "Enter" ? handleSubmit() : undefined)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={Boolean(isSubmitting)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white" 
              onClick={handleSubmit} 
              disabled={Boolean(isSubmitting) || !password.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
