import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useCompanion } from "@/contexts/CompanionContext";
import { 
  User, Moon, Sun, Palette, Settings2, Clock3, Trophy, 
  BookOpen, Flame, Shield, Globe, Cloud, Lock, Link2, 
  Mail, Key, Eye, Check, ChevronDown, Bell, 
  Instagram, MessageCircle, Linkedin, Save, Loader2,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

const THEMES = [
  { id: "light", label: "Light", icon: "☀️" },
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "system", label: "System", icon: "💻" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "bn", label: "Bengali" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
];

const FONT_SIZES = ["Small", "Medium", "Large"];
const EDITOR_FONTS = ["Default", "Monospace", "Serif"];
const DEFAULT_VIEWS = ["Dashboard", "Learning", "Profile", "Canvas"];

const CONNECTED_APPS = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "#d84b78", connected: true },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "#319b54", connected: true },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#3979a8", connected: true },
];

export default function Profile() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/onboarding" });
  const { theme, toggleTheme } = useTheme();
  const { setContext } = useCompanion();
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "editor" | "ai" | "notifications" | "language" | "cloud" | "privacy" | "apps">("profile");
  const [saving, setSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    theme: "system",
    language: "en",
    fontSize: "Medium",
    editorFont: "Default",
    defaultView: "Dashboard",
    personalizedLearning: true,
    aiSuggestions: true,
    learningReminders: true,
    weeklyProgress: false,
    profileVisibility: false,
    cloudStorage: false,
  });

  useEffect(() => {
    setContext({ workspace: "Profile" });
  }, [setContext]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetch(`${CAPTURE_API_URL}/profile`, { signal: controller.signal, headers: { "Authorization": "Bearer demo-user" } })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load profile preferences");
        return response.json();
      })
      .then(data => setProfileData(previous => ({ ...previous, ...data, password: "", confirmPassword: "" })))
      .catch(error => {
        if (error.name !== "AbortError") toast.error("Could not load saved profile preferences");
      });
    return () => controller.abort();
  }, [isAuthenticated]);

  const handleSave = async (field?: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${CAPTURE_API_URL}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer demo-user" },
        body: JSON.stringify({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        username: profileData.username,
        email: profileData.email,
        theme: profileData.theme,
        language: profileData.language,
        fontSize: profileData.fontSize,
        editorFont: profileData.editorFont,
        defaultView: profileData.defaultView,
        personalizedLearning: profileData.personalizedLearning,
        aiSuggestions: profileData.aiSuggestions,
        learningReminders: profileData.learningReminders,
        weeklyProgress: profileData.weeklyProgress,
        profileVisibility: profileData.profileVisibility,
          cloudStorage: profileData.cloudStorage,
        }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Profile could not be saved");
      toast.success("Profile saved");
      if (field) {
        setSavedFields(prev => ({ ...prev, [field]: true }));
        setTimeout(() => setSavedFields(prev => ({ ...prev, [field]: false })), 2000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
    setSavedFields(prev => ({ ...prev, [key]: false }));
  };

  if (loading && !isAuthenticated) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-[#123d2d]" size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-500">Manage your account, learning preferences, and connected services.</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#123d2d] text-white flex items-center justify-center text-2xl font-bold">
            {(profileData.firstName?.[0] || "U") + (profileData.lastName?.[0] || "")}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profileData.firstName || "User"} {profileData.lastName || ""}</h2>
            <p className="text-gray-500 mt-1">{profileData.email || "No email"}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Flame size={14} /> 12 Day Streak</span>
              <span className="flex items-center gap-1"><Trophy size={14} /> 24 Sessions</span>
              <span className="flex items-center gap-1"><Clock3 size={14} /> 8.5h Total</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => handleSave()} disabled={saving} className="h-10">
            {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />} Save All
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto pb-1" role="tablist">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "editor", label: "Editor", icon: Settings2 },
            { id: "ai", label: "AI Preferences", icon: BookOpen },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "language", label: "Language", icon: Globe },
            { id: "cloud", label: "Cloud Storage", icon: Cloud },
            { id: "privacy", label: "Privacy", icon: Shield },
            { id: "apps", label: "Connected Apps", icon: Link2 },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#123d2d] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2">First Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={profileData.firstName}
                    onChange={e => handleChange("firstName", e.target.value)}
                    placeholder="Enter your first name"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSave("firstName")} disabled={saving}>
                    {savedFields.firstName ? <CheckCircle2 className="text-green-500" size={16} /> : <Check size={16} />} Enter
                  </Button>
                </div>
                {savedFields.firstName && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</p>}
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2">Last Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={profileData.lastName}
                    onChange={e => handleChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSave("lastName")} disabled={saving}>
                    {savedFields.lastName ? <CheckCircle2 className="text-green-500" size={16} /> : <Check size={16} />} Enter
                  </Button>
                </div>
                {savedFields.lastName && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</p>}
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2">Username</Label>
                <div className="flex gap-2">
                  <Input 
                    value={profileData.username}
                    onChange={e => handleChange("username", e.target.value)}
                    placeholder="Enter your username"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSave("username")} disabled={saving}>
                    {savedFields.username ? <CheckCircle2 className="text-green-500" size={16} /> : <Check size={16} />} Enter
                  </Button>
                </div>
                {savedFields.username && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</p>}
              </div>

              <div>
                <Label className="block text-sm font-bold text-gray-700 mb-2">Email</Label>
                <div className="flex gap-2">
                  <Input 
                    type="email"
                    value={profileData.email}
                    onChange={e => handleChange("email", e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => handleSave("email")} disabled={saving}>
                    {savedFields.email ? <CheckCircle2 className="text-green-500" size={16} /> : <Check size={16} />} Enter
                  </Button>
                </div>
                {savedFields.email && <p className="text-green-600 text-sm mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</p>}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Change Password</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-bold text-gray-700 mb-2">New Password</Label>
                  <Input 
                    type="password"
                    value={profileData.password}
                    onChange={e => handleChange("password", e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</Label>
                  <Input 
                    type="password"
                    value={profileData.confirmPassword}
                    onChange={e => handleChange("confirmPassword", e.target.value)}
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">Leave blank to keep current password.</p>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Theme</h3>
              <p className="text-gray-500 text-sm mb-4">Choose how Darwinity looks on your device.</p>
              <div className="grid grid-cols-3 gap-4">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { handleChange("theme", t.id); toggleTheme?.(); }}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      profileData.theme === t.id
                        ? "border-[#123d2d] bg-[#f1f5f2]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-3xl mb-2">{t.icon}</div>
                    <div className="font-medium text-gray-900">{t.label}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                  <span className="text-sm font-medium text-gray-700">Dark Mode</span>
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === "editor" && (
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Font Size</h3>
              <Select value={profileData.fontSize} onValueChange={v => handleChange("fontSize", v)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Editor Font</h3>
              <Select value={profileData.editorFont} onValueChange={v => handleChange("editorFont", v)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {EDITOR_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Default View</h3>
              <p className="text-gray-500 text-sm mb-2">What page opens when you launch Darwinity.</p>
              <Select value={profileData.defaultView} onValueChange={v => handleChange("defaultView", v)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select default view" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_VIEWS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* AI Preferences Tab */}
        {activeTab === "ai" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Personalized Learning</h4>
                <p className="text-sm text-gray-500">Allow AI to personalize your learning experience.</p>
              </div>
              <Switch checked={profileData.personalizedLearning} onCheckedChange={v => handleChange("personalizedLearning", v)} />
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">AI Suggestions</h4>
                <p className="text-sm text-gray-500">Receive recommendations based on your progress.</p>
              </div>
              <Switch checked={profileData.aiSuggestions} onCheckedChange={v => handleChange("aiSuggestions", v)} />
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Learning Reminders</h4>
                <p className="text-sm text-gray-500">Get reminders to continue your learning.</p>
              </div>
              <Switch checked={profileData.learningReminders} onCheckedChange={v => handleChange("learningReminders", v)} />
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Weekly Progress Report</h4>
                <p className="text-sm text-gray-500">Receive a weekly summary of your progress.</p>
              </div>
              <Switch checked={profileData.weeklyProgress} onCheckedChange={v => handleChange("weeklyProgress", v)} />
            </div>
          </div>
        )}

        {/* Language Tab */}
        {activeTab === "language" && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Preferred Language</h3>
            <Select value={profileData.language} onValueChange={v => handleChange("language", v)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Cloud Storage Tab */}
        {activeTab === "cloud" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Cloud Storage</h4>
                <p className="text-sm text-gray-500">Connect your cloud storage to save learning materials.</p>
              </div>
              <Switch checked={profileData.cloudStorage} onCheckedChange={v => handleChange("cloudStorage", v)} />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" disabled>Connect Google Drive</Button>
              <Button variant="outline" disabled>Connect Dropbox</Button>
              <Button variant="outline" disabled>Connect OneDrive</Button>
            </div>
            <p className="text-sm text-gray-500">Cloud storage integration coming soon.</p>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Profile Visibility</h4>
                <p className="text-sm text-gray-500">Allow other learners to see your profile.</p>
              </div>
              <Switch checked={profileData.profileVisibility} onCheckedChange={v => handleChange("profileVisibility", v)} />
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Analytics</h4>
                <p className="text-sm text-gray-500">Allow anonymous usage analytics.</p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-gray-900">Data Processing</h4>
                <p className="text-sm text-gray-500">Allow data processing for AI improvements.</p>
              </div>
              <Switch checked={true} onCheckedChange={() => {}} />
            </div>
          </div>
        )}

        {/* Connected Apps Tab */}
        {activeTab === "apps" && (
          <div className="p-6 space-y-4">
            <p className="text-gray-500 text-sm mb-4">Manage the apps connected to your Darwinity account.</p>
            <div className="space-y-3">
              {CONNECTED_APPS.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: app.color + "20" }}>
                      <app.icon size={22} style={{ color: app.color }} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{app.name}</h4>
                      <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Connected
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" disabled>
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Available Integrations</p>
              <div className="flex gap-3">
                <Button variant="outline" disabled className="flex-1">Connect Notion</Button>
                <Button variant="outline" disabled className="flex-1">Connect GitHub</Button>
                <Button variant="outline" disabled className="flex-1">Connect Slack</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
