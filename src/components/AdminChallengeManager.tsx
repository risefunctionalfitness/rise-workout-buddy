import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Archive, Users, TrendingUp, Calendar, Target, Dumbbell, Flame, Clock, Sun, Star, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BADGE_ICONS_FOR_ADMIN } from "@/components/BadgeIconMapper";

interface Challenge {
  id: string;
  title: string;
  description: string;
  checkpoint_count: number;
  month: number;
  year: number;
  is_primary: boolean;
  icon: string;
  is_archived: boolean;
  created_at: string;
}

interface ChallengeStats {
  total_participants: number;
  completion_rate: number;
  active_users: number;
  avg_progress: number;
}

const CHALLENGE_ICONS = [
  { value: "target", label: "Target", icon: Target },
  { value: "dumbbell", label: "Dumbbell", icon: Dumbbell },
  { value: "flame", label: "Fire", icon: Flame },
  { value: "clock", label: "Clock", icon: Clock },
  { value: "sun", label: "Sun", icon: Sun },
  { value: "star", label: "Star", icon: Star },
  { value: "trophy", label: "Trophy", icon: Trophy },
  { value: "zap", label: "Lightning", icon: Zap }
];

const MONTHS = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "März" },
  { value: 4, label: "April" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Dezember" }
];

export default function AdminChallengeManager() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    checkpoint_count: 12,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    icon: "target"
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("monthly_challenges")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error loading challenges:", error);
      toast({ title: "Fehler beim Laden der Challenges", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadChallengeStats = async (challengeId: string) => {
    try {
      const { data: progressData, error: progressError } = await supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("challenge_id", challengeId);

      if (progressError) throw progressError;

      const totalParticipants = progressData?.length || 0;
      const completedChallenges = progressData?.filter(p => p.is_completed).length || 0;
      const activeUsers = progressData?.filter(p => !p.is_completed && p.completed_checkpoints > 0).length || 0;
      const avgProgress = totalParticipants > 0 
        ? progressData.reduce((sum, p) => sum + (p.completed_checkpoints || 0), 0) / totalParticipants 
        : 0;

      setChallengeStats({
        total_participants: totalParticipants,
        completion_rate: totalParticipants > 0 ? (completedChallenges / totalParticipants) * 100 : 0,
        active_users: activeUsers,
        avg_progress: avgProgress
      });
    } catch (error) {
      console.error("Error loading challenge stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      if (editingChallenge) {
        const { error } = await supabase
          .from("monthly_challenges")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingChallenge.id);

        if (error) throw error;
        toast({ title: "Challenge erfolgreich aktualisiert" });
      } else {
        const { error } = await supabase
          .from("monthly_challenges")
          .insert({
            ...formData,
            created_by: userData.user.id
          });

        if (error) throw error;
        toast({ title: "Challenge erfolgreich erstellt" });
      }

      loadChallenges();
      resetForm();
      setShowCreateDialog(false);
      setEditingChallenge(null);
    } catch (error) {
      console.error("Error saving challenge:", error);
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
  };

  const handleDelete = async (challengeId: string) => {
    if (!confirm("Challenge wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    
    try {
      const { error } = await supabase
        .from("monthly_challenges")
        .delete()
        .eq("id", challengeId);

      if (error) throw error;
      toast({ title: "Challenge gelöscht" });
      loadChallenges();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  };

  // Primär Challenge Funktion entfernt

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      checkpoint_count: 12,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      icon: "target"
    });
  };

  const openEditDialog = (challenge: Challenge) => {
    setFormData({
      title: challenge.title,
      description: challenge.description,
      checkpoint_count: challenge.checkpoint_count,
      month: challenge.month,
      year: challenge.year,
      icon: challenge.icon
    });
    setEditingChallenge(challenge);
    setShowCreateDialog(true);
  };

  const openStatsDialog = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    loadChallengeStats(challenge.id);
  };

  if (loading) return <div>Lade Challenges...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Monats-Challenges</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Challenge
        </Button>
      </div>

      <div className="grid gap-4">
        {challenges.map((challenge) => (
          <Card key={challenge.id} className={challenge.is_archived ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {BADGE_ICONS_FOR_ADMIN.find(b => b.value === challenge.icon)?.image && (
                      <img 
                        src={BADGE_ICONS_FOR_ADMIN.find(b => b.value === challenge.icon)!.image}
                        alt={challenge.title}
                        className="w-8 h-8 object-contain"
                      />
                    )}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {challenge.title}
                      {challenge.is_primary && <Badge variant="default">Primär</Badge>}
                      {challenge.is_archived && <Badge variant="outline">Archiviert</Badge>}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">{challenge.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {MONTHS.find(m => m.value === challenge.month)?.label} {challenge.year} • {challenge.checkpoint_count} Checkpoints
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openStatsDialog(challenge)}>
                    <TrendingUp className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(challenge)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(challenge.id)}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChallenge ? "Challenge bearbeiten" : "Neue Challenge"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Challenge Titel"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Kurze Beschreibung"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Checkpoints</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.checkpoint_count}
                  onChange={(e) => setFormData({ ...formData, checkpoint_count: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monat</label>
                <Select value={formData.month.toString()} onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Badge Icon auswählen</label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {BADGE_ICONS_FOR_ADMIN.map((badgeOption) => {
                  return (
                    <Button
                      key={badgeOption.value}
                      type="button"
                      variant={formData.icon === badgeOption.value ? "default" : "outline"}
                      size="sm"
                      className="aspect-square p-1 h-auto"
                      onClick={() => setFormData({ ...formData, icon: badgeOption.value })}
                      title={badgeOption.label}
                    >
                      <img 
                        src={badgeOption.image} 
                        alt={badgeOption.label}
                        className="w-6 h-6 object-contain"
                      />
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setEditingChallenge(null);
                resetForm();
              }}>
                Abbrechen
              </Button>
              <Button type="submit">
                {editingChallenge ? "Aktualisieren" : "Erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title} - Analytics</DialogTitle>
          </DialogHeader>
          {challengeStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Teilnehmer</span>
                    </div>
                    <p className="text-2xl font-bold">{challengeStats.total_participants}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Aktive Nutzer</span>
                    </div>
                    <p className="text-2xl font-bold">{challengeStats.active_users}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Abschlussrate</span>
                  <span>{challengeStats.completion_rate.toFixed(1)}%</span>
                </div>
                <Progress value={challengeStats.completion_rate} />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Durchschnittlicher Fortschritt</span>
                  <span>{challengeStats.avg_progress.toFixed(1)} / {selectedChallenge?.checkpoint_count}</span>
                </div>
                <Progress 
                  value={(challengeStats.avg_progress / (selectedChallenge?.checkpoint_count || 1)) * 100} 
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}