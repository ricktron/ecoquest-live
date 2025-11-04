import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EnvVar = {
  name: string;
  present: boolean;
  description: string;
};

export default function Debug() {
  const envVars: EnvVar[] = [
    {
      name: "VITE_SUPABASE_URL",
      present: !!import.meta.env.VITE_SUPABASE_URL,
      description: "Supabase project URL",
    },
    {
      name: "VITE_SUPABASE_ANON_KEY",
      present: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      description: "Supabase anonymous key",
    },
    {
      name: "VITE_DEFAULT_ASSIGNMENT_ID",
      present: !!import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID,
      description: "Default assignment ID",
    },
    {
      name: "VITE_FEATURE_TROPHIES",
      present: !!import.meta.env.VITE_FEATURE_TROPHIES,
      description: "Trophies feature flag",
    },
    {
      name: "VITE_ENABLE_ADMIN",
      present: !!import.meta.env.VITE_ENABLE_ADMIN,
      description: "Admin features flag",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Debug & Configuration</h1>
        <p className="text-muted-foreground">
          Environment variable health check
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {envVars.map((env) => (
              <div
                key={env.name}
                className="flex items-center justify-between py-2 px-3 border rounded-md"
              >
                <div>
                  <div className="font-mono text-sm font-medium">
                    {env.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {env.description}
                  </div>
                </div>
                <Badge variant={env.present ? "default" : "destructive"}>
                  {env.present ? "Present" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Secrets are managed in Lovable → Project → Settings → Secrets
          </p>
          <p>
            • Values are never exposed to the browser console for security
          </p>
          <p>
            • VITE_ prefixed variables are safe to use in client code
          </p>
          <p>
            • Server-only secrets (without VITE_ prefix) should only be used in
            edge functions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
