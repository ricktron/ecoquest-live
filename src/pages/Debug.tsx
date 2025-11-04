import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TROPHIES_ENABLED } from "@/env";

type EnvVar = {
  name: string;
  present: boolean;
  description: string;
  rawValue?: string;
};

export default function Debug() {
  const rawTrophyFlag = import.meta.env.VITE_FEATURE_TROPHIES;
  
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
      rawValue: rawTrophyFlag,
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
                <div className="flex-1">
                  <div className="font-mono text-sm font-medium">
                    {env.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {env.description}
                  </div>
                  {env.rawValue !== undefined && (
                    <div className="text-xs mt-1 font-mono text-blue-600">
                      Raw: "{env.rawValue}"
                    </div>
                  )}
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
          <CardTitle>Feature Flag Parsing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Raw VITE_FEATURE_TROPHIES:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
              {rawTrophyFlag === undefined ? "undefined" : `"${rawTrophyFlag}"`}
            </code>
          </div>
          <div className="text-sm">
            <span className="font-medium">Parsed TROPHIES_ENABLED:</span>
            <Badge variant={TROPHIES_ENABLED ? "default" : "secondary"} className="ml-2">
              {TROPHIES_ENABLED ? "true" : "false"}
            </Badge>
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
