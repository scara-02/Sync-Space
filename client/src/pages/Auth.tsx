import { useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate , useLocation } from "react-router-dom";
import { toast } from "sonner";
import { User, Lock, Mail, ArrowRight, UserPlus } from "lucide-react";


export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(""); // Username
  
  const navigate = useNavigate();
  const location = useLocation();
  const convex = useConvex(); // Used to call queries manually
  const createAccountMutation = useMutation(api.auth.createAccount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isSignUp) {
        // --- SIGN UP LOGIC (Keep as is) ---
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        
        await createAccountMutation({ email, password, name });
        toast.success("Account created! Please Sign In.");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        // --- SIGN IN LOGIC (Updated) ---
        const user = await convex.query(api.auth.signIn, { email, password });

        if (!user) {
          toast.error("Invalid email or password");
          return;
        }

        localStorage.setItem("user", JSON.stringify(user));
        toast.success(`Welcome back, ${user.name}!`);
        
        // 🔴 FIX: Check if we have a saved location to go back to
        // If they clicked an invite link, 'state.from' will be that link.
        // If not, it defaults to "/" (Dashboard).
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
      <div className="w-full max-w-md bg-indigo-600 rounded-2xl shadow-xl overflow-hidden animate-scale-in text-white">

        {/* Header */}
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">SyncSpace</h1>
          <p className="text-primary-foreground/80">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          
          {/* Sign Up: Username */}
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full pl-10 py-3 rounded-lg border border-gray-300 bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email (Gmail)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="name@gmail.com"
                className="w-full pl-10 py-3 rounded-lg border border-gray-300 bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 py-3 rounded-lg border border-gray-300 bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Sign Up: Confirm Password */}
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 py-3 rounded-lg border border-gray-300 bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-600 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-white text-indigo-600 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {isSignUp ? (
              <>Sign Up <UserPlus size={18} /></>
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 text-center border-t border-border">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-indigo-600 font-semibold hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}