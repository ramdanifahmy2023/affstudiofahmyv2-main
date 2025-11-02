// src/pages/Dashboard.tsx
import { useState } from "react"; // <-- TAMBAHKAN
import { MainLayout } from "@/components/Layout/MainLayout";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Input } from "@/components/ui/input";
// Import komponen filter baru
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Package,
  Wallet,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Data dummy (tetap sama)
const salesData = [
  { name: "Mon", sales: 4000, commission: 2400 },
  { name: "Tue", sales: 3000, commission: 1398 },
  { name: "Wed", sales: 2000, commission: 9800 },
  { name: "Thu", sales: 2780, commission: 3908 },
  { name: "Fri", sales: 1890, commission: 4800 },
  { name: "Sat", sales: 2390, commission: 3800 },
  { name: "Sun", sales: 3490, commission: 4300 },
];

const commissionData = [
  { name: "Kotor", value: 125000000, color: "hsl(var(--chart-1))" },
  { name: "Bersih", value: 100000000, color: "hsl(var(--chart-2))" },
  { name: "Cair", value: 85000000, color: "hsl(var(--chart-3))" },
];

const groupData = [
  { name: "Group A", omset: 45000000 },
  { name: "Group B", omset: 38000000 },
  { name: "Group C", omset: 32000000 },
  { name: "Group D", omset: 28000000 },
  { name: "Group E", omset: 22000000 },
];

// --- TAMBAHAN DATA UNTUK CHART BARU ---
const accountData = [
  { name: "Shopee", value: 15, color: "hsl(var(--chart-1))" },
  { name: "TikTok", value: 9, color: "hsl(var(--chart-2))" },
];

// Data dummy untuk filter
const dummyGroups = [
  { id: "g1", name: "Group A" },
  { id: "g2", name: "Group B" },
  { id: "g3", name: "Group C" },
];

const dummyEmployees = [
  { id: "e1", name: "Karyawan 1 (A)" },
  { id: "e2", name: "Karyawan 2 (A)" },
  { id: "e3", name: "Karyawan 3 (B)" },
];

const Dashboard = () => {
  // --- TAMBAHAN STATE UNTUK FILTER ---
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const handleFilterSubmit = () => {
    // Nanti, logika fetch data berdasarkan filter ada di sini
    console.log({
      start: filterDateStart,
      end: filterDateEnd,
      group: filterGroup,
      employee: filterEmployee,
    });
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* --- FILTER GLOBAL (DIPERBARUI) --- */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Filter Tanggal Awal */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-start" className="text-xs text-muted-foreground">Mulai Tgl</label>
                <Input 
                  id="date-start" 
                  type="date" 
                  className="w-full" 
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                />
              </div>
              {/* Filter Tanggal Akhir */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="date-end" className="text-xs text-muted-foreground">Sampai Tgl</label>
                <Input 
                  id="date-end" 
                  type="date" 
                  className="w-full"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                />
              </div>
              {/* Filter Group */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="filter-group" className="text-xs text-muted-foreground">Group</label>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger id="filter-group" className="w-full">
                    <SelectValue placeholder="Semua Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {dummyGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Filter Karyawan */}
              <div className="flex-1 min-w-[150px] space-y-1">
                <label htmlFor="filter-employee" className="text-xs text-muted-foreground">Karyawan</label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger id="filter-employee" className="w-full">
                    <SelectValue placeholder="Semua Karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {dummyEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Tombol Filter */}
              <Button onClick={handleFilterSubmit} className="gap-2">
                <Search className="h-4 w-4" /> Terapkan
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 6 Metric Cards (Tetap Sama) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Total Komisi Kotor"
            value="Rp 125.5M"
            change={12.5}
            trend="up"
            icon={DollarSign}
          />
          <MetricCard
            title="Total Komisi Bersih"
            value="Rp 100.2M"
            change={8.2}
            trend="up"
            icon={Wallet}
          />
          <MetricCard
            title="Total Komisi Cair"
            value="Rp 85.8M"
            change={15.3}
            trend="up"
            icon={TrendingUp}
          />
          <MetricCard
            title="Total Pengeluaran"
            value="Rp 45.5M"
            change={5.2}
            trend="down"
            icon={TrendingDown}
          />
          <MetricCard
            title="Total Karyawan"
            value="24"
            icon={Users}
          />
          <MetricCard
            title="Total Group"
            value="5"
            icon={Package}
          />
        </div>

        {/* --- Charts Row 1 (DIPERBARUI, 3 KOLOM) --- */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {/* Chart Tren Omset (Diperkecil) */}
          <Card className="lg:col-span-2"> {/* Mengambil 2/3 tempat */}
            <CardHeader>
              <CardTitle>Tren Omset & Komisi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Omset"
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Komisi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart Breakdown Komisi (Diperkecil) */}
          <Card> {/* Mengambil 1/3 tempat */}
            <CardHeader>
              <CardTitle>Breakdown Komisi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={commissionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80} // Diperkecil
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commissionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(value)
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* --- Charts Row 2 (DIPERBARUI) --- */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Chart Performa Group (Tetap Sama) */}
          <Card>
            <CardHeader>
              <CardTitle>Performa Group (Top 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(value)
                    }
                  />
                  <Bar dataKey="omset" fill="hsl(var(--chart-1))" radius={[0, 8, 8, 0]} name="Omset" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* --- CHART PERFORMA AKUN (BARU) --- */}
          <Card>
            <CardHeader>
              <CardTitle>Performa Akun</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) =>
                      `${name} (${value})`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {accountData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => `${value} Akun`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ranking Table (Tetap Sama) */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Karyawan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div
                  key={rank}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Karyawan {rank}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${100 - rank * 10}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {100 - rank * 10}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      Rp {(50 - rank * 5).toFixed(1)}M
                    </p>
                    <p className="text-xs text-muted-foreground">Omset</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;