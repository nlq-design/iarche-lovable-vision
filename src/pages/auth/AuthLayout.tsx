import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import logo from '@/assets/arc-iarche-v4.svg';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="flex flex-col items-center mb-8">
        <img src={logo} alt="IArche" className="h-14 w-auto mb-3" />
        <p className="text-sm text-muted-foreground">L'IA se construit avec vous.</p>
      </div>

      <Card className="w-full max-w-md bg-card border-border shadow-sm">
        <CardHeader className="space-y-2 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-center">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
};

export default AuthLayout;
