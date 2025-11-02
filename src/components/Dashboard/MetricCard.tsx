import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down";
}

export const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: MetricCardProps) => {
  const isPositive = trend === "up";
  const showChange = change !== undefined;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {showChange && (
          <div className="flex items-center gap-1 text-xs mt-1">
            {isPositive ? (
              <ArrowUp className="h-3 w-3 text-success" />
            ) : (
              <ArrowDown className="h-3 w-3 text-destructive" />
            )}
            <span
              className={cn(
                "font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {change}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
