import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const Performance = () => {
  const performanceData = [
    {
      name: "John Doe",
      group: "Group A",
      omset: 45000000,
      grossCommission: 18000000,
      netCommission: 14400000,
      paidCommission: 12000000,
      attendance: 22,
      kpi: 95,
    },
    {
      name: "Jane Smith",
      group: "Group B",
      omset: 38000000,
      grossCommission: 15200000,
      netCommission: 12160000,
      paidCommission: 10000000,
      attendance: 21,
      kpi: 88,
    },
    {
      name: "Mike Johnson",
      group: "Group A",
      omset: 32000000,
      grossCommission: 12800000,
      netCommission: 10240000,
      paidCommission: 8500000,
      attendance: 20,
      kpi: 82,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getKPIColor = (kpi: number) => {
    if (kpi >= 90) return "text-success";
    if (kpi >= 75) return "text-warning";
    return "text-destructive";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team & Individual Performance</h1>
            <p className="text-muted-foreground">
              Track and analyze team performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Filter</Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Team Omset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 115M</div>
              <p className="text-xs text-success mt-1">+12.5% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 46M</div>
              <p className="text-xs text-success mt-1">+8.2% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">21 days</div>
              <p className="text-xs text-muted-foreground mt-1">95% attendance rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Team KPI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">88%</div>
              <p className="text-xs text-muted-foreground mt-1">Overall achievement</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Total Omset</TableHead>
                  <TableHead className="text-right">Komisi Kotor</TableHead>
                  <TableHead className="text-right">Komisi Bersih</TableHead>
                  <TableHead className="text-right">Komisi Cair</TableHead>
                  <TableHead className="text-center">Absensi</TableHead>
                  <TableHead className="text-center">KPI %</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.group}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.omset)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.grossCommission)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.netCommission)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(employee.paidCommission)}
                    </TableCell>
                    <TableCell className="text-center">{employee.attendance}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${getKPIColor(employee.kpi)}`}>
                          {employee.kpi}%
                        </span>
                        <Progress value={employee.kpi} className="w-16 h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Performers - Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performanceData.slice(0, 3).map((employee, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{employee.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={(employee.omset / 50000000) * 100}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {formatCurrency(employee.omset)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Top Performers - KPI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...performanceData]
                .sort((a, b) => b.kpi - a.kpi)
                .slice(0, 3)
                .map((employee, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={employee.kpi} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {employee.kpi}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Performance;
