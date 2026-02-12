import React from 'react';
import {
  FileText, Activity, CheckCircle2, Mail, Phone, Calendar,
  Users, Target, Mic, TrendingUp, Brain, Database,
} from 'lucide-react';

const icons: Record<string, React.ReactNode> = {
  note_added: <FileText className="h-3.5 w-3.5 text-primary" />,
  status_changed: <Activity className="h-3.5 w-3.5 text-accent-foreground" />,
  task_created: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
  email_sent: <Mail className="h-3.5 w-3.5 text-primary" />,
  call_logged: <Phone className="h-3.5 w-3.5 text-primary" />,
  meeting_scheduled: <Calendar className="h-3.5 w-3.5 text-primary" />,
  new_lead: <Users className="h-3.5 w-3.5 text-emerald-500" />,
  new_opportunity: <Target className="h-3.5 w-3.5 text-amber-500" />,
  new_transcription: <Mic className="h-3.5 w-3.5 text-blue-500" />,
  new_booking: <Calendar className="h-3.5 w-3.5 text-violet-500" />,
  new_generated_document: <FileText className="h-3.5 w-3.5 text-orange-500" />,
  new_project: <TrendingUp className="h-3.5 w-3.5 text-teal-500" />,
  note: <FileText className="h-3.5 w-3.5 text-primary" />,
  ai_action: <Brain className="h-3.5 w-3.5 text-primary" />,
  synthesis_generated: <Database className="h-3.5 w-3.5 text-primary" />,
  email_draft_generated: <Mail className="h-3.5 w-3.5 text-primary" />,
};

export function ActivityIcon({ type, isAI }: { type: string; isAI?: boolean }) {
  if (isAI && !icons[type]) return <span className="mt-0.5 flex-shrink-0"><Brain className="h-3.5 w-3.5 text-primary/70" /></span>;
  return <span className="mt-0.5 flex-shrink-0">{icons[type] || <Activity className="h-3.5 w-3.5 text-muted-foreground" />}</span>;
}
