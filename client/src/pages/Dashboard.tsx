import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { Plus, Folder, LogOut, Search, Users } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; _id: Id<"users"> } | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load User
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) navigate("/auth");
    else setUser(JSON.parse(stored));
  }, [navigate]);

  // Convex Hooks
  const projects = useQuery(api.board.getProjects, user ? { userId: user._id } : "skip");
  const createProjectMutation = useMutation(api.board.createProject);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectTitle.trim()) return;

    try {
      const projectId = await createProjectMutation({
        title: newProjectTitle,
        ownerId: user._id,
      });
      toast.success("Project created!");
      setNewProjectTitle("");
      setIsCreating(false);
      navigate(`/board/${projectId}`); // Go to new board
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SyncSpace</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Hello, {user.name}</span>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Projects</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} /> New Project
          </button>
        </div>

        {/* Create Modal (Simple inline for now) */}
        {isCreating && (
            <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <form onSubmit={handleCreate} className="flex gap-4">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Project Name (e.g. Website Wireframe)" 
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent transition-all shadow-sm"
                        value={newProjectTitle}
                        onChange={e => setNewProjectTitle(e.target.value)}
                    />
                    
                    <button 
                        type="submit" 
                        disabled={!newProjectTitle.trim()}
                        className="px-6 py-2 bg-[#1E293B] hover:bg-[#334155] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        Create
                    </button>

                    <button 
                        type="button" 
                        onClick={() => setIsCreating(false)} 
                        className="px-4 py-2 text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                </form>
            </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <div 
              key={project._id}
              onClick={() => navigate(`/board/${project._id}`)}
              className="group bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <Folder size={24} />
                </div>
                <div className="flex -space-x-2">
                   {/* Placeholder for future collaborators avatars */}
                   <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs">You</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Edited {new Date(project.createdAt).toLocaleDateString()}
              </p>
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">ID: {project._id.slice(0,8)}...</span>
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(window.location.origin + "/board/" + project._id);
                        toast.success("Link copied! Send to a friend.");
                    }}
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <Users size={12} /> Invite
                  </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {projects?.length === 0 && !isCreating && (
             <div className="col-span-full py-12 text-center text-gray-500">
                <Folder size={48} className="mx-auto mb-4 opacity-20" />
                <p>No projects yet. Create one to get started!</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}